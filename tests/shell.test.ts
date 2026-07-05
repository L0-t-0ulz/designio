import { describe, it, expect } from 'vitest'
import { parseLayout, serializeLayout, DEFAULT_LAYOUT } from '../src/renderer/shell/layoutStore'

describe('studio shell layout persistence', () => {
  it('round-trips a valid layout', () => {
    const l = { sizes: [60, 40] as [number, number], rightVisible: false }
    expect(parseLayout(serializeLayout(l))).toEqual(l)
  })

  it('falls back to defaults for null / invalid input', () => {
    expect(parseLayout(null)).toEqual(DEFAULT_LAYOUT)
    expect(parseLayout('not json')).toEqual(DEFAULT_LAYOUT)
    // out-of-range sizes are rejected → default sizes
    expect(parseLayout('{"sizes":[999,1],"rightVisible":true}').sizes).toEqual(DEFAULT_LAYOUT.sizes)
  })

  it('defaults rightVisible to true when omitted', () => {
    expect(parseLayout('{"sizes":[70,30]}').rightVisible).toBe(true)
    expect(parseLayout('{"sizes":[70,30]}').sizes).toEqual([70, 30])
  })
})
