import { describe, it, expect } from 'vitest'
import { costRollup, estimateLabourMinutes } from '../src/renderer/export/cost'
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
