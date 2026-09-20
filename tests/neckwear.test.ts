import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  TIE_BLADE_MM,
  TIE_BAND_MM,
  TIE_TIP_OF_TORSO,
  BOW_WING_MM,
  BOW_HEIGHT_MM,
  BRACE_WIDTH_MM,
  tieHalfWidth,
  splineThrough3,
  girthAt
} from '../src/renderer/avatar/neckwear'
import { makeRibbon, writeRibbon } from '../src/renderer/avatar/accessories'

describe('necktie blade profile', () => {
  it('leaves the knot at the neck-band width and opens to the full blade', () => {
    // a tie is not a constant-width strip: it comes out of the knot narrow
    expect(tieHalfWidth(0) * 2 * TIE_BLADE_MM).toBeCloseTo(TIE_BAND_MM, 6)
    expect(tieHalfWidth(0.5)).toBeCloseTo(0.5, 6) // full blade through the body
    expect(tieHalfWidth(0.8)).toBeCloseTo(0.5, 6)
  })

  it('closes to a point, not a rounded end', () => {
    expect(tieHalfWidth(1)).toBeCloseTo(0, 9)
    expect(tieHalfWidth(0.95)).toBeGreaterThan(0)
    expect(tieHalfWidth(0.95)).toBeLessThan(0.5)
  })

  it('never widens then narrows then widens again', () => {
    // one open, one plateau, one close — a profile that wobbles reads as a defect
    let rising = true
    let prev = tieHalfWidth(0)
    for (let t = 0.01; t <= 1; t += 0.01) {
      const w = tieHalfWidth(t)
      if (rising && w < prev - 1e-9) rising = false
      if (!rising) expect(w).toBeLessThanOrEqual(prev + 1e-9)
      prev = w
    }
    expect(rising).toBe(false) // it does come down to the point
  })

  it('clamps outside 0…1 rather than running off', () => {
    expect(tieHalfWidth(-5)).toBeCloseTo(tieHalfWidth(0), 12)
    expect(tieHalfWidth(9)).toBeCloseTo(tieHalfWidth(1), 12)
    expect(Number.isFinite(tieHalfWidth(0.5))).toBe(true)
  })

  it('reaches the belt buckle, which is past the anatomical waist', () => {
    expect(TIE_TIP_OF_TORSO).toBeGreaterThan(1)
    expect(TIE_TIP_OF_TORSO).toBeLessThan(1.2) // but not down the trouser leg
  })
})

describe('splineThrough3', () => {
  const at = (t: number) => splineThrough3([0, 2, 0], [0, 1, 1], [0, 0, 0], t)

  it('passes through all three control points', () => {
    expect(at(0)).toEqual([0, 2, 0])
    expect(at(0.5)).toEqual([0, 1, 1])
    expect(at(1)).toEqual([0, 0, 0])
  })

  it('bows toward the middle control point rather than cutting the chord', () => {
    // the whole reason this exists: a tie has to go OVER the chest, and the chest
    // is the middle point. A straight chord from the neck to the waist has z = 0
    // throughout and passes straight through the ribcage.
    for (let t = 0.02; t < 1; t += 0.02) expect(at(t)[2]).toBeGreaterThan(0)
    for (const t of [0.4, 0.5, 0.6]) expect(at(t)[2]).toBeGreaterThan(0.5)
  })

  it('is continuous across the join between its two segments', () => {
    const before = at(0.5 - 1e-4)
    const after = at(0.5 + 1e-4)
    for (let i = 0; i < 3; i++) expect(Math.abs(before[i] - after[i])).toBeLessThan(1e-3)
  })

  it('is smooth across the join — no kink where the segments meet', () => {
    // the tangent either side of the middle point has to agree, or the strip creases
    // the one-sided tangents AT the join, which is where a Hermite pair can kink
    const h = 1e-6
    const p = (t: number) => splineThrough3([0, 2, 0], [0, 1, 1], [0, 0, 0], t)
    const dir = (a: number[], b: number[]) => new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()
    const left = dir(p(0.5 - h), p(0.5))
    const right = dir(p(0.5), p(0.5 + h))
    expect(left.distanceTo(right)).toBeLessThan(1e-3)
  })

  it('reduces to a straight line when the points are collinear and evenly spaced', () => {
    const line = (t: number) => splineThrough3([0, 0, 0], [0, 1, 0], [0, 2, 0], t)
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(line(t)[1]).toBeCloseTo(t * 2, 6)
      expect(line(t)[0]).toBeCloseTo(0, 9)
    }
  })

  it('clamps outside 0…1', () => {
    expect(at(-1)).toEqual(at(0))
    expect(at(2)).toEqual(at(1))
  })
})

describe('girthAt', () => {
  it('hits each measured girth at its own landmark', () => {
    expect(girthAt(0.05, 0.15, 0.13, 0)).toBeCloseTo(0.05, 9)
    expect(girthAt(0.05, 0.15, 0.13, 0.5)).toBeCloseTo(0.15, 9)
    expect(girthAt(0.05, 0.15, 0.13, 1)).toBeCloseTo(0.13, 9)
  })

  it('never overshoots into a bulge the body does not have', () => {
    // linear, not splined, on purpose — a radius is a measurement
    const lo = Math.min(0.05, 0.15, 0.13)
    const hi = Math.max(0.05, 0.15, 0.13)
    for (let t = 0; t <= 1; t += 0.02) {
      const r = girthAt(0.05, 0.15, 0.13, t)
      expect(r).toBeGreaterThanOrEqual(lo - 1e-12)
      expect(r).toBeLessThanOrEqual(hi + 1e-12)
    }
  })
})

describe('ribbon strips', () => {
  it('builds two vertices per ring and two triangles per segment', () => {
    const geo = makeRibbon(4)
    expect(geo.getAttribute('position').count).toBe(10)
    expect(geo.getIndex()!.count).toBe(4 * 6)
  })

  it('lays the vertices half a width either side of the centre line', () => {
    const geo = makeRibbon(2)
    writeRibbon(
      geo,
      2,
      (t, out) => out.set(0, 1 - t, 0),
      (_t, out) => out.set(1, 0, 0),
      () => 0.04
    )
    const p = geo.getAttribute('position')
    // Float32 buffers, so 6 places is the resolution there is
    expect(p.getX(0)).toBeCloseTo(-0.04, 6)
    expect(p.getX(1)).toBeCloseTo(0.04, 6)
    expect(p.getY(0)).toBeCloseTo(1, 6)
    expect(p.getY(4)).toBeCloseTo(0, 6) // the last ring is at t = 1
  })

  it('tapers where the profile does, so a tie really does come to a point', () => {
    const geo = makeRibbon(10)
    writeRibbon(
      geo,
      10,
      (t, out) => out.set(0, -t, 0),
      (_t, out) => out.set(1, 0, 0),
      tieHalfWidth
    )
    const p = geo.getAttribute('position')
    const width = (i: number) => Math.abs(p.getX(i * 2 + 1) - p.getX(i * 2))
    expect(width(10)).toBeCloseTo(0, 6)
    expect(width(5)).toBeGreaterThan(width(0))
  })

  it('rewrites in place on the same buffer, so a moving body costs no allocation', () => {
    const geo = makeRibbon(3)
    const buf = geo.getAttribute('position').array
    writeRibbon(geo, 3, (t, out) => out.set(t, 0, 0), (_t, out) => out.set(0, 1, 0), () => 0.01)
    writeRibbon(geo, 3, (t, out) => out.set(0, t, 0), (_t, out) => out.set(1, 0, 0), () => 0.01)
    expect(geo.getAttribute('position').array).toBe(buf)
    expect(geo.boundingSphere).not.toBeNull()
  })

  it('leaves usable normals for a lit material', () => {
    const geo = makeRibbon(3)
    writeRibbon(geo, 3, (t, out) => out.set(0, -t, 0), (_t, out) => out.set(1, 0, 0), () => 0.03)
    const n = geo.getAttribute('normal')
    expect(n).toBeTruthy()
    for (let i = 0; i < n.count; i++) {
      const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i))
      expect(len).toBeGreaterThan(0.9)
    }
  })
})

describe('trade sizes', () => {
  it('uses the sizes neckwear is actually sold in', () => {
    expect(TIE_BLADE_MM).toBe(80) // the standard modern blade
    expect(BOW_WING_MM).toBeGreaterThan(BOW_HEIGHT_MM) // a butterfly is wider than tall
    expect(BRACE_WIDTH_MM).toBe(35) // the classic brace
  })
})
