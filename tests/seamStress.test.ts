import { describe, it, expect } from 'vitest'
import {
  THREAD_STRENGTH_N,
  SEAM_EFFICIENCY,
  PERFORATION_SPI,
  needleDamage,
  fabricStrengthNPerCm,
  stitchesPerCm,
  seamStrength,
  bestSpi,
  clothLoadNPerCm,
  seamUtilisation,
  seamStressColor,
  seamStressReadout
} from '../src/renderer/export/seamStress'
import { SEAM_TYPES, DEFAULT_STITCH, type SeamType, type StitchSpec } from '../src/renderer/garment/stitchTypes'

const spec = (o: Partial<StitchSpec> = {}): StitchSpec => ({ ...DEFAULT_STITCH, ...o })
const DENIM = 380
const VOILE = 70

describe('the two limits', () => {
  it('rises the thread limit with stitch density, and falls the fabric one', () => {
    const lo = seamStrength(spec({ spi: 6 }), DENIM)
    const hi = seamStrength(spec({ spi: 20 }), DENIM)
    expect(hi.threadN).toBeGreaterThan(lo.threadN)
    expect(hi.fabricN).toBeLessThan(lo.fabricN)
  })

  it('does not damage the fabric below the perforation threshold', () => {
    expect(needleDamage(PERFORATION_SPI)).toBe(1)
    expect(needleDamage(4)).toBe(1)
    expect(needleDamage(PERFORATION_SPI + 4)).toBeLessThan(1)
    expect(needleDamage(200)).toBeGreaterThanOrEqual(0.25) // floored, not zero
  })

  it('takes the weaker of the two, and says which', () => {
    for (const gsm of [VOILE, 160, DENIM]) {
      for (const spi of [5, 10, 18]) {
        const s = seamStrength(spec({ spi }), gsm)
        expect(s.strengthN).toBeCloseTo(Math.min(s.threadN, s.fabricN), 2)
        expect(s.limitedBy).toBe(s.threadN < s.fabricN ? 'thread' : 'fabric')
      }
    }
  })

  it('is thread-limited on heavy cloth and fabric-limited on light', () => {
    // a fine thread cannot hold denim; a heavy one easily out-strengths voile
    expect(seamStrength(spec({ spi: 6, threadWt: 'tex-27' }), DENIM).limitedBy).toBe('thread')
    expect(seamStrength(spec({ spi: 14, threadWt: 'tex-60' }), VOILE).limitedBy).toBe('fabric')
  })
})

describe('seam strength', () => {
  it('is not monotonic in stitch density — it peaks', () => {
    // the reason a sewing room specifies an SPI instead of "as many as possible"
    const at = (spi: number) => seamStrength(spec({ spi, threadWt: 'tex-27' }), 220).strengthN
    const peak = bestSpi(spec({ threadWt: 'tex-27' }), 220)
    expect(peak).toBeGreaterThan(4)
    expect(peak).toBeLessThan(22)
    expect(at(peak)).toBeGreaterThanOrEqual(at(peak - 2))
    expect(at(peak)).toBeGreaterThanOrEqual(at(peak + 4))
  })

  it('moves the peak with the thread', () => {
    // a heavier thread reaches the fabric's limit sooner, so it peaks earlier
    const fine = bestSpi(spec({ threadWt: 'tex-27' }), 220)
    const heavy = bestSpi(spec({ threadWt: 'tex-60' }), 220)
    expect(heavy).toBeLessThanOrEqual(fine)
  })

  it('gains from a twin needle and from a twin-stitched seam', () => {
    const single = seamStrength(spec({ spi: 6 }), DENIM)
    expect(seamStrength(spec({ spi: 6, needle: 'double' }), DENIM).threadN).toBeCloseTo(single.threadN * 2, 1)
    expect(seamStrength(spec({ spi: 6, seamType: 'flat-fell' }), DENIM).threadN).toBeGreaterThan(single.threadN)
  })

  it('makes a flat-fell stronger than the cloth beside it, which is why jeans use it', () => {
    expect(SEAM_EFFICIENCY['flat-fell']).toBeGreaterThan(1)
    for (const t of Object.keys(SEAM_TYPES) as SeamType[]) {
      if (t !== 'flat-fell') expect(SEAM_EFFICIENCY[t], t).toBeLessThan(1)
    }
  })

  it('carries no thread at all on a bonded seam', () => {
    const b = seamStrength(spec({ seamType: 'bonded' }), 200)
    expect(b.limitedBy).toBe('fabric')
    expect(b.strengthN).toBe(b.fabricN)
    // and the stitch density is irrelevant to it
    expect(seamStrength(spec({ seamType: 'bonded', spi: 20 }), 200).strengthN).toBeCloseTo(b.strengthN, 6)
  })

  it('is calibrated against real strip-tensile data at both ends of the range', () => {
    // 120 gsm poplin ≈ 300 N per 5 cm strip = 60 N/cm; 400 gsm denim ≈ 800 N = 160
    expect(fabricStrengthNPerCm(120)).toBeGreaterThan(45)
    expect(fabricStrengthNPerCm(120)).toBeLessThan(70)
    expect(fabricStrengthNPerCm(400)).toBeGreaterThan(140)
    expect(fabricStrengthNPerCm(400)).toBeLessThan(200)
  })

  it('scales the fabric limit with the cloth', () => {
    expect(fabricStrengthNPerCm(400)).toBeCloseTo(fabricStrengthNPerCm(200) * 2, 9)
    expect(fabricStrengthNPerCm(-5)).toBe(0)
    expect(stitchesPerCm(2.54)).toBeCloseTo(1, 9)
  })

  it('orders the threads by weight', () => {
    expect(THREAD_STRENGTH_N['tex-27']).toBeLessThan(THREAD_STRENGTH_N['tex-40'])
    expect(THREAD_STRENGTH_N['tex-40']).toBeLessThan(THREAD_STRENGTH_N['tex-60'])
  })
})

describe('utilisation', () => {
  it('is zero at rest and rises with strain', () => {
    expect(seamUtilisation(0, spec(), 200, 0.2)).toBe(0)
    expect(seamUtilisation(0.1, spec(), 200, 0.2)).toBeGreaterThan(seamUtilisation(0.05, spec(), 200, 0.2))
  })

  it('reaches the fabric’s own failure load at its failure strain', () => {
    expect(clothLoadNPerCm(0.2, 200, 0.2)).toBeCloseTo(fabricStrengthNPerCm(200), 9)
    expect(clothLoadNPerCm(-1, 200, 0.2)).toBe(0) // slack is not a load
  })

  it('goes over 1 before the cloth does, when the seam is the weaker', () => {
    // the whole point of the overlay: a garment usually fails at a seam
    const weak = spec({ seamType: 'overlock', spi: 20, threadWt: 'tex-27' })
    const u = seamUtilisation(0.15, weak, 200, 0.2)
    expect(u).toBeGreaterThan(0.15 / 0.2) // ahead of the cloth's own fraction
  })

  it('never divides by zero', () => {
    expect(Number.isFinite(seamUtilisation(0.1, spec(), 0, 0.2))).toBe(true)
  })
})

describe('the ramp', () => {
  it('runs green to red and holds flat past failure', () => {
    const [r0, g0] = seamStressColor(0)
    const [r1, g1] = seamStressColor(1)
    expect(g0).toBeGreaterThan(r0) // green while there is margin
    expect(r1).toBeGreaterThan(g1) // red at the limit
    expect(seamStressColor(1)).toEqual(seamStressColor(4)) // nothing more to say
  })

  it('stays in range and is continuous across its join', () => {
    for (let u = 0; u <= 1.2; u += 0.02) {
      for (const c of seamStressColor(u)) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
    const a = seamStressColor(0.599)
    const b = seamStressColor(0.601)
    for (let i = 0; i < 3; i++) expect(Math.abs(a[i] - b[i])).toBeLessThan(0.02)
  })

  it('is monotonically less green as it loads up', () => {
    let prev = Infinity
    for (let u = 0; u <= 1; u += 0.05) {
      const g = seamStressColor(u)[1]
      expect(g).toBeLessThanOrEqual(prev + 1e-9)
      prev = g
    }
  })
})

describe('the readout', () => {
  it('says the percentage, the strength, the limit and the verdict', () => {
    const s = seamStrength(spec(), 200)
    expect(seamStressReadout(0.4, s)).toContain('holding')
    expect(seamStressReadout(0.8, s)).toContain('marginal')
    expect(seamStressReadout(1.2, s)).toContain('AT FAILURE')
    expect(seamStressReadout(0.4, s)).toMatch(/thread-limited|fabric-limited/)
  })
})
