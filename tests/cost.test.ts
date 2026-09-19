import { describe, it, expect } from 'vitest'
import { costRollup, estimateLabourMinutes, priceFromCost, headwearFabricM, headwearTrims } from '../src/renderer/export/cost'
import { estimatedFabricPrice, getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('estimateLabourMinutes', () => {
  it('rises with seam length off a non-zero base', () => {
    expect(estimateLabourMinutes(0)).toBeGreaterThan(0) // setup time
    expect(estimateLabourMinutes(400)).toBeGreaterThan(estimateLabourMinutes(100))
  })
})

describe('headwear cost — small-panel yield', () => {
  it('converts a small panel area to a bolt-width yield with a small-panel waste factor', () => {
    // 0.28 m² at 140 cm bolt = 0.2 m theoretical × 1.6 waste = 0.32 m
    expect(headwearFabricM(0.28)).toBeCloseTo(0.32, 3)
  })

  it('never dips below the per-hat minimum cut, and wastes more than a body garment', () => {
    expect(headwearFabricM(0)).toBeGreaterThanOrEqual(0.15) // minimum cut
    expect(headwearFabricM(-1)).toBeGreaterThanOrEqual(0.15) // clamps negatives
    const area = 0.5
    const bodyYield = area / 1.4 // the body-panel estimate main.ts uses for non-headwear
    expect(headwearFabricM(area)).toBeGreaterThan(bodyYield) // small panels nest worse
  })

  it('is monotonic in the panel area', () => {
    expect(headwearFabricM(0.6)).toBeGreaterThan(headwearFabricM(0.3))
  })
})

describe('headwear cost — trims', () => {
  it('emits only the notions the hat actually has', () => {
    expect(headwearTrims({})).toEqual([])
    const pomOnly = headwearTrims({ pom: true })
    expect(pomOnly).toHaveLength(1)
    expect(pomOnly[0].name).toMatch(/pom/i)
    const all = headwearTrims({ pom: true, sweatband: true, brimWire: true, elastic: true })
    expect(all.map((t) => t.name)).toEqual(['Pom-pom', 'Sweatband', 'Brim wire', 'Elastic band'])
    expect(all.every((t) => t.qty === 1 && t.unitCost > 0)).toBe(true)
  })

  it('feeds costRollup so the notions land in the trims subtotal', () => {
    const trims = headwearTrims({ pom: true, sweatband: true })
    const c = costRollup({ fabricM: headwearFabricM(0.28), pricePerM: 12, threadM: 20, labourMin: 10, labourRate: 15, trims })
    const trimSum = trims.reduce((s, t) => s + t.qty * t.unitCost, 0)
    expect(c.trims).toBeCloseTo(Math.round(trimSum * 100) / 100, 2)
    expect(c.total).toBeGreaterThan(c.fabric) // trims + labour + overhead add on top
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

describe('freight and duty (landed cost)', () => {
  const base = { fabricM: 2, pricePerM: 10, threadM: 0, labourMin: 60, labourRate: 15, overheadPct: 0 }

  it('is unchanged when neither is costed — an ex-works quote stays ex-works', () => {
    const c = costRollup(base)
    expect(c.freight).toBe(0)
    expect(c.duty).toBe(0)
    expect(c.total).toBe(c.fob)
    expect(c.fob).toBe(35) // 20 fabric + 15 labour, no overhead
  })

  it('exposes FOB as the declared customs value — production plus overhead, nothing else', () => {
    const c = costRollup({ ...base, overheadPct: 0.1, freightPerUnit: 5, dutyPct: 0.2 })
    expect(c.fob).toBe(38.5) // 35 + 10%
    expect(c.fob).toBe(c.fabric + c.thread + c.trims + c.labour + c.overhead)
  })

  it('adds freight without marking it up', () => {
    // freight is a shipping charge, not a production cost; the overhead markup
    // must not compound onto it
    const c = costRollup({ ...base, overheadPct: 0.5, freightPerUnit: 4 })
    expect(c.freight).toBe(4)
    expect(c.total).toBe(c.fob + 4)
  })

  it('charges duty on FOB by default, the way US customs assesses it', () => {
    const c = costRollup({ ...base, freightPerUnit: 10, dutyPct: 0.1 })
    expect(c.duty).toBe(3.5) // 10% of 35, NOT of 45
    expect(c.total).toBe(35 + 10 + 3.5)
  })

  it('charges duty on FOB + freight when the basis is CIF, as the EU and UK do', () => {
    const c = costRollup({ ...base, freightPerUnit: 10, dutyPct: 0.1, dutyBasis: 'cif' })
    expect(c.duty).toBe(4.5) // 10% of 45
    expect(c.total).toBe(35 + 10 + 4.5)
  })

  it('CIF is never cheaper than FOB for the same rate', () => {
    for (const freight of [0, 1, 7.5, 100]) {
      const fob = costRollup({ ...base, freightPerUnit: freight, dutyPct: 0.12 })
      const cif = costRollup({ ...base, freightPerUnit: freight, dutyPct: 0.12, dutyBasis: 'cif' })
      expect(cif.duty).toBeGreaterThanOrEqual(fob.duty)
    }
  })

  it('duty of zero costs nothing, whatever the basis', () => {
    for (const dutyBasis of ['fob', 'cif'] as const) {
      expect(costRollup({ ...base, freightPerUnit: 9, dutyPct: 0, dutyBasis }).duty).toBe(0)
    }
  })

  it('refuses negative freight or duty rather than crediting the sheet', () => {
    const c = costRollup({ ...base, freightPerUnit: -20, dutyPct: -0.5 })
    expect(c.freight).toBe(0)
    expect(c.duty).toBe(0)
    expect(c.total).toBe(c.fob)
  })

  it('the total is always the sum of its parts', () => {
    for (const opts of [
      {},
      { freightPerUnit: 3 },
      { dutyPct: 0.15 },
      { freightPerUnit: 3, dutyPct: 0.15 },
      { freightPerUnit: 3, dutyPct: 0.15, dutyBasis: 'cif' as const }
    ]) {
      const c = costRollup({ ...base, ...opts })
      expect(c.total).toBeCloseTo(c.fob + c.freight + c.duty, 2)
    }
  })

  it('rounds to whole cents', () => {
    const c = costRollup({ ...base, freightPerUnit: 1.005, dutyPct: 0.0333 })
    for (const v of [c.fob, c.freight, c.duty, c.total]) expect(v).toBe(Math.round(v * 100) / 100)
  })
})
