import { describe, expect, it } from 'vitest'
import { deriveBrightVariants, hexToOklab, lightenOklab } from './sync-theme.mjs'

// The normal half of the Dracula ramp — c0..c7.
const normal = [
  '#21222c', '#ff5555', '#50fa7b', '#f1fa8c',
  '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2',
]

const distinctBright = [
  '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5',
  '#d6acff', '#ff92df', '#a4ffff', '#ffffff',
]

describe('deriveBrightVariants', () => {
  it('brightens bright slots that duplicate their normal counterpart', () => {
    const duplicated = [...normal, ...normal]

    const { colors, duplicates, derived } = deriveBrightVariants(duplicated)

    expect(duplicates).toEqual([
      { slot: 8, twin: 0 }, { slot: 9, twin: 1 }, { slot: 10, twin: 2 },
      { slot: 11, twin: 3 }, { slot: 12, twin: 4 }, { slot: 13, twin: 5 },
      { slot: 14, twin: 6 }, { slot: 15, twin: 7 },
    ])
    expect(derived).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
    for (let i = 8; i < 16; i++) {
      expect(colors[i]).not.toBe(duplicated[i])
      expect(hexToOklab(colors[i]).L).toBeGreaterThan(hexToOklab(duplicated[i]).L)
    }
    // The normal half is never touched.
    expect(colors.slice(0, 8)).toEqual(normal)
  })

  it('catches a bright slot that mirrors a non-corresponding normal slot', () => {
    // The real live palette: c8 mirrors c1 (not c0), c9 mirrors c1 too, and
    // c10..c15 mirror c2..c7.
    const palette = [
      '#0c0c0c', '#ac7363', '#83817f', '#978776',
      '#97928f', '#b4b3b0', '#c5bbb5', '#dddddc',
      '#ac7363', '#ac7363', '#83817f', '#978776',
      '#97928f', '#b4b3b0', '#c5bbb5', '#dddddc',
    ]

    const { colors, duplicates } = deriveBrightVariants(palette)

    expect(duplicates).toEqual([
      { slot: 8, twin: 1 }, { slot: 9, twin: 1 }, { slot: 10, twin: 2 },
      { slot: 11, twin: 3 }, { slot: 12, twin: 4 }, { slot: 13, twin: 5 },
      { slot: 14, twin: 6 }, { slot: 15, twin: 7 },
    ])
    // Every bright slot is now distinct from the whole normal ramp.
    for (let i = 8; i < 16; i++) {
      expect(palette.slice(0, 8)).not.toContain(colors[i])
    }
  })

  it('leaves already-distinct bright values untouched', () => {
    const distinct = [...normal, ...distinctBright]

    const { colors, duplicates, derived } = deriveBrightVariants(distinct)

    expect(duplicates).toEqual([])
    expect(derived).toEqual([])
    expect(colors).toEqual(distinct)
  })

  it('only lightens — hue and chroma are preserved', () => {
    const before = hexToOklab('#6272a4')
    const after = hexToOklab(lightenOklab('#6272a4', 0.12))

    expect(after.L).toBeGreaterThan(before.L)
    expect(after.a).toBeCloseTo(before.a, 2)
    expect(after.b).toBeCloseTo(before.b, 2)
  })
})
