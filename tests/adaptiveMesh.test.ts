import { describe, it, expect } from 'vitest'
import { adaptiveRingT, ADAPTIVE_STRENGTH } from '../src/renderer/cloth/adaptiveMesh'
import { fillTube, tubeRingT } from '../src/renderer/cloth/Garment'

const constant = (r: number) => () => r
const linear = (a: number, b: number) => (t: number) => a + (b - a) * t

describe('adaptive remeshing — ring placement', () => {
  it('degenerates: 0/1/2 rings', () => {
    expect(adaptiveRingT(constant(0.2), 0)).toEqual([])
    expect(adaptiveRingT(constant(0.2), 1)).toEqual([0])
    expect(adaptiveRingT(constant(0.2), 2)).toEqual([0, 1])
  })

  it('a constant-radius (straight) tube stays exactly uniform', () => {
    const ts = adaptiveRingT(constant(0.18), 9)
    for (let i = 0; i < 9; i++) expect(ts[i]).toBeCloseTo(i / 8, 6)
  })

  it('a constant-SLOPE (plain cone / A-line) tube stays uniform', () => {
    const ts = adaptiveRingT(linear(0.14, 0.28), 11)
    for (let i = 0; i < 11; i++) expect(ts[i]).toBeCloseTo(i / 10, 6)
  })

  it('strength 0 falls back to uniform even on a shaped profile', () => {
    const bell = (t: number) => 0.1 + 0.2 * Math.sin(t * Math.PI) // puff sleeve
    const ts = adaptiveRingT(bell, 12, 0)
    for (let i = 0; i < 12; i++) expect(ts[i]).toBeCloseTo(i / 11, 6)
  })

  it('always spans [0,1], strictly increasing', () => {
    const cinch = (t: number) => (t < 0.45 ? 0.2 - 0.1 * (t / 0.45) : 0.1 + 0.15 * ((t - 0.45) / 0.55)) // bust→waist→hip
    const ts = adaptiveRingT(cinch, 20)
    expect(ts[0]).toBe(0)
    expect(ts[ts.length - 1]).toBe(1)
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1])
  })

  it('packs rings at the bend, not in the straight runs', () => {
    // straight for the top half, then a flare over the bottom half: the silhouette
    // BENDS at t≈0.5, and is straight (0 curvature) around t≈0.15 and t≈0.9
    const flareLow = (t: number) => (t < 0.5 ? 0.15 : 0.15 + 0.2 * ((t - 0.5) / 0.5))
    const ts = adaptiveRingT(flareLow, 25)
    const band = (c: number) => ts.filter((t) => Math.abs(t - c) < 0.12).length
    expect(band(0.5)).toBeGreaterThan(band(0.15))
    expect(band(0.5)).toBeGreaterThan(band(0.9))
  })

  it('never collapses a ring gap below uniformGap / MAX_DENSITY (solver-safe)', () => {
    // a sharp cinch — the worst case for over-concentration
    const sharp = (t: number) => 0.22 - 0.18 * Math.exp(-((t - 0.4) ** 2) / 0.002)
    const rings = 24
    const ts = adaptiveRingT(sharp, rings)
    const uniform = 1 / (rings - 1)
    let minGap = Infinity
    for (let i = 1; i < rings; i++) minGap = Math.min(minGap, ts[i] - ts[i - 1])
    expect(minGap).toBeGreaterThan((uniform / 2.5) * 0.98) // MAX_DENSITY = 2.5
  })

  it('a stronger strength concentrates harder (spacing more uneven)', () => {
    // a flare-onset corner: straight, then bends. Stronger strength packs more rings
    // at the bend → the straight-run gaps grow → a larger max gap.
    const flare = (t: number) => (t < 0.5 ? 0.15 : 0.15 + 0.2 * ((t - 0.5) / 0.5))
    const maxGap = (ts: number[]) => ts.reduce((m, t, i) => (i ? Math.max(m, t - ts[i - 1]) : m), 0)
    const gentle = adaptiveRingT(flare, 16, 0.4)
    const hard = adaptiveRingT(flare, 16, 2)
    expect(maxGap(hard)).toBeGreaterThan(maxGap(gentle))
  })
})

describe('adaptive remeshing — geometry integration', () => {
  it('tubeRingT drives fillTube: a cinched dress concentrates rings near the waist', () => {
    const spec = {
      rings: 24,
      radial: 40,
      topY: 1.4,
      bottomY: 0.4,
      radiusTop: 0.18,
      radiusBottom: 0.22,
      radiusWaist: 0.13,
      waistT: 0.4
    }
    const ts = tubeRingT(spec)
    // the waist band (|t - 0.4| < 0.12) should hold more rings than the same-width
    // band up near the bust, where the profile changes little
    const band = (c: number) => ts.filter((t) => Math.abs(t - c) < 0.12).length
    expect(band(0.4)).toBeGreaterThan(band(0.85))

    // the filled Y positions must stay monotonically descending, top pinned at topY
    const pos = new Float32Array(spec.radial * spec.rings * 3)
    fillTube(pos, spec, ts)
    const ringY = (iy: number) => pos[iy * spec.radial * 3 + 1]
    expect(ringY(0)).toBeCloseTo(spec.topY, 6) // top ring unmoved (pins)
    expect(ringY(spec.rings - 1)).toBeCloseTo(spec.bottomY, 6)
    for (let iy = 1; iy < spec.rings; iy++) expect(ringY(iy)).toBeLessThan(ringY(iy - 1))
  })

  it('a straight tube fills identically to the legacy uniform spacing', () => {
    const spec = { rings: 16, radial: 24, topY: 1.3, bottomY: 0.6, radiusTop: 0.16, radiusBottom: 0.16 }
    const pos = new Float32Array(spec.radial * spec.rings * 3)
    fillTube(pos, spec)
    for (let iy = 0; iy < spec.rings; iy++) {
      const t = iy / (spec.rings - 1)
      expect(pos[iy * spec.radial * 3 + 1]).toBeCloseTo(spec.topY + (spec.bottomY - spec.topY) * t, 5)
    }
  })

  it('exposes a sane default strength', () => {
    expect(ADAPTIVE_STRENGTH).toBeGreaterThan(0)
    expect(ADAPTIVE_STRENGTH).toBeLessThan(3)
  })
})
