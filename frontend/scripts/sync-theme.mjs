#!/usr/bin/env node
// sync-theme.mjs — extract the live terminal palette and emit theme.generated.css
//
// Sources (first match wins per key):
//   1. terminal config (kitty | alacritty | ghostty | foot | wezterm)
//   2. ~/.cache/wal/colors.json           (pywal, dynamic theme source)
//   3. built-in fallback palette          (Dracula)
//
// Output: frontend/src/styles/theme.generated.css
// Run:    pnpm theme:sync   (also runs automatically before dev/build)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HOME = homedir()
const OUT = resolve(__dirname, '../src/styles/theme.generated.css')

// ---------------------------------------------------------------------------
// Fallback palette (Dracula) — used only for keys no source provides.
// ---------------------------------------------------------------------------
const FALLBACK = {
  source: 'fallback (Dracula)',
  bg: '#282a36',
  fg: '#f8f8f2',
  cursor: '#f8f8f2',
  colors: [
    '#21222c', '#ff5555', '#50fa7b', '#f1fa8c',
    '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2',
    '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5',
    '#d6acff', '#ff92df', '#a4ffff', '#ffffff',
  ],
  fontFamily: 'monospace',
  fontSize: 13,
}

// ---------------------------------------------------------------------------
// tiny parsers
// ---------------------------------------------------------------------------
const HEX = /^#?([0-9a-fA-F]{6})$/
function normHex(v) {
  if (typeof v !== 'string') return null
  const m = HEX.exec(v.trim())
  return m ? `#${m[1].toLowerCase()}` : null
}

function parseKeyVals(text) {
  const out = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue // full-line comments only (values contain '#')
    const eq = line.indexOf('=')
    const sp = line.search(/\s/)
    let key, val
    if (eq !== -1 && (sp === -1 || eq < sp)) {
      key = line.slice(0, eq).trim()
      val = line.slice(eq + 1).trim()
    } else if (sp !== -1) {
      key = line.slice(0, sp).trim()
      val = line.slice(sp + 1).trim()
    } else {
      key = line.trim()
      val = ''
    }
    out[key] = val.replace(/^["']|["']$/g, '')
  }
  return out
}

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : null
}

// ---- kitty (_ config supports `include`) ----------------------------------
function parseKitty(dir) {
  const main = join(dir, 'kitty.conf')
  if (!existsSync(main)) return null
  let text = readFileSync(main, 'utf8')
  const includes = [...text.matchAll(/^\s*include\s+(.+?)\s*$/gm)].map((m) => m[1].trim())
  for (const inc of includes) {
    const p = inc.startsWith('/') ? inc : join(dir, inc)
    const body = readIfExists(p)
    if (body) text += '\n' + body
  }
  const kv = parseKeyVals(text)
  const colors = []
  for (let i = 0; i < 16; i++) colors.push(normHex(kv[`color${i}`]))
  return {
    terminal: 'kitty',
    bg: normHex(kv.background),
    fg: normHex(kv.foreground),
    cursor: normHex(kv.cursor),
    colors,
    fontFamily: kv.font_family || null,
    fontSize: kv.font_size ? Number.parseFloat(kv.font_size) : null,
  }
}

// ---- ghostty (config, key = value, palette = N=#hex) ----------------------
function parseGhostty(dir) {
  const p = [join(dir, 'config'), join(dir, 'config.ghostty')].find(existsSync)
  if (!p) return null
  const kv = parseKeyVals(readFileSync(p, 'utf8'))
  const colors = new Array(16).fill(null)
  for (const [k, v] of Object.entries(kv)) {
    if (k === 'palette') {
      const idx = Number.parseInt(v.split('=')[0], 10)
      const hex = normHex(v.split('=')[1])
      if (idx >= 0 && idx < 16) colors[idx] = hex
    }
  }
  return {
    terminal: 'ghostty',
    bg: normHex(kv.background),
    fg: normHex(kv.foreground),
    cursor: normHex(kv['cursor-color']),
    colors,
    fontFamily: kv['font-family'] || null,
    fontSize: kv['font-size'] ? Number.parseFloat(kv['font-size']) : null,
  }
}

// ---- foot (INI, [colors]/[main]) ------------------------------------------
function parseFoot(dir) {
  const p = join(dir, 'foot.ini')
  if (!existsSync(p)) return null
  const text = readFileSync(p, 'utf8')
  const section = (name) => {
    const m = new RegExp(`\\[${name}\\]([\\s\\S]*?)(\\n\\[|$)`).exec(text)
    return m ? m[1] : ''
  }
  const colorsSec = parseKeyVals(section('colors'))
  const mainSec = parseKeyVals(section('main'))
  const colors = new Array(16).fill(null)
  for (let i = 0; i < 16; i++) {
    colors[i] =
      normHex(colorsSec[`regular${i}`]) ||
      normHex(colorsSec[`bright${i}`]) ||
      normHex(colorsSec[`${i}`])
  }
  return {
    terminal: 'foot',
    bg: normHex(colorsSec.background),
    fg: normHex(colorsSec.foreground),
    cursor: normHex(colorsSec.cursor),
    colors,
    fontFamily: mainSec['font'] ? mainSec['font'].split(':')[0] : null,
    fontSize: mainSec['font'] ? Number.parseFloat(mainSec['font'].split(':')[1]) : null,
  }
}

// ---- alacritty (TOML or legacy YAML) --------------------------------------
function parseAlacritty(dir) {
  const p = [
    join(dir, 'alacritty.toml'),
    join(dir, 'alacritty.yml'),
    join(dir, 'alacritty.yaml'),
  ].find(existsSync)
  if (!p) return null
  const text = readFileSync(p, 'utf8')
  const colors = new Array(16).fill(null)
  const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white']
  for (let i = 0; i < 8; i++) {
    const re = new RegExp(`${names[i]}\\s*=\\s*["']?(#[0-9a-fA-F]{6})`, 'i')
    const rb = new RegExp(`bright\\s*=\\s*\\{[^}]*?${names[i]}\\s*=\\s*["']?(#[0-9a-fA-F]{6})`, 'i')
    const m1 = re.exec(text)
    const m2 = rb.exec(text)
    colors[i] = m1 ? normHex(m1[1]) : null
    colors[i + 8] = m2 ? normHex(m2[1]) : null
  }
  const primary = (key) => {
    const m = new RegExp(`${key}\\s*=\\s*["']?(#[0-9a-fA-F]{6})`, 'i').exec(text)
    return m ? normHex(m[1]) : null
  }
  const font = /\[font\][^[]*?size\s*=\s*([\d.]+)/i.exec(text)
  const family = /\[font\][^[]*?family\s*=\s*["']([^"']+)/i.exec(text)
  return {
    terminal: 'alacritty',
    bg: primary('background'),
    fg: primary('foreground'),
    cursor: primary('cursor'),
    colors,
    fontFamily: family ? family[1] : null,
    fontSize: font ? Number.parseFloat(font[1]) : null,
  }
}

// ---- wezterm (lua, best effort) -------------------------------------------
function parseWezterm(dir) {
  const p = join(dir, 'wezterm.lua')
  if (!existsSync(p)) return null
  const text = readFileSync(p, 'utf8')
  const first = (re) => {
    const m = re.exec(text)
    return m ? m[1] : null
  }
  return {
    terminal: 'wezterm',
    bg: normHex(first(/background\s*=\s*['"](#?[0-9a-fA-F]{6})/i)),
    fg: normHex(first(/foreground\s*=\s*['"](#?[0-9a-fA-F]{6})/i)),
    cursor: normHex(first(/cursor_bg\s*=\s*['"](#?[0-9a-fA-F]{6})/i)),
    colors: new Array(16).fill(null),
    fontFamily: first(/font\s*=\s*wezterm\.font\(['"]([^'"]+)/i),
    fontSize: null,
  }
}

function detectTerminal() {
  const candidates = [
    ['kitty', join(HOME, '.config/kitty'), parseKitty],
    ['alacritty', join(HOME, '.config/alacritty'), parseAlacritty],
    ['ghostty', join(HOME, '.config/ghostty'), parseGhostty],
    ['foot', join(HOME, '.config/foot'), parseFoot],
    ['wezterm', join(HOME, '.config/wezterm'), parseWezterm],
  ]
  for (const [, dir, parser] of candidates) {
    if (existsSync(dir)) {
      const parsed = parser(dir)
      if (parsed) return parsed
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// pywal
// ---------------------------------------------------------------------------
function loadPywal() {
  const p = join(HOME, '.cache/wal/colors.json')
  if (!existsSync(p)) return null
  try {
    const data = JSON.parse(readFileSync(p, 'utf8'))
    const colors = []
    for (let i = 0; i < 16; i++) colors.push(normHex(data.colors?.[`color${i}`]))
    return {
      source: 'pywal (~/.cache/wal/colors.json)',
      bg: normHex(data.special?.background),
      fg: normHex(data.special?.foreground),
      cursor: normHex(data.special?.cursor),
      colors,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// color math
// ---------------------------------------------------------------------------
function hexToRgb(hex) {
  const n = Number.parseInt(hex.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return { h, s, l }
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const f = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function readableOn(bg) {
  return luminance(bg) > 0.42 ? '#0b0b0b' : '#f5f5f3'
}

// pick the most chromatic color in c1..c6 → the natural accent
function pickAccent(colors) {
  let best = null, bestScore = -1
  for (let i = 1; i <= 6; i++) {
    const c = colors[i]
    if (!c) continue
    const { s, l } = rgbToHsl(hexToRgb(c))
    const score = s * (1 - Math.abs(l - 0.5) * 0.6)
    if (score > bestScore) { bestScore = score; best = c }
  }
  return best || colors[1] || FALLBACK.colors[1]
}

// ---------------------------------------------------------------------------
// merge sources
// ---------------------------------------------------------------------------
function build() {
  const term = detectTerminal()
  const wal = loadPywal()
  const fallback = FALLBACK

  const pick = (termVal, walVal, fbVal) => termVal || walVal || fbVal

  const bg = pick(term?.bg, wal?.bg, fallback.bg)
  const fg = pick(term?.fg, wal?.fg, fallback.fg)
  const cursor = pick(term?.cursor, wal?.cursor, fallback.cursor)
  const colors = []
  for (let i = 0; i < 16; i++) {
    colors.push(pick(term?.colors?.[i], wal?.colors?.[i], fallback.colors[i]))
  }
  const fontFamily = term?.fontFamily || fallback.fontFamily
  const fontSize = term?.fontSize || fallback.fontSize

  const sourceLabel = term
    ? `${term.terminal}${wal ? ' + pywal' : ''}`
    : wal
      ? 'pywal'
      : 'fallback (Dracula)'
  const terminalLabel = term ? term.terminal : 'none'

  return { bg, fg, cursor, colors, fontFamily, fontSize, sourceLabel, terminalLabel, hasWal: !!wal, hasTerm: !!term }
}

// ---------------------------------------------------------------------------
// emit CSS
// ---------------------------------------------------------------------------
function emit(theme) {
  const { bg, fg, cursor, colors, fontFamily, fontSize } = theme
  const accent = pickAccent(colors)
  const { h, s, l } = rgbToHsl(hexToRgb(accent))

  // pulse colors — hue-rotated off the accent so the three types are legible
  const pulseDispatch = accent
  const pulseResult = hslToHex(h + 155, clamp(s, 0.6, 0.9), clamp(l + 10, 0.55, 0.7))
  const pulseIdle = hslToHex(h + 220, clamp(s, 0.35, 0.6), 0.6)
  const statusOnline = hslToHex(h + 130, 0.6, 0.56)
  const statusError = hslToHex(2, 0.62, 0.58)

  const accentFg = readableOn(accent)
  const card = mix(bg, fg, 0.04)
  const muted = mix(bg, fg, 0.08)
  const border = mix(bg, fg, 0.16)
  const mutedFg = mix(fg, bg, 0.42)
  const primaryFg = readableOn(colors[4] || accent)

  const lines = []
  lines.push('/* ==========================================================================')
  lines.push('   AUTO-GENERATED by frontend/scripts/sync-theme.mjs — DO NOT EDIT MANUALLY.')
  lines.push('   Re-run with: pnpm theme:sync   (runs automatically before dev/build)')
  lines.push('')
  lines.push(`   terminal : ${theme.terminalLabel}`)
  lines.push(`   sources  : ${theme.sourceLabel}`)
  lines.push(`   generated: ${new Date().toISOString()}`)
  lines.push('   ========================================================================== */')
  lines.push('')
  lines.push(':root {')
  lines.push('  /* --- terminal base -------------------------------------------------- */')
  lines.push(`  --bg: ${bg};`)
  lines.push(`  --fg: ${fg};`)
  lines.push(`  --cursor: ${cursor};`)
  lines.push('')
  lines.push('  /* --- ANSI ramp ----------------------------------------------------- */')
  for (let i = 0; i < 16; i++) lines.push(`  --c${i}: ${colors[i]};`)
  lines.push('')
  lines.push('  /* --- typography ---------------------------------------------------- */')
  lines.push(`  --font-mono: "${fontFamily}", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;`)
  lines.push(`  --font-size-base: ${fontSize}px;`)
  lines.push('  --radius: 0.5rem;')
  lines.push('')
  lines.push('  /* --- accent + derived HUD palette (hue-rotated from accent) --------- */')
  lines.push(`  --accent: ${accent};`)
  lines.push(`  --accent-foreground: ${accentFg};`)
  lines.push(`  --accent-glow: color-mix(in oklab, ${accent} 60%, transparent);`)
  lines.push(`  --accent-glow-soft: color-mix(in oklab, ${accent} 26%, transparent);`)
  lines.push(`  --pulse-install: ${accent};`)
  lines.push(`  --pulse-dispatch: ${pulseDispatch};`)
  lines.push(`  --pulse-result: ${pulseResult};`)
  lines.push(`  --pulse-idle: ${pulseIdle};`)
  lines.push(`  --status-online: ${statusOnline};`)
  lines.push(`  --status-busy: ${accent};`)
  lines.push(`  --status-idle: ${colors[4]};`)
  lines.push(`  --status-error: ${statusError};`)
  lines.push('')
  lines.push('  /* --- semantic surfaces --------------------------------------------- */')
  lines.push(`  --background: ${bg};`)
  lines.push(`  --foreground: ${fg};`)
  lines.push(`  --card: ${card};`)
  lines.push(`  --card-foreground: ${fg};`)
  lines.push(`  --popover: ${mix(bg, fg, 0.06)};`)
  lines.push(`  --popover-foreground: ${fg};`)
  lines.push(`  --primary: ${accent};`)
  lines.push(`  --primary-foreground: ${accentFg};`)
  lines.push(`  --secondary: ${muted};`)
  lines.push(`  --secondary-foreground: ${fg};`)
  lines.push(`  --muted: ${muted};`)
  lines.push(`  --muted-foreground: ${mutedFg};`)
  lines.push(`  --destructive: ${statusError};`)
  lines.push(`  --destructive-foreground: ${readableOn(statusError)};`)
  lines.push(`  --border: ${border};`)
  lines.push(`  --input: ${border};`)
  lines.push(`  --ring: ${accent};`)
  lines.push(`  --primary-fg-legacy: ${primaryFg};`)
  lines.push(`  --grid: color-mix(in oklab, ${fg} 7%, transparent);`)
  lines.push(`  --scanline: color-mix(in oklab, ${fg} 5%, transparent);`)
  lines.push(`  --glass: color-mix(in oklab, ${card} 72%, transparent);`)
  lines.push('')
  lines.push('  /* --- rgb triples (for rgba() glow math) ---------------------------- */')
  const ar = hexToRgb(accent)
  lines.push(`  --accent-rgb: ${ar.r} ${ar.g} ${ar.b};`)
  lines.push('}')
  lines.push('')
  return lines.join('\n')
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b)
  return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t })
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
function report(theme) {
  const { bg, fg, cursor, colors, fontFamily, fontSize } = theme
  const accent = pickAccent(colors)
  const sw = (hex) => `\x1b[48;2;${hexToRgb(hex).r};${hexToRgb(hex).g};${hexToRgb(hex).b}m   \x1b[0m`
  console.log('\n  \x1b[1mTerminal palette extracted\x1b[0m')
  console.log(`  terminal : ${theme.terminalLabel}`)
  console.log(`  sources  : ${theme.sourceLabel}`)
  console.log(`  font     : ${fontFamily} @ ${fontSize}px`)
  console.log('')
  console.log(`  bg      ${bg} ${sw(bg)}    fg      ${fg} ${sw(fg)}`)
  console.log(`  cursor  ${cursor} ${sw(cursor)}    accent  ${accent} ${sw(accent)}`)
  console.log('')
  const row = (start) =>
    '  ' + Array.from({ length: 8 }, (_, j) => {
      const i = start + j
      return `c${String(i).padStart(2)} ${sw(colors[i])}`
    }).join('  ')
  console.log(row(0))
  console.log(row(8))
  console.log('')
}

// ---------------------------------------------------------------------------
function main() {
  const theme = build()
  const css = emit(theme)
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, css, 'utf8')
  report(theme)
  console.log(`  \x1b[32m✓\x1b[0m wrote ${OUT.replace(HOME, '~')}\n`)
}

main()
