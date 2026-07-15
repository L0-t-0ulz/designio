import { describe, it, expect } from 'vitest'
import { thermochromicColor, thermoDefaultWarm } from '../src/renderer/fabric/thermochromic'
import {
  captureColorway,
  applyColorway,
  defaultLayer,
  serializeDoc,
  parseDoc,
  docFromConfig
} from '../src/renderer/studio/document'
import { defaultConfig } from '../src/renderer/start/design'

describe('thermochromic — heat-reactive colour shift', () => {
  it('blends cold → warm by temperature, clamped', () => {
    const cold = 0x2040c0
    const warm = 0xffffff
    expect(thermochromicColor(cold, warm, 0)).toBe(cold) // cool = the base colour
    expect(thermochromicColor(cold, warm, 1)).toBe(warm) // fully warm = the activated colour
    expect(thermochromicColor(cold, warm, -1)).toBe(cold) // clamps below 0
    expect(thermochromicColor(cold, warm, 2)).toBe(warm) // clamps above 1
    // halfway is between the two per channel
    const mid = thermochromicColor(0x000000, 0xffffff, 0.5)
    const g = (mid >> 8) & 255
    expect(g).toBeGreaterThan(120)
    expect(g).toBeLessThan(136)
  })

  it('the default warm is a pale fade of the base (leuco dye washes out with heat)', () => {
    const cold = 0x803010
    const warm = thermoDefaultWarm(cold)
    const lum = (c: number): number => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255)
    expect(lum(warm)).toBeGreaterThan(lum(cold)) // warmer = paler
    expect(warm).not.toBe(0xffffff) // not fully white — a hint of the base survives
  })
})

describe('thermochromic — persistence', () => {
  it('a colorway captures + re-applies the thermochromic fields', () => {
    const l = defaultLayer('top')
    l.thermo = true
    l.thermoWarm = 0x00ff88
    l.thermoTemp = 0.6
    const cw = captureColorway(l, 'Warm')
    expect(cw.thermo).toBe(true)
    expect(cw.thermoWarm).toBe(0x00ff88)
    expect(cw.thermoTemp).toBe(0.6)
    const l2 = defaultLayer('top')
    applyColorway(l2, cw)
    expect(l2.thermo).toBe(true)
    expect(l2.thermoTemp).toBe(0.6)
  })

  it('survives a .dio save/open round-trip', () => {
    const doc = docFromConfig(defaultConfig())
    doc.layers[0].thermo = true
    doc.layers[0].thermoTemp = 0.9
    const round = parseDoc(serializeDoc(doc))
    expect(round.layers[0].thermo).toBe(true)
    expect(round.layers[0].thermoTemp).toBe(0.9)
  })

  it('defaults off', () => {
    expect(defaultLayer('top').thermo).toBeUndefined()
  })
})
