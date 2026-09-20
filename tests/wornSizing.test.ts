import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  circumferenceCm,
  watchCaseMm,
  watchThicknessMm,
  watchLugWidthMm,
  WATCH_CASE_MIN_MM,
  WATCH_CASE_MAX_MM,
  STUD_BALL_MM,
  HOOP_OUTER_MM,
  SOCK_HEIGHTS_CM,
  SOCK_HEIGHTS,
  sockRiseM,
  FOOT_LAST,
  SOCK_INSIDE_SHOE,
  HAND_REACH_R,
  HAND_HALF_BREADTH_R,
  HAND_HALF_THICKNESS_R,
  GLOVE_CLEARANCE_R
} from '../src/renderer/avatar/wornSizing'
import { HAIRLINE_FRAC, BROW_FRAC, NOSE_BASE_FRAC, EAR_TOP_FRAC, EAR_BOTTOM_FRAC, EAR_CENTRE_FRAC, EARLOBE_FRAC, EAR_X, LOBE_X } from '../src/renderer/avatar/face'
import { radialMount } from '../src/renderer/avatar/accessories'

describe('worn hardware sizing', () => {
  it('reads a girth off a radius', () => {
    // a 17 cm wrist is r ≈ 2.7 cm
    expect(circumferenceCm(0.027)).toBeCloseTo(16.96, 2)
    expect(circumferenceCm(0)).toBe(0)
  })

  it('sizes a watch case to the wrist at the retail brackets', () => {
    // the men's standard: 40 mm on a 17 cm wrist
    expect(watchCaseMm(17)).toBeCloseTo(40, 6)
    // and the published brackets fall out of the same line
    expect(watchCaseMm(15)).toBeCloseTo(36, 6) // 14–16 cm → 34–38 mm
    expect(watchCaseMm(19)).toBeCloseTo(44, 6) // 18–20 cm → 42–46 mm
  })

  it('is monotonic in the wrist, and clamps to the sizes cases are made in', () => {
    let prev = 0
    for (let c = 8; c <= 28; c += 0.5) {
      const d = watchCaseMm(c)
      expect(d).toBeGreaterThanOrEqual(prev)
      expect(d).toBeGreaterThanOrEqual(WATCH_CASE_MIN_MM)
      expect(d).toBeLessThanOrEqual(WATCH_CASE_MAX_MM)
      prev = d
    }
    expect(watchCaseMm(5)).toBe(WATCH_CASE_MIN_MM) // a child's wrist
    expect(watchCaseMm(40)).toBe(WATCH_CASE_MAX_MM)
  })

  it('derives thickness and strap width from the case', () => {
    expect(watchThicknessMm(40)).toBeCloseTo(10.8, 6) // a 40 mm three-hander
    // lug width is half the case, on the even mm straps are cut in
    expect(watchLugWidthMm(40)).toBe(20)
    expect(watchLugWidthMm(38)).toBe(20)
    expect(watchLugWidthMm(42)).toBe(22)
    expect(watchLugWidthMm(46)).toBe(24)
    for (let d = WATCH_CASE_MIN_MM; d <= WATCH_CASE_MAX_MM; d++) {
      expect(watchLugWidthMm(d) % 2).toBe(0)
      expect(watchLugWidthMm(d)).toBeLessThan(d) // a strap is never wider than the case
    }
  })

  it('keeps the jewellery at trade sizes', () => {
    expect(STUD_BALL_MM).toBe(5)
    expect(HOOP_OUTER_MM).toBe(30)
  })
})

describe('ear landmarks', () => {
  it('divides the face into the classical thirds below the hairline', () => {
    expect(NOSE_BASE_FRAC - BROW_FRAC).toBeCloseTo(BROW_FRAC - HAIRLINE_FRAC, 12)
    expect(1 - NOSE_BASE_FRAC).toBeCloseTo(BROW_FRAC - HAIRLINE_FRAC, 12)
  })

  it('spans the auricle from the brow to the base of the nose', () => {
    expect(EAR_TOP_FRAC).toBe(BROW_FRAC)
    expect(EAR_BOTTOM_FRAC).toBe(NOSE_BASE_FRAC)
    // which puts its centre exactly 0.6 of the way down the head
    expect(EAR_CENTRE_FRAC).toBeCloseTo(0.6, 12)
  })

  it('gives an ear of a real height on a real head', () => {
    // a 23 cm crown-to-chin head — the adult average
    const headCm = 23
    const earCm = (EAR_BOTTOM_FRAC - EAR_TOP_FRAC) * headCm
    expect(earCm).toBeGreaterThan(5.5) // a real auricle is 6–6.5 cm
    expect(earCm).toBeLessThan(7)
  })

  it('puts the lobe low on the ear but still on it', () => {
    expect(EARLOBE_FRAC).toBeGreaterThan(EAR_CENTRE_FRAC) // further down the head
    expect(EARLOBE_FRAC).toBeLessThan(EAR_BOTTOM_FRAC) // but above the bottom edge
  })

  it('keeps the jewellery inside the measured head breadth', () => {
    // `?probeHead=1` measures the rendered head at 0.87 collider radii at its widest,
    // tapering toward the jaw — so the ear sits just inside that and the lobe further in
    expect(EAR_X).toBeLessThan(0.87)
    expect(LOBE_X).toBeLessThan(EAR_X)
    expect(LOBE_X).toBeGreaterThan(0.75)
  })
})

describe('radialMount', () => {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  it('returns a unit direction square to the limb axis', () => {
    const m = radialMount(v(0, -1, 0), v(0.6, -0.8, 0))
    expect(m.length()).toBeCloseTo(1, 10)
    expect(m.dot(v(0, -1, 0))).toBeCloseTo(0, 10)
    expect(m.x).toBeGreaterThan(0) // keeps the outward sense
  })

  it('keeps only the perpendicular part of the requested direction', () => {
    // a mount asked for straight down a vertical limb is fully axial, so what is
    // left is the perpendicular component alone — here, pure +z
    const m = radialMount(v(0, -1, 0), v(0, -5, 2))
    expect(m.x).toBeCloseTo(0, 10)
    expect(m.y).toBeCloseTo(0, 10)
    expect(m.z).toBeCloseTo(1, 10)
  })

  it('stays flat on the limb when the limb is not vertical', () => {
    // the whole point: a swinging arm must not tilt the case off the wrist
    const axis = v(0.4, -0.9, 0.2).normalize()
    for (const away of [v(1, 0, 0), v(-0.3, -1, 0.5), v(0, 0, -1)]) {
      const m = radialMount(axis, away)
      expect(m.dot(axis)).toBeCloseTo(0, 10)
      expect(m.length()).toBeCloseTo(1, 10)
    }
  })

  it('falls back to a stable perpendicular when the request is parallel to the axis', () => {
    for (const axis of [v(0, 1, 0), v(0, 0, 1), v(1, 0, 0)]) {
      const m = radialMount(axis, axis.clone().multiplyScalar(3))
      expect(Number.isFinite(m.x + m.y + m.z)).toBe(true)
      expect(m.length()).toBeCloseTo(1, 10)
      expect(m.dot(axis)).toBeCloseTo(0, 10)
    }
  })

  it('is scale-invariant in both arguments', () => {
    const a = radialMount(v(0, -1, 0), v(2, -3, 1))
    const b = radialMount(v(0, -7, 0), v(20, -30, 10))
    expect(a.distanceTo(b)).toBeCloseTo(0, 10)
  })
})

describe('limb coverings', () => {
  it('specifies sock heights in cm up from the sole, as socks are sold', () => {
    expect(SOCK_HEIGHTS_CM['no-show']).toBeLessThan(SOCK_HEIGHTS_CM.ankle)
    expect(SOCK_HEIGHTS_CM.ankle).toBeLessThan(SOCK_HEIGHTS_CM.crew)
    expect(SOCK_HEIGHTS_CM.crew).toBeLessThan(SOCK_HEIGHTS_CM['knee-high'])
    expect(SOCK_HEIGHTS).toHaveLength(4)
    expect(new Set(SOCK_HEIGHTS).size).toBe(SOCK_HEIGHTS.length)
  })

  it('measures a sock cuff from the ankle bone, so a no-show finishes below it', () => {
    // the whole point of the cut: it disappears into the shoe
    expect(sockRiseM('no-show')).toBeLessThan(0)
    expect(sockRiseM('ankle')).toBeLessThan(0.01) // level with the bone, near enough
    expect(sockRiseM('crew')).toBeCloseTo(0.11, 9) // 18 cm up, less the 7 cm ankle
    expect(sockRiseM('knee-high')).toBeCloseTo(0.31, 9)
    for (let i = 1; i < SOCK_HEIGHTS.length; i++) {
      expect(sockRiseM(SOCK_HEIGHTS[i])).toBeGreaterThan(sockRiseM(SOCK_HEIGHTS[i - 1]))
    }
  })

  it('cuts the sock inside the shoe, on the very same last', () => {
    // the property that makes a sock fit IN a shoe rather than through it: both are
    // built from FOOT_LAST, and the sock is strictly smaller in every dimension
    const k = 1 - SOCK_INSIDE_SHOE
    expect(k).toBeGreaterThan(0)
    expect(k).toBeLessThan(1)
    for (const v of Object.values(FOOT_LAST)) {
      expect(v * k).toBeLessThan(v)
      expect(v - v * k).toBeGreaterThan(0.001) // at least a millimetre of room
    }
  })

  it('sizes a glove to the hand that is drawn, not to the capsule', () => {
    // the capsule's distal point is the palm; the hand carries on past it
    expect(HAND_REACH_R).toBeGreaterThan(1)
    // and the glove is cut with ease over the hand, never inside it
    expect(GLOVE_CLEARANCE_R).toBeGreaterThan(0)
    expect(HAND_HALF_BREADTH_R).toBeGreaterThan(HAND_HALF_THICKNESS_R) // a hand is flat
  })
})
