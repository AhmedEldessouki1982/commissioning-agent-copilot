#!/usr/bin/env node
// sync-theme.mjs — extract the live terminal palette and emit theme.generated.css
//
// Sources (first match wins per key):
//   1. terminal config (kitty | alacritty | ghostty | foot | wezterm)
//   2. ~/.cache/wal/colors.json           (pywal, dynamic theme source)
//   3. built-in fallback palette          (Dracula)
//
// Then, after merging:
//   • duplicated bright ANSI slots (c8..c15 === c0..c7, the pywal norm) get a
//     brighter variant in OKLab so the two ramps are actually distinguishable;
//   • the dispatch pulse is hue-shifted off the accent when all three of
//     dispatch / busy-chip / accent would otherwise be the same colour.
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

// OKLab lightness delta applied to duplicated bright ANSI slots (~+12%).
const BRIGHT_OKLAB_DELTA = 0.12
// Hue rotation (degrees) separating the dispatch pulse from the accent.
const DISPATCH_HUE_SHIFT = 15

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

// ---------------------------------------------------------------------------
// OKLab — perceptual lightness, for the bright-ramp derivation
// ---------------------------------------------------------------------------
const srgbToLinear = (v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const linearToSrgb = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055
  return clamp(Math.round(v * 255), 0, 255)
}

export function hexToOklab(hex) {
  const { r, g, b } = hexToRgb(hex)
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function oklabToHex({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return rgbToHex({
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  })
}

/** Raise a colour's OKLab lightness by `delta`, keeping hue and chroma. */
export function lightenOklab(hex, delta) {
  const lab = hexToOklab(hex)
  return oklabToHex({ L: clamp(lab.L + delta, 0, 1), a: lab.a, b: lab.b })
}

/**
 * pywal (and the kitty theme it generates) often emits c8..c15 identical to the
 * normal ramp c0..c7, which makes the bright half useless. Every bright slot
 * that collides with a normal slot gets a brighter variant (+BRIGHT_OKLAB_DELTA
 * in OKLab); the pairing is looked up by value, so a palette whose c8 mirrors c1
 * rather than c0 is still caught. Bright slots already distinct from the whole
 * normal ramp are copied through untouched.
 *
 * Returns `duplicates` as { slot, twin } pairs (for the report) and `derived`
 * as the slots whose value actually changed.
 */
export function deriveBrightVariants(colors) {
  const out = colors.slice()
  const normalRamp = colors.slice(0, 8)
  const duplicates = []
  const derived = []
  for (let i = 8; i < 16; i++) {
    const bright = colors[i]
    if (!bright) continue
    const twin = normalRamp.indexOf(bright)
    if (twin === -1) continue // already distinct from the normal ramp
    duplicates.push({ slot: i, twin })
    const lighter = lightenOklab(bright, BRIGHT_OKLAB_DELTA)
    if (lighter !== bright) {
      out[i] = lighter
      derived.push(i)
    }
  }
  return { colors: out, duplicates, derived }
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
  const merged = []
  for (let i = 0; i < 16; i++) {
    merged.push(pick(term?.colors?.[i], wal?.colors?.[i], fallback.colors[i]))
  }
  const { colors, duplicates, derived } = deriveBrightVariants(merged)
  const fontFamily = term?.fontFamily || fallback.fontFamily
  const fontSize = term?.fontSize || fallback.fontSize

  const sourceLabel = term
    ? `${term.terminal}${wal ? ' + pywal' : ''}`
    : wal
      ? 'pywal'
      : 'fallback (Dracula)'
  const terminalLabel = term ? term.terminal : 'none'

  return {
    bg,
    fg,
    cursor,
    colors,
    fontFamily,
    fontSize,
    sourceLabel,
    terminalLabel,
    hasWal: !!wal,
    hasTerm: !!term,
    duplicateSlots: duplicates,
    derivedSlots: derived,
  }
}

// ---------------------------------------------------------------------------
// emit CSS — also records, per token, whether it came from the palette or was
// synthesized by this script (surfaced by report()).
// ---------------------------------------------------------------------------
function emit(theme) {
  const { bg, fg, cursor, colors, fontFamily, fontSize } = theme
  const accent = pickAccent(colors)
  const { h, s, l } = rgbToHsl(hexToRgb(accent))

  // The accent doubles as the busy-chip and (by default) the dispatch pulse, so
  // shift the dispatch pulse hue when all three would resolve to the same
  // colour. An achromatic accent can't be separated by hue, so lift it instead.
  const statusBusy = accent
  const dispatchShifted = statusBusy === accent
  let pulseDispatch = accent
  if (dispatchShifted) {
    pulseDispatch = hslToHex(h + DISPATCH_HUE_SHIFT, s, l)
    if (pulseDispatch === accent) {
      pulseDispatch = hslToHex(h, clamp(s, 0.35, 0.9), clamp(l + 0.08, 0.2, 0.9))
    }
  }

  // pulse colours — hue-rotated off the accent so the three types are legible
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

  const tokens = []
  const line = (name, value, source) => {
    tokens.push({ name, value, source })
    return `  ${name}: ${value};`
  }
  const pal = (name, value) => line(name, value, 'palette')
  const syn = (name, value) => line(name, value, 'synthesized')

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
  lines.push(pal('--bg', bg))
  lines.push(pal('--fg', fg))
  lines.push(pal('--cursor', cursor))
  lines.push('')
  lines.push('  /* --- ANSI ramp ----------------------------------------------------- */')
  for (let i = 0; i < 16; i++) lines.push(pal(`--c${i}`, colors[i]))
  lines.push('')
  lines.push('  /* --- typography ---------------------------------------------------- */')
  lines.push(pal('--font-mono', `"${fontFamily}", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`))
  lines.push(pal('--font-size-base', `${fontSize}px`))
  lines.push(syn('--radius', '0.5rem'))
  lines.push('')
  lines.push('  /* --- accent + derived HUD palette (hue-rotated from accent) --------- */')
  lines.push(pal('--accent', accent))
  lines.push(syn('--accent-foreground', accentFg))
  lines.push(syn('--accent-glow', `color-mix(in oklab, ${accent} 60%, transparent)`))
  lines.push(syn('--accent-glow-soft', `color-mix(in oklab, ${accent} 26%, transparent)`))
  lines.push(pal('--pulse-install', accent))
  lines.push(dispatchShifted ? syn('--pulse-dispatch', pulseDispatch) : pal('--pulse-dispatch', pulseDispatch))
  lines.push(syn('--pulse-result', pulseResult))
  lines.push(syn('--pulse-idle', pulseIdle))
  lines.push(syn('--status-online', statusOnline))
  lines.push(pal('--status-busy', statusBusy))
  lines.push(pal('--status-idle', colors[4]))
  lines.push(syn('--status-error', statusError))
  lines.push('')
  lines.push('  /* --- semantic surfaces --------------------------------------------- */')
  lines.push(pal('--background', bg))
  lines.push(pal('--foreground', fg))
  lines.push(syn('--card', card))
  lines.push(pal('--card-foreground', fg))
  lines.push(syn('--popover', mix(bg, fg, 0.06)))
  lines.push(pal('--popover-foreground', fg))
  lines.push(pal('--primary', accent))
  lines.push(syn('--primary-foreground', accentFg))
  lines.push(syn('--secondary', muted))
  lines.push(pal('--secondary-foreground', fg))
  lines.push(syn('--muted', muted))
  lines.push(syn('--muted-foreground', mutedFg))
  lines.push(syn('--destructive', statusError))
  lines.push(syn('--destructive-foreground', readableOn(statusError)))
  lines.push(syn('--border', border))
  lines.push(syn('--input', border))
  lines.push(pal('--ring', accent))
  lines.push(syn('--primary-fg-legacy', primaryFg))
  lines.push(syn('--grid', `color-mix(in oklab, ${fg} 7%, transparent)`))
  lines.push(syn('--scanline', `color-mix(in oklab, ${fg} 5%, transparent)`))
  lines.push(syn('--glass', `color-mix(in oklab, ${card} 72%, transparent)`))
  lines.push('')
  lines.push('  /* --- rgb triples (for rgba() glow math) ---------------------------- */')
  const ar = hexToRgb(accent)
  lines.push(pal('--accent-rgb', `${ar.r} ${ar.g} ${ar.b}`))
  lines.push('}')
  lines.push('')
  return { css: lines.join('\n'), tokens, accent, pulseDispatch, dispatchShifted }
}

function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b)
  return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t })
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
function report(theme, emitted) {
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

  // --- which tokens came from the palette, and which we synthesized --------
  const fromPalette = emitted.tokens.filter((t) => t.source === 'palette')
  const synthesized = emitted.tokens.filter((t) => t.source === 'synthesized')
  const wrap = (list) => list.map((t) => t.name).join('  ')
  console.log('  \x1b[1mToken provenance\x1b[0m')
  console.log(`  palette     (${fromPalette.length}) : ${wrap(fromPalette)}`)
  console.log(`  synthesized (${synthesized.length}) : ${wrap(synthesized)}`)
  console.log('')

  // --- duplicated ANSI slots and how they were brightened ------------------
  console.log('  \x1b[1mANSI bright ramp\x1b[0m')
  if (theme.duplicateSlots.length === 0) {
    console.log('  c8–c15 are all distinct from c0–c7 — nothing to derive.')
  } else {
    for (const { slot, twin } of theme.duplicateSlots) {
      const before = colors[twin] // c_twin is never touched and was equal before
      const after = colors[slot]
      const note =
        after === before ? 'already at max lightness' : `+${BRIGHT_OKLAB_DELTA} OKLab`
      console.log(`  c${slot} == c${twin}  ${before} → ${after} ${sw(after)}  (${note})`)
    }
  }
  console.log('')

  // --- dispatch pulse vs accent -------------------------------------------
  if (emitted.dispatchShifted) {
    console.log('  \x1b[1mDispatch pulse\x1b[0m')
    console.log(
      `  dispatch/busy/accent all resolved to ${accent}; dispatch shifted ` +
        `${DISPATCH_HUE_SHIFT}° → ${emitted.pulseDispatch} ${sw(emitted.pulseDispatch)}`,
    )
    console.log('')
  }
}

// ---------------------------------------------------------------------------
function main() {
  const theme = build()
  const emitted = emit(theme)
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, emitted.css, 'utf8')
  report(theme, emitted)
  console.log(`  \x1b[32m✓\x1b[0m wrote ${OUT.replace(HOME, '~')}\n`)
}

// Only run when executed directly (`node scripts/sync-theme.mjs`), so tests can
// import the pure helpers without rewriting the CSS.
const isEntryPoint =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isEntryPoint) main()
