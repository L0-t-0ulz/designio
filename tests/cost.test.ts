import { describe, it, expect } from 'vitest'
import { costRollup, estimateLabourMinutes, priceFromCost } from '../src/renderer/export/cost'
import { estimatedFabricPrice, getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('estimateLabourMinutes', () => {
  it('rises with seam length off a non-zero base', () => {
    expect(estimateLabourMinutes(0)).toBeGreaterThan(0) // setup time
    expect(estimateLabourMinutes(400)).toBeGreaterThan(estimateLabourMinutes(100))
  })
})

describe('costRollup', () => {
  it('sums fabric + thread + trims + labour + overhead into the landed total', () => {
    const c = costRollup({ fabricM: 2, pricePerM: 10, threadM: 50, labourMin: 30, labourRate: 18, trims: [{ name: 'zip', qty: 1, unitCost: 1.5 }] })
    expect(c.fabric).toBeCloseTo(20, 2)
    expect(c.thread).toBeCloseTo(50 * 0.004, 4)
    expect(c.trims).toBeCloseTo(1.5, 2)
    expect(c.labour).toBeCloseTo((30 / 60) * 18, 2)
    const sub = c.fabric + c.thread + c.trims + c.labour
    expect(c.overhead).toBeCloseTo(sub * 0.15, 2)
    expect(c.total).toBeCloseTo(sub + c.overhead, 2)
    expect(c.currency).toBe('USD')
  })

  it('honours a custom overhead and clamps negative inputs to 0', () => {
    expect(costRollup({ fabricM: 1, pricePerM: 10, threadM: 0, labourMin: 0, labourRate: 0, overheadPct: 0 }).total).toBeCloseTo(10, 2)
    const neg = costRollup({ fabricM: -5, pricePerM: 10, threadM: -1, labourMin: -1, labourRate: 20 })
    expect(neg.fabric).toBe(0)
    expect(neg.total).toBeGreaterThanOrEqual(0)
  })
})

describe('priceFromCost (pricing calculator)', () => {
  it('prices wholesale to hit the target margin, retail off the keystone multiple', () => {
    const p = priceFromCost({ cost: 10, marginPct: 0.5, retailMultiple: 2.2 })
    expect(p.wholesale).toBeCloseTo(20, 2) // 10 / (1 − 0.5)
    expect(p.retail).toBeCloseTo(44, 2) // 20 × 2.2
    expect(p.marginUsd).toBeCloseTo(10, 2)
    expect(p.marginPct).toBeCloseTo(0.5, 3) // realised margin matches the target
    expect(p.markupPct).toBeCloseTo(1.0, 3) // 100 % markup over cost
  })

  it('defaults to a 50 % margin + 2.2× retail', () => {
    const p = priceFromCost({ cost: 25 })
    expect(p.wholesale).toBeCloseTo(50, 2)
    expect(p.retail).toBeCloseTo(110, 2)
  })

  it('a higher margin raises the wholesale + realised margin', () => {
    const lo = priceFromCost({ cost: 10, marginPct: 0.4 })
    const hi = priceFromCost({ cost: 10, marginPct: 0.6 })
    expect(hi.wholesale).toBeGreaterThan(lo.wholesale)
    expect(hi.marginPct).toBeGreaterThan(lo.marginPct)
  })

  it('clamps the margin below 100 % and the retail multiple to ≥ 1', () => {
    const p = priceFromCost({ cost: 10, marginPct: 1.5, retailMultiple: 0.2 })
    expect(p.wholesale).toBeCloseTo(200, 2) // margin clamped to 0.95 → 10 / 0.05
    expect(p.retail).toBeGreaterThanOrEqual(p.wholesale) // multiple clamped to ≥ 1
  })

  it('handles a zero cost without dividing by zero', () => {
    const p = priceFromCost({ cost: 0 })
    expect(p.wholesale).toBe(0)
    expect(p.retail).toBe(0)
    expect(p.markupPct).toBe(0)
  })
})

describe('estimatedFabricPrice', () => {
  it('prices silk above wovens and a heavier weave above a lighter one', () => {
    expect(estimatedFabricPrice(getFabric('silk-charmeuse'))).toBeGreaterThan(estimatedFabricPrice(getFabric('cotton-poplin')))
    expect(estimatedFabricPrice(getFabric('denim'))).toBeGreaterThan(estimatedFabricPrice(getFabric('oxford'))) // denim 380 gsm > oxford 150
  })

  it('is a positive number for every library fabric', () => {
    for (const f of [getFabric('velvet'), getFabric('chiffon'), getFabric('jersey-knit'), getFabric('leather')]) {
      expect(estimatedFabricPrice(f)).toBeGreaterThan(0)
    }
  })
})
