import { describe, it, expect } from 'vitest'
import {
  MAX_USABLE_STRETCH,
  MIN_USABLE_STRETCH,
  stretchUtilisation,
  usableStretch,
  utilisationBand,
  utilisationColor,
  utilisationReadout,
  utilisationSummary
} from '../src/renderer/fabric/stretchUtilisation'

describe('usable elongation from the stretch index', () => {
  it('pins the calibrated endpoints', () => {
    expect(usableStretch(0)).toBeCloseTo(MIN_USABLE_STRETCH, 10) // rigid woven: 3%
    expect(usableStretch(1)).toBeCloseTo(MAX_USABLE_STRETCH, 10) // power knit: 100%
  })

  it('is geometric, not linear — the midpoint is a jersey, not a power knit', () => {
    // linear would put index 0.5 at (3+100)/2 = 51.5% elongation, which would call a
    // mid-range fabric a power knit; geometric gives √(0.03 × 1.0) ≈ 17.3%
    const mid = usableStretch(0.5)
    expect(mid).toBeCloseTo(Math.sqrt(MIN_USABLE_STRETCH * MAX_USABLE_STRETCH), 10)
    expect(mid).toBeGreaterThan(0.15)
    expect(mid).toBeLessThan(0.20)
  })

  it('satisfies the defining property of a geometric interpolation', () => {
    // f(a)·f(b) = f((a+b)/2)²  for any a, b
    for (const [a, b] of [[0, 1], [0.2, 0.8], [0.1, 0.3]]) {
      expect(usableStretch(a) * usableStretch(b)).toBeCloseTo(usableStretch((a + b) / 2) ** 2, 10)
    }
  })

  it('increases monotonically', () => {
    let prev = 0
    for (let i = 0; i <= 20; i++) {
      const v = usableStretch(i / 20)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })

  it('clamps an out-of-range index rather than extrapolating to nonsense', () => {
    expect(usableStretch(-5)).toBe(usableStretch(0))
    expect(usableStretch(9)).toBe(usableStretch(1))
  })

  it('treats a non-finite index as rigid rather than poisoning every colour', () => {
    // Math.min/max propagate NaN; without a guard the elongation, the utilisation
    // and every vertex colour derived from them all become NaN
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(Number.isFinite(usableStretch(bad)), String(bad)).toBe(true)
      expect(usableStretch(bad)).toBe(MIN_USABLE_STRETCH)
    }
    expect(stretchUtilisation(NaN, 0.5)).toBe(0)
  })
})

describe('utilisation', () => {
  it('is strain divided by what the fabric can give', () => {
    // a rigid woven (3% usable) at 1.5% strain is using half its give
    expect(stretchUtilisation(0.015, 0)).toBeCloseTo(0.5, 10)
    // the same 1.5% strain in a power knit (100% usable) is using 1.5% of it
    expect(stretchUtilisation(0.015, 1)).toBeCloseTo(0.015, 10)
  })

  it('makes the same strain mean opposite things on different cloth — the point of the view', () => {
    const strain = 0.06
    expect(stretchUtilisation(strain, 0)).toBeGreaterThan(1) // blown out on denim
    expect(stretchUtilisation(strain, 1)).toBeLessThan(0.1) // nothing on a power knit
  })

  it('treats slack as using none of the stretch', () => {
    for (const s of [-0.01, -0.5, -0]) expect(stretchUtilisation(s, 0.5)).toBe(0)
  })

  it('does not clamp above 1 — that case is the one worth seeing', () => {
    // flattening an over-stretched garment to "100%" hides the failure
    expect(stretchUtilisation(0.09, 0)).toBeCloseTo(3, 6)
  })

  it('is exactly 1 at the fabric’s limit, for every fabric', () => {
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      expect(stretchUtilisation(usableStretch(k), k)).toBeCloseTo(1, 10)
    }
  })

  it('scales linearly in strain', () => {
    expect(stretchUtilisation(0.04, 0.5)).toBeCloseTo(2 * stretchUtilisation(0.02, 0.5), 10)
  })
})

describe('bands', () => {
  it('reads the garment the way a fitter would', () => {
    expect(utilisationBand(0)).toBe('slack')
    expect(utilisationBand(0.05)).toBe('slack')
    expect(utilisationBand(0.3)).toBe('comfortable')
    expect(utilisationBand(0.7)).toBe('working')
    expect(utilisationBand(0.95)).toBe('limit')
    expect(utilisationBand(1.4)).toBe('over')
  })

  it('has no gaps or overlaps across the whole range', () => {
    const seen = new Set<string>()
    let prev = utilisationBand(0)
    for (let i = 0; i <= 300; i++) {
      const band = utilisationBand(i / 200)
      if (band !== prev) {
        expect(seen.has(band), `band ${band} recurs`).toBe(false) // never goes backwards
        seen.add(prev)
        prev = band
      }
    }
  })

  it('boundaries belong to the higher band', () => {
    expect(utilisationBand(0.1)).toBe('comfortable')
    expect(utilisationBand(0.6)).toBe('working')
    expect(utilisationBand(0.9)).toBe('limit')
    expect(utilisationBand(1)).toBe('limit') // exactly at the limit is not yet over
  })
})

describe('colour ramp', () => {
  it('stays in gamut everywhere', () => {
    for (let i = 0; i <= 40; i++) {
      for (const c of utilisationColor(i / 20)) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
  })

  it('warms monotonically as utilisation rises', () => {
    let prev = -1
    for (let i = 0; i <= 10; i++) {
      const red = utilisationColor(i / 10)[0]
      expect(red).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = red
    }
  })

  it('marks over-limit distinctly, not as more red', () => {
    const atLimit = utilisationColor(1)
    const over = utilisationColor(1.2)
    expect(over).not.toEqual(atLimit)
    expect(over[2]).toBeGreaterThan(atLimit[2]) // magenta lifts blue; a redder red would not
  })
})

describe('summary', () => {
  const strains = [-0.02, 0, 0.01, 0.02, 0.05]

  it('reports peak, mean and the over-limit fraction', () => {
    // strains [-0.02, 0, 0.01, 0.02, 0.05] against 3% usable: only 0.05 exceeds it
    const s = utilisationSummary(strains, 0)
    expect(s.usable).toBeCloseTo(0.03, 10)
    expect(s.peak).toBeCloseTo(0.05 / 0.03, 6)
    expect(s.overFraction).toBeCloseTo(1 / 5, 10)
    // the two slack samples contribute 0, not a negative
    expect(s.mean).toBeCloseTo((0 + 0 + 0.01 + 0.02 + 0.05) / 0.03 / 5, 6)
  })

  it('peak is what decides wearability — a mean would hide one blown-out armhole', () => {
    const mostlySlack = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.09] // one bad particle in ten
    const s = utilisationSummary(mostlySlack, 0)
    expect(s.mean).toBeLessThan(0.35)
    expect(s.peak).toBeCloseTo(3, 6) // and the peak screams
  })

  it('handles an empty sample without dividing by zero', () => {
    const s = utilisationSummary([], 0.5)
    expect(s).toMatchObject({ peak: 0, mean: 0, overFraction: 0 })
    expect(s.usable).toBeGreaterThan(0)
  })

  it('reads out in percentages', () => {
    expect(utilisationReadout({ peak: 0.72, mean: 0.3, overFraction: 0, usable: 0.173 })).toBe('peak 72% of 17% usable stretch')
    expect(utilisationReadout({ peak: 1.5, mean: 0.4, overFraction: 0.08, usable: 0.03 })).toContain('over limit')
  })
})
