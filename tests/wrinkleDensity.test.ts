import { describe, it, expect } from 'vitest'
import { WRINKLE_SCALE, dihedralAngle, wrinkleColor, wrinkleDensity, wrinkleSummary } from '../src/renderer/fabric/wrinkleDensity'

/** A flat grid in the XZ plane, w×h quads. */
function plane(w: number, h: number, size = 1): { pos: number[]; idx: number[]; count: number } {
  const pos: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) pos.push((i / w) * size, 0, (j / h) * size)
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = j * (w + 1) + i
      idx.push(a, a + 1, a + w + 1, a + 1, a + w + 2, a + w + 1)
    }
  }
  return { pos, idx, count: (w + 1) * (h + 1) }
}

/** An open cylinder of radius R, `seg` around, `rings` along. Analytic H = 1/(2R). */
function cylinder(R: number, seg: number, rings: number, height: number): { pos: number[]; idx: number[]; count: number } {
  const pos: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2
      pos.push(Math.cos(a) * R, (j / rings) * height, Math.sin(a) * R)
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i
      const b = j * seg + ((i + 1) % seg)
      idx.push(a, b, a + seg, b, b + seg, a + seg)
    }
  }
  return { pos, idx, count: (rings + 1) * seg }
}

/** A UV sphere of radius R. Analytic H = 1/R. */
function sphere(R: number, seg: number, rings: number): { pos: number[]; idx: number[]; count: number } {
  const pos: number[] = []
  const idx: number[] = []
  for (let j = 0; j <= rings; j++) {
    const phi = (j / rings) * Math.PI
    for (let i = 0; i < seg; i++) {
      const th = (i / seg) * Math.PI * 2
      pos.push(R * Math.sin(phi) * Math.cos(th), R * Math.cos(phi), R * Math.sin(phi) * Math.sin(th))
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i
      const b = j * seg + ((i + 1) % seg)
      idx.push(a, b, a + seg, b, b + seg, a + seg)
    }
  }
  return { pos, idx, count: (rings + 1) * seg }
}

/** Mean over interior vertices only (boundaries are reported as 0 by design). */
const interiorMean = (d: Float32Array): number => {
  let s = 0
  let n = 0
  for (const v of d) if (v > 0) { s += v; n++ }
  return n ? s / n : 0
}

describe('dihedral angle', () => {
  it('is zero for coplanar faces', () => {
    expect(dihedralAngle([0, 1, 0], [0, 2, 0])).toBeCloseTo(0, 12)
  })

  it('is a right angle for perpendicular faces', () => {
    expect(dihedralAngle([0, 1, 0], [1, 0, 0])).toBeCloseTo(Math.PI / 2, 12)
  })

  it('is π for opposed faces — a fully folded crease', () => {
    expect(dihedralAngle([0, 1, 0], [0, -1, 0])).toBeCloseTo(Math.PI, 12)
  })

  it('is unsigned — a fold counts the same either way', () => {
    // signed angles would let the ridges and troughs of a pleat cancel to zero,
    // reporting the most wrinkled thing on the garment as perfectly smooth
    const up = dihedralAngle([0, 1, 0], [0.1, 1, 0])
    const down = dihedralAngle([0, 1, 0], [-0.1, 1, 0])
    expect(up).toBeCloseTo(down, 12)
    expect(up).toBeGreaterThan(0)
  })

  it('keeps precision for nearly-parallel faces, where acos would collapse', () => {
    // acos(dot) loses all significance here; atan2(|cross|, dot) does not
    const tiny = 1e-7
    const a = dihedralAngle([0, 1, 0], [tiny, 1, 0])
    expect(a).toBeGreaterThan(0)
    expect(a).toBeCloseTo(tiny, 12)
  })

  it('is stable regardless of normal magnitude', () => {
    expect(dihedralAngle([0, 5, 0], [3, 0, 0])).toBeCloseTo(Math.PI / 2, 12)
  })

  it('returns 0 for a degenerate normal', () => {
    expect(dihedralAngle([0, 0, 0], [0, 0, 0])).toBe(0)
  })
})

describe('curvature against analytic surfaces', () => {
  it('is exactly zero on a flat plane', () => {
    const { pos, idx, count } = plane(6, 6)
    const d = wrinkleDensity(pos, idx, count)
    for (const v of d) expect(v).toBeCloseTo(0, 10)
  })

  it('gives 1/(2R) on a cylinder, for two different radii', () => {
    for (const R of [0.5, 2]) {
      const { pos, idx, count } = cylinder(R, 64, 12, 2)
      const got = interiorMean(wrinkleDensity(pos, idx, count))
      expect(got, `R=${R}`).toBeGreaterThan((1 / (2 * R)) * 0.95)
      expect(got, `R=${R}`).toBeLessThan((1 / (2 * R)) * 1.05)
    }
  })

  it('converges toward 1/(2R) as the cylinder is refined', () => {
    const R = 1
    const exact = 1 / (2 * R)
    const err = (seg: number): number => {
      const m = cylinder(R, seg, 8, 2)
      return Math.abs(interiorMean(wrinkleDensity(m.pos, m.idx, m.count)) - exact)
    }
    expect(err(96)).toBeLessThanOrEqual(err(12))
  })

  it('gives 1/R on a sphere — twice the cylinder, as the theory says', () => {
    const R = 1
    const { pos, idx, count } = sphere(R, 64, 48)
    const got = interiorMean(wrinkleDensity(pos, idx, count))
    expect(got).toBeGreaterThan((1 / R) * 0.93)
    expect(got).toBeLessThan((1 / R) * 1.07)
  })

  it('scales as 1/length — doubling the garment halves the curvature', () => {
    const base = cylinder(1, 48, 10, 2)
    const big = cylinder(2, 48, 10, 4)
    const a = interiorMean(wrinkleDensity(base.pos, base.idx, base.count))
    const b = interiorMean(wrinkleDensity(big.pos, big.idx, big.count))
    expect(b).toBeCloseTo(a / 2, 2)
  })

  it('is invariant to rigid motion', () => {
    const { pos, idx, count } = cylinder(1, 32, 8, 2)
    const moved = pos.map((v, i) => (i % 3 === 0 ? v + 17 : i % 3 === 1 ? v - 4 : v + 9))
    const a = interiorMean(wrinkleDensity(pos, idx, count))
    const b = interiorMean(wrinkleDensity(moved, idx, count))
    expect(b).toBeCloseTo(a, 6)
  })

  it('a creased plane reads higher than a flat one', () => {
    const { pos, idx, count } = plane(8, 8, 1)
    const creased = [...pos]
    // fold every other row up: a concertina, the shape of a pleat
    for (let v = 0; v < count; v++) creased[v * 3 + 1] = (Math.floor(v / 9) % 2) * 0.05
    const flat = wrinkleSummary(wrinkleDensity(pos, idx, count))
    const folded = wrinkleSummary(wrinkleDensity(creased, idx, count))
    expect(folded.peak).toBeGreaterThan(flat.peak)
    expect(folded.mean).toBeGreaterThan(flat.mean)
  })
})

describe('boundaries and degenerate input', () => {
  it('leaves boundary vertices at zero rather than lighting up every hem', () => {
    // a plane's entire rim is boundary; only interior vertices may be non-zero
    const { pos, idx, count } = plane(4, 4)
    const d = wrinkleDensity(pos, idx, count)
    const w = 5 // vertices per row
    for (let j = 0; j < w; j++) {
      for (let i = 0; i < w; i++) {
        if (i === 0 || j === 0 || i === w - 1 || j === w - 1) expect(d[j * w + i]).toBe(0)
      }
    }
  })

  it('handles an empty mesh', () => {
    expect(wrinkleDensity([], [], 0)).toHaveLength(0)
  })

  it('handles a mesh with no faces', () => {
    const d = wrinkleDensity([0, 0, 0, 1, 0, 0], [], 2)
    expect(Array.from(d)).toEqual([0, 0])
  })

  it('never emits NaN or a negative density', () => {
    const { pos, idx, count } = cylinder(1, 24, 6, 2)
    for (const v of wrinkleDensity(pos, idx, count)) {
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('colour and summary', () => {
  it('stays in gamut and brightens monotonically', () => {
    let prev = -1
    for (let i = 0; i <= 20; i++) {
      const c = wrinkleColor((i / 20) * WRINKLE_SCALE)
      for (const v of c) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
      const lum = c[0] * 0.3 + c[1] * 0.6 + c[2] * 0.1
      expect(lum).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = lum
    }
  })

  it('clamps beyond the scale', () => {
    expect(wrinkleColor(WRINKLE_SCALE * 10)).toEqual(wrinkleColor(WRINKLE_SCALE))
    expect(wrinkleColor(-5)).toEqual(wrinkleColor(0))
  })

  it('summarises mean and peak', () => {
    expect(wrinkleSummary([1, 2, 6])).toEqual({ mean: 3, peak: 6 })
    expect(wrinkleSummary([])).toEqual({ mean: 0, peak: 0 })
  })
})
