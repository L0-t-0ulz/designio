import { describe, it, expect } from 'vitest'
import { circularScore, fibreGroup, garmentFootprint, longevityCare, materialPassport } from '../src/renderer/export/sustainability'
import { getFabric, FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'

describe('sustainability suite', () => {
  it('classifies every library fabric into a fibre group', () => {
    for (const f of FABRIC_LIBRARY) {
      expect(['cotton', 'wool', 'silk', 'synthetic', 'leather']).toContain(fibreGroup(f))
    }
    expect(fibreGroup(getFabric('denim'))).toBe('cotton')
    expect(fibreGroup(getFabric('wool-flannel'))).toBe('wool')
    expect(fibreGroup(getFabric('silk-charmeuse'))).toBe('silk')
    expect(fibreGroup(getFabric('spandex'))).toBe('synthetic')
    expect(fibreGroup(getFabric('leather'))).toBe('leather')
  })

  it('footprint scales with fabric mass; cotton is thirsty, synthetics are fossil-heavy per kg', () => {
    const denim = garmentFootprint(getFabric('denim'), 1.5) // 1.5 m² of ~400 gsm
    expect(denim.massKg).toBeCloseTo((getFabric('denim').gsm * 1.5) / 1000, 2)
    expect(denim.waterL).toBeGreaterThan(1000) // cotton water intensity
    const doubled = garmentFootprint(getFabric('denim'), 3)
    expect(doubled.waterL).toBeCloseTo(denim.waterL * 2, -1)
    // per-kg character: cotton uses far more water; synthetic more CO₂ per kg than cotton
    const spdx = garmentFootprint(getFabric('spandex'), 1.5)
    expect(denim.waterL / denim.massKg).toBeGreaterThan((spdx.waterL / spdx.massKg) * 10)
    expect(spdx.co2Kg / spdx.massKg).toBeGreaterThan(denim.co2Kg / denim.massKg)
    // deadstock: the production footprint is sunk — only ~10% counted
    const dead = garmentFootprint(getFabric('denim'), 1.5, { deadstock: true })
    expect(dead.waterL).toBeLessThan(denim.waterL * 0.15)
    expect(garmentFootprint(getFabric('denim'), 0).waterL).toBe(0)
  })

  it('circular score: mono-material recyclable tops; hardware + linings subtract; bounded', () => {
    const best = circularScore({ monoMaterial: true, recyclableGroup: true, recycled: true, deadstock: true, hasClosure: false, lined: false })
    expect(best).toBe(100)
    const worst = circularScore({ monoMaterial: false, recyclableGroup: false, recycled: false, deadstock: false, hasClosure: true, lined: true })
    expect(worst).toBe(0) // 20 − 10 − 15 floors at 0
    const plain = circularScore({ monoMaterial: true, recyclableGroup: true, recycled: false, deadstock: false, hasClosure: false, lined: false })
    const zipped = circularScore({ monoMaterial: true, recyclableGroup: true, recycled: false, deadstock: false, hasClosure: true, lined: false })
    expect(zipped).toBeLessThan(plain)
  })

  it('passport carries the flags + recyclability; longevity guidance is fibre-specific', () => {
    const p = materialPassport(getFabric('denim'), { monoMaterial: true, recycled: true })
    expect(p.recyclable).toBe(true)
    expect(p.recycled).toBe(true)
    expect(p.deadstock).toBe(false)
    expect(p.fibre.length).toBeGreaterThan(0)
    const cotton = longevityCare(getFabric('denim'))
    const wool = longevityCare(getFabric('wool-flannel'))
    expect(cotton.length).toBeGreaterThanOrEqual(4)
    expect(cotton.join()).not.toBe(wool.join()) // fibre-specific tips
    expect(wool.join()).toContain('pill')
  })
})
