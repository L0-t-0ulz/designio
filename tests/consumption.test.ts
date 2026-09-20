import { describe, it, expect } from 'vitest'
import {
  fabricConsumption,
  bestBolt,
  consumptionReadout,
  BOLT_WIDTHS_CM,
  END_LOSS_M,
  SPLICE_LOSS_M,
  MIN_CUT_M,
  NAP_PENALTY
} from '../src/renderer/export/consumption'
import type { PatternPanel } from '../src/renderer/export/garmentPattern'

/** A rectangular panel `w` × `h` mm, cut `n` times. */
const rect = (name: string, w: number, h: number, n = 1): PatternPanel => ({
  name,
  cut: n,
  outline: [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h }
  ],
  grain: [
    { x: w / 2, y: 0 },
    { x: w / 2, y: h }
  ],
  notches: [],
  wmm: w,
  hmm: h
})

const bodice = () => [rect('Front', 420, 600), rect('Back', 420, 600), rect('Sleeve', 260, 520, 2)]

describe('fabric consumption', () => {
  it('buys more than the marker is long', () => {
    // the marker is the cutting-room plan; a roll also carries end loss
    const c = fabricConsumption({ panels: bodice() })
    expect(c.buyM).toBeGreaterThan(c.markerM)
    expect(c.buyM - c.markerM).toBeCloseTo(END_LOSS_M, 2)
  })

  it('charges for every roll join', () => {
    const none = fabricConsumption({ panels: bodice() })
    const two = fabricConsumption({ panels: bodice(), splices: 2 })
    expect(two.buyM - none.buyM).toBeCloseTo(2 * SPLICE_LOSS_M, 3)
    expect(fabricConsumption({ panels: bodice(), splices: -3 }).buyM).toBeCloseTo(none.buyM, 6)
  })

  it('divides by the shrinkage rather than multiplying, which would come up short', () => {
    // cloth that shrinks 3 % must be cut 1/0.97 long, not ×1.03
    const dry = fabricConsumption({ panels: bodice() })
    const wet = fabricConsumption({ panels: bodice(), shrinkage: 0.03 })
    expect(wet.buyM).toBeCloseTo(dry.buyM / 0.97, 3) // reported to the millimetre
    expect(wet.buyM).toBeGreaterThan(dry.buyM * 1.03 - 1e-9) // strictly the safer of the two
  })

  it('lengthens the marker for a nap', () => {
    const plain = fabricConsumption({ panels: bodice() })
    const nap = fabricConsumption({ panels: bodice(), napped: true })
    expect(nap.markerM).toBeCloseTo(plain.markerM / (1 - NAP_PENALTY), 3)
    expect(nap.buyM).toBeGreaterThan(plain.buyM)
  })

  it('never sells less than a short cut', () => {
    const tiny = fabricConsumption({ panels: [rect('Tab', 20, 30)] })
    expect(tiny.buyM).toBeGreaterThanOrEqual(MIN_CUT_M)
  })

  it('reports a utilisation that is a fraction, and waste that balances', () => {
    const c = fabricConsumption({ panels: bodice() })
    expect(c.utilisation).toBeGreaterThan(0)
    expect(c.utilisation).toBeLessThanOrEqual(1)
    const panelM2 = c.layout.panelAreaCm2 / 10000
    expect(panelM2 + c.wasteM2).toBeCloseTo(c.boughtM2, 2)
  })

  it('buys more cloth for more copies', () => {
    const one = fabricConsumption({ panels: [rect('Front', 420, 600, 1)] })
    const four = fabricConsumption({ panels: [rect('Front', 420, 600, 4)] })
    expect(four.buyM).toBeGreaterThan(one.buyM)
  })

  it('handles an empty pattern without dividing by zero', () => {
    const c = fabricConsumption({ panels: [] })
    expect(Number.isFinite(c.buyM)).toBe(true)
    expect(c.buyM).toBeGreaterThanOrEqual(MIN_CUT_M)
    expect(c.utilisation).toBeGreaterThanOrEqual(0)
  })
})

describe('bestBolt', () => {
  it('picks a width by nesting at each one, not by taking the widest', () => {
    const best = bestBolt({ panels: bodice() })
    for (const w of BOLT_WIDTHS_CM) {
      expect(best.boughtM2).toBeLessThanOrEqual(fabricConsumption({ panels: bodice(), boltWidthCm: w }).boughtM2 + 1e-9)
    }
  })

  it('does not simply return the widest bolt', () => {
    // a panel a little over half the bolt leaves the rest empty for the whole
    // marker, so a narrower bolt that fits two across can win outright
    const wide = rect('Panel', 800, 400, 6) // 80 cm across
    const best = bestBolt({ panels: [wide] })
    expect(BOLT_WIDTHS_CM).toContain(best.boltWidthCm)
    expect(best.boughtM2).toBeLessThanOrEqual(fabricConsumption({ panels: [wide], boltWidthCm: 180 }).boughtM2 + 1e-9)
  })

  it('breaks ties toward the narrower bolt, which is the cheaper cloth', () => {
    const b = bestBolt({ panels: [rect('Tab', 20, 30)] }) // tiny: every width ties on the minimum cut
    expect(b.boltWidthCm).toBe(Math.min(...BOLT_WIDTHS_CM))
  })

  it('respects a caller-supplied width list', () => {
    const b = bestBolt({ panels: bodice() }, [150])
    expect(b.boltWidthCm).toBe(150)
  })
})

describe('the readout', () => {
  it('says what to buy, at what width, and how much of it is used', () => {
    const s = consumptionReadout(fabricConsumption({ panels: bodice() }))
    expect(s).toMatch(/^\d+\.\d\d m @ \d+ cm · \d+% utilised$/)
  })
})
