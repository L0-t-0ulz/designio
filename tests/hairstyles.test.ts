import { describe, it, expect } from 'vitest'
import {
  CORNROW_SPREAD,
  HAIRLINE,
  cornrowOffset,
  cornrowPoint,
  braidRadius,
  cornrowTaper,
  bunCoil,
  ponytailPoint,
  ponytailRadius
} from '../src/renderer/avatar/hairstyles'
import { HAIRSTYLES, HAIRSTYLE_LABELS, hairstyleSpec, type Hairstyle } from '../src/renderer/avatar/face'
import { hairVolumeCm, effectiveHeadCircCm } from '../src/renderer/avatar/hairVolume'

describe('cornrows', () => {
  it('spaces the rows symmetrically about the centre parting', () => {
    const n = 9
    const all = Array.from({ length: n }, (_, i) => cornrowOffset(i, n))
    expect(all[0]).toBeCloseTo(-CORNROW_SPREAD, 9)
    expect(all[n - 1]).toBeCloseTo(CORNROW_SPREAD, 9)
    expect(all[(n - 1) / 2]).toBeCloseTo(0, 9) // an odd count has a centre row
    for (let i = 0; i < n; i++) expect(all[i]).toBeCloseTo(-all[n - 1 - i], 9)
  })

  it('spaces them evenly, and survives a single row', () => {
    const n = 7
    const step = cornrowOffset(1, n) - cornrowOffset(0, n)
    for (let i = 1; i < n; i++) expect(cornrowOffset(i, n) - cornrowOffset(i - 1, n)).toBeCloseTo(step, 9)
    expect(cornrowOffset(0, 1)).toBe(0)
  })

  it('keeps the rows PARALLEL — they never meet', () => {
    // the bug this covers: tilting great circles makes every row pass through the
    // same two points, so the style renders as a fan converging front and back
    const n = 9
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const xs = Array.from({ length: n }, (_, i) => cornrowPoint(cornrowOffset(i, n), t).x)
      for (let i = 1; i < n; i++) expect(xs[i] - xs[i - 1], `t=${t}`).toBeGreaterThan(0.05)
    }
  })

  it('holds each row at its own lateral offset the whole way along', () => {
    for (const off of [-0.6, 0, 0.4]) {
      for (const t of [0, 0.3, 0.7, 1]) expect(cornrowPoint(off, t).x).toBeCloseTo(off, 9)
    }
  })

  it('lays every row on the scalp sphere', () => {
    for (let i = 0; i < 9; i++) {
      for (let k = 0; k <= 10; k++) {
        const p = cornrowPoint(cornrowOffset(i, 9), k / 10)
        expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 9)
      }
    }
  })

  it('runs each row front to back, starting at the hairline', () => {
    const p0 = cornrowPoint(0, 0)
    const p1 = cornrowPoint(0, 1)
    expect(p0.z).toBeGreaterThan(0) // starts at the front
    expect(p1.z).toBeLessThan(0) // finishes at the back
    expect(p0.y).toBeCloseTo(Math.cos(HAIRLINE), 9) // exactly at the bowl's hairline
  })

  it('makes the outer rows shorter, which falls out of the small circle', () => {
    const len = (off: number) => {
      let d = 0
      let prev = cornrowPoint(off, 0)
      for (let k = 1; k <= 60; k++) {
        const p = cornrowPoint(off, k / 60)
        d += Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)
        prev = p
      }
      return d
    }
    expect(len(0)).toBeGreaterThan(len(0.5))
    expect(len(0.5)).toBeGreaterThan(len(0.75))
  })

  it('clamps an offset past the pole instead of producing NaN', () => {
    for (const off of [-2, 2]) {
      const p = cornrowPoint(off, 0.5)
      expect(Number.isFinite(p.x + p.y + p.z)).toBe(true)
    }
  })

  it('gives the braid a rhythm and a taper', () => {
    // a braid swells and pinches once per crossing; a smooth tube reads as a cord
    let up = 0
    let down = 0
    for (let k = 0; k < 200; k++) {
      const r = braidRadius(k / 200)
      if (r > 1) up++
      if (r < 1) down++
    }
    expect(up).toBeGreaterThan(50)
    expect(down).toBeGreaterThan(50)
    expect(braidRadius(0.5, 14, 0)).toBe(1) // depth 0 = a plain tube
    expect(cornrowTaper(1)).toBeLessThan(cornrowTaper(0))
    expect(cornrowTaper(0)).toBe(1)
  })
})

describe('the bun', () => {
  it('is a spiral wound inward, not a torus', () => {
    // a torus has a hole; a bun does not, so the coil has to tighten to the centre
    const r = (t: number) => {
      const p = bunCoil(t)
      return Math.hypot(p.x, p.z)
    }
    expect(r(0)).toBeGreaterThan(r(0.5))
    expect(r(0.5)).toBeGreaterThan(r(1))
    expect(r(1)).toBeGreaterThan(0) // the free end finishes hidden, not at a point
  })

  it('winds more than one full turn', () => {
    // one turn is a ring, not a bun
    let sweep = 0
    let prev = Math.atan2(bunCoil(0).z, bunCoil(0).x)
    for (let k = 1; k <= 400; k++) {
      const p = bunCoil(k / 400)
      const a = Math.atan2(p.z, p.x)
      let d = a - prev
      while (d > Math.PI) d -= 2 * Math.PI
      while (d < -Math.PI) d += 2 * Math.PI
      sweep += Math.abs(d)
      prev = a
    }
    expect(sweep).toBeGreaterThan(2 * Math.PI * 2)
  })

  it('domes as it winds, because later turns sit on the earlier ones', () => {
    expect(bunCoil(1).y).toBeGreaterThan(bunCoil(0).y)
  })

  it('scales with its radius and clamps outside 0…1', () => {
    expect(Math.hypot(bunCoil(0, 2.6, 0.8).x, bunCoil(0, 2.6, 0.8).z)).toBeCloseTo(0.8, 9)
    expect(bunCoil(-1)).toEqual(bunCoil(0))
    expect(bunCoil(3)).toEqual(bunCoil(1))
  })
})

describe('the ponytail', () => {
  it('starts at the gather and falls', () => {
    const a = ponytailPoint(0)
    expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(0, 9)
    expect(ponytailPoint(1).y).toBeLessThan(ponytailPoint(0.5).y)
    expect(ponytailPoint(0.5).y).toBeLessThan(0)
  })

  it('swings OUT as it clears the skull instead of hanging flat to it', () => {
    // straight down reads as a rope glued to the head
    expect(ponytailPoint(0.3).z).toBeLessThan(-0.1)
    expect(Math.abs(ponytailPoint(1).z)).toBeGreaterThan(0.1)
  })

  it('descends monotonically', () => {
    let prev = Infinity
    for (let k = 0; k <= 100; k++) {
      const y = ponytailPoint(k / 100).y
      expect(y).toBeLessThanOrEqual(prev + 1e-12)
      prev = y
    }
  })

  it('reaches its full length and scales with it', () => {
    expect(ponytailPoint(1, 4).y).toBeCloseTo(ponytailPoint(1, 2).y * 2, 9)
  })

  it('thins along its length and finishes in a point', () => {
    expect(ponytailRadius(0)).toBe(1)
    expect(ponytailRadius(0.5)).toBeLessThan(1)
    expect(ponytailRadius(1)).toBeCloseTo(0, 9)
    let prev = Infinity
    for (let k = 0; k <= 100; k++) {
      const r = ponytailRadius(k / 100)
      expect(r).toBeLessThanOrEqual(prev + 1e-12)
      prev = r
    }
  })
})

describe('the style set', () => {
  it('names and labels every style once', () => {
    expect(new Set(HAIRSTYLES).size).toBe(HAIRSTYLES.length)
    for (const s of HAIRSTYLES) expect(HAIRSTYLE_LABELS[s], s).toBeTruthy()
    for (const s of ['pixie', 'cornrows', 'ponytail', 'bun'] as Hairstyle[]) expect(HAIRSTYLES).toContain(s)
  })

  it('gives every style a complete spec', () => {
    for (const s of HAIRSTYLES) {
      const sp = hairstyleSpec(s)
      expect(sp.hug, s).toBeGreaterThan(0)
      expect(sp.hug, s).toBeLessThanOrEqual(1)
      expect(sp.rows, s).toBeGreaterThanOrEqual(0)
      expect(sp.back, s).toBeGreaterThanOrEqual(0)
    }
  })

  it('separates a pixie from a short bowl by how close it sits, not just length', () => {
    expect(hairstyleSpec('pixie').hug).toBeLessThan(hairstyleSpec('short').hug)
    expect(hairstyleSpec('pixie').back).toBeLessThan(hairstyleSpec('short').back)
  })

  it('gives cornrows rows and no cap, because the partings are the style', () => {
    expect(hairstyleSpec('cornrows').rows).toBeGreaterThan(4)
    expect(hairstyleSpec('cornrows').cap).toBe(false)
    for (const s of HAIRSTYLES) if (s !== 'cornrows') expect(hairstyleSpec(s).rows, s).toBe(0)
  })

  it('gathers only the two styles that are gathered, and in the right places', () => {
    expect(hairstyleSpec('ponytail').gather).toEqual({ kind: 'tail', at: 'nape' })
    expect(hairstyleSpec('bun').gather).toEqual({ kind: 'bun', at: 'crown' })
    for (const s of HAIRSTYLES) {
      if (s !== 'ponytail' && s !== 'bun') expect(hairstyleSpec(s).gather, s).toBeUndefined()
    }
  })
})

describe('hair volume under a hat', () => {
  it('costs a crown bun more than anything, which is why a hat will not sit', () => {
    for (const s of HAIRSTYLES) if (s !== 'bun') expect(hairVolumeCm('bun')).toBeGreaterThan(hairVolumeCm(s))
  })

  it('costs braided-flat and close-cut styles almost nothing', () => {
    expect(hairVolumeCm('cornrows')).toBeLessThan(hairVolumeCm('short'))
    expect(hairVolumeCm('pixie')).toBeLessThan(hairVolumeCm('short'))
    expect(hairVolumeCm('bald')).toBe(0)
  })

  it('has a volume for every style, and folds it into the girth', () => {
    for (const s of HAIRSTYLES) expect(Number.isFinite(hairVolumeCm(s)), s).toBe(true)
    expect(effectiveHeadCircCm(57, 'bun')).toBeCloseTo(57 + hairVolumeCm('bun'), 9)
  })
})
