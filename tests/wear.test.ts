import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { wearValue, wearTone, WEAR_KINDS } from '../src/renderer/fabric/wear'
import { defaultConfig } from '../src/renderer/start/design'
import { hasArt } from '../src/renderer/start/design'
import { docFromConfig, defaultLayer, cloneLayer, serializeDoc, parseDoc } from '../src/renderer/studio/document'

const sampleStats = (kind: (typeof WEAR_KINDS)[number]): { min: number; max: number; mean: number } => {
  let min = 1
  let max = 0
  let sum = 0
  let n = 0
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const w = wearValue(kind, x / 32, y / 32)
      min = Math.min(min, w)
      max = Math.max(max, w)
      sum += w
      n++
    }
  return { min, max, mean: sum / n }
}

describe('distressed / washed / faded wear finish', () => {
  it('the wear field stays within [0,1] for every kind and is deterministic', () => {
    for (const k of WEAR_KINDS) {
      const s = sampleStats(k)
      expect(s.min).toBeGreaterThanOrEqual(0)
      expect(s.max).toBeLessThanOrEqual(1)
      // deterministic — same (u,v) → same value (no Math.random)
      expect(wearValue(k, 0.37, 0.61)).toBe(wearValue(k, 0.37, 0.61))
    }
  })

  it('faded is a broad gentle wash; distressed is sparse sharp streaks', () => {
    const faded = sampleStats('faded')
    const distressed = sampleStats('distressed')
    expect(faded.min).toBeGreaterThan(0) // faded lifts the whole surface a little
    expect(distressed.min).toBe(0) // distressed leaves most of the cloth untouched
    expect(faded.mean).toBeGreaterThan(distressed.mean) // faded wears more overall
  })

  it('adaptive wear concentrates at the hem + side edges, sparing the centre top', () => {
    const meanRow = (v: number): number => {
      let s = 0
      for (let x = 0; x < 32; x++) s += wearValue('adaptive', x / 32, v)
      return s / 32
    }
    expect(meanRow(0.95)).toBeGreaterThan(meanRow(0.1)) // hem wears far more than the top
    // side edges wear more than the centre at the same height
    expect(wearValue('adaptive', 0.98, 0.8)).toBeGreaterThan(wearValue('adaptive', 0.5, 0.8))
    // the calm centre-top is nearly untouched
    expect(wearValue('adaptive', 0.5, 0.05)).toBeLessThan(0.2)
  })

  it('stone-wash is a soft cloudy all-over wash — everywhere but higher-contrast than faded', () => {
    const stone = sampleStats('stone-wash')
    const faded = sampleStats('faded')
    expect(stone.min).toBeGreaterThan(0) // tumbled all over, no untouched cloth
    // more textured than the broad faded — a wider spread between light + heavy wear
    expect(stone.max - stone.min).toBeGreaterThan(faded.max - faded.min)
  })

  it('the worn tone is lighter + less saturated than the base', () => {
    const base = 0x2b3a67 // deep indigo (denim)
    const b = { h: 0, s: 0, l: 0 }
    const t = { h: 0, s: 0, l: 0 }
    new THREE.Color(base).getHSL(b)
    wearTone(base).getHSL(t)
    expect(t.l).toBeGreaterThan(b.l) // lighter
    expect(t.s).toBeLessThan(b.s) // desaturated
  })

  it('a wear finish alone still needs an albedo map', () => {
    expect(hasArt({ prints: [], wear: 'acid-wash' })).toBe(true)
    expect(hasArt({ prints: [] })).toBe(false)
  })

  it('round-trips through save/parse and cloneLayer deep-copies it', () => {
    const c = defaultConfig()
    c.wear = 'distressed'
    expect(parseDoc(serializeDoc(docFromConfig(c))).layers[0].wear).toBe('distressed')

    const base = defaultLayer('pants')
    base.wear = 'faded'
    const copy = cloneLayer(base)
    copy.wear = 'acid-wash'
    expect(base.wear).toBe('faded') // original untouched
  })
})
