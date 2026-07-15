import { describe, it, expect } from 'vitest'
import { WRAP_PRESETS, WRAP_PRESET_NAMES, getWrapPreset, applyWrapPreset, type WrapTarget } from '../src/renderer/avatar/wrapPresets'

describe('pre-tied wrap presets', () => {
  it('every preset has a unique name + a label', () => {
    expect(new Set(WRAP_PRESET_NAMES).size).toBe(WRAP_PRESETS.length)
    for (const p of WRAP_PRESETS) expect(p.label.length).toBeGreaterThan(0)
  })

  it('applying a preset sets exactly one worn-state and clears the others', () => {
    const dirty: WrapTarget = { scarfKnot: true, scarfDouble: true, scarfBlanket: true, scarfPin: true, pinAt: 0.3, scarfWidth: 1.4 }
    applyWrapPreset(dirty, getWrapPreset('parisian')!)
    expect(dirty.scarfKnot).toBe(true)
    expect(dirty.scarfDouble).toBeUndefined()
    expect(dirty.scarfBlanket).toBeUndefined()
    expect(dirty.scarfPin).toBeUndefined()
    // only one of the three exclusive wraps is ever set
    for (const p of WRAP_PRESETS) {
      const t: WrapTarget = {}
      applyWrapPreset(t, p)
      const on = [t.scarfKnot, t.scarfDouble, t.scarfBlanket].filter(Boolean).length
      expect(on).toBeLessThanOrEqual(1)
    }
  })

  it('draped clears everything back to an open scarf', () => {
    const t: WrapTarget = { scarfBlanket: true, scarfWidth: 1.6 }
    applyWrapPreset(t, getWrapPreset('draped')!)
    expect(t.scarfKnot ?? t.scarfDouble ?? t.scarfBlanket ?? t.scarfPin).toBeUndefined()
    expect(t.scarfWidth).toBeUndefined()
  })

  it('the blanket ruana is wider; the ascot pins near the top', () => {
    const b: WrapTarget = {}
    applyWrapPreset(b, getWrapPreset('blanket')!)
    expect(b.scarfBlanket).toBe(true)
    expect(b.scarfWidth).toBeGreaterThan(1.4)

    const a: WrapTarget = {}
    applyWrapPreset(a, getWrapPreset('ascot')!)
    expect(a.scarfPin).toBe(true)
    expect(a.pinAt).toBeLessThan(0.2)
  })

  it('an unknown preset name resolves to undefined', () => {
    expect(getWrapPreset('nope')).toBeUndefined()
  })
})
