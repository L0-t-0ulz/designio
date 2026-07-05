import { describe, it, expect } from 'vitest'
import { parseLayout, serializeLayout, DEFAULT_LAYOUT } from '../src/renderer/shell/layoutStore'

describe('studio shell layout persistence', () => {
  it('round-trips a valid 3-column layout', () => {
    const l = { sizes: [20, 55, 25] as [number, number, number], leftVisible: false, rightVisible: true }
    expect(parseLayout(serializeLayout(l))).toEqual(l)
  })

  it('falls back to defaults for null / invalid input', () => {
    expect(parseLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(parseLayout('not json')).toEqual(DEFAULT_LAYOUT)
    // wrong-length / out-of-range sizes are rejected → default sizes
    expect(parseLayout('{"sizes":[60,40]}').sizes).toEqual(DEFAULT_LAYOUT.sizes)
    expect(parseLayout('{"sizes":[999,1,1]}').sizes).toEqual(DEFAULT_LAYOUT.sizes)
  })

  it('defaults visibility to true when omitted', () => {
    const l = parseLayout('{"sizes":[18,56,26]}')
    expect(l.leftVisible).toBe(true)
    expect(l.rightVisible).toBe(true)
    expect(l.sizes).toEqual([18, 56, 26])
  })
})
