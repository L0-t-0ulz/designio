import { describe, it, expect } from 'vitest'
import {
  FRAMES,
  SUNGLASSES_STYLES,
  FACE_WIDTH_MM,
  HEAD_UNITS_ACROSS,
  unitsPerMm,
  lensOffset,
  frameWidthMm,
  lensOutline,
  type SunglassesStyle
} from '../src/renderer/avatar/shades'

const styles = SUNGLASSES_STYLES

describe('sunglasses frame specs', () => {
  it('gives every style a lens▫bridge an optician would recognise', () => {
    for (const s of styles) {
      const f = FRAMES[s]
      expect(f.lensMm, s).toBeGreaterThanOrEqual(44) // the smallest frames made
      expect(f.lensMm, s).toBeLessThanOrEqual(62)
      expect(f.bridgeMm, s).toBeGreaterThanOrEqual(13)
      expect(f.bridgeMm, s).toBeLessThanOrEqual(24)
    }
  })

  it('keeps the whole frame inside the face it is drafted for', () => {
    // a frame wider than the face hangs off the temples
    for (const s of styles) {
      expect(frameWidthMm(FRAMES[s]), s).toBeLessThanOrEqual(FACE_WIDTH_MM)
      expect(frameWidthMm(FRAMES[s]), s).toBeGreaterThan(FACE_WIDTH_MM * 0.6)
    }
  })

  it('tells the four blocks apart the way real frames differ', () => {
    expect(FRAMES.aviator.lensMm).toBeGreaterThan(FRAMES.round.lensMm) // the big teardrop
    expect(FRAMES.aviator.teardrop).toBe(true)
    expect(FRAMES.aviator.browBar).toBe(true)
    expect(FRAMES.round.lensMm).toBe(FRAMES.round.lensHighMm) // round is round
    expect(FRAMES['cat-eye'].upsweep).toBeGreaterThan(FRAMES.wayfarer.upsweep)
    // acetate is moulded and chunky; a metal frame is drawn wire
    for (const s of styles) expect(FRAMES[s].rimMm > 3).toBe(!FRAMES[s].metal)
  })

  it('converts millimetres into the head frame off the measured head breadth', () => {
    expect(unitsPerMm * FACE_WIDTH_MM).toBeCloseTo(HEAD_UNITS_ACROSS, 9)
    // and the measured head is 0.87 radii either side
    expect(HEAD_UNITS_ACROSS / 2).toBeCloseTo(0.87, 9)
  })

  it('offsets each lens by half a bridge plus half a lens', () => {
    for (const s of styles) {
      const f = FRAMES[s]
      expect(lensOffset(f) * 2).toBeCloseTo((f.bridgeMm + f.lensMm) * unitsPerMm, 9)
      // the two lenses must not overlap across the nose
      expect(lensOffset(f) * 2).toBeGreaterThan(f.lensMm * unitsPerMm)
    }
  })
})

describe('lens outlines', () => {
  const extent = (pts: [number, number][]) => ({
    w: Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0])),
    h: Math.max(...pts.map((p) => p[1])) - Math.min(...pts.map((p) => p[1]))
  })

  it('comes out at the specified lens size', () => {
    for (const s of ['wayfarer', 'round'] as SunglassesStyle[]) {
      const f = FRAMES[s]
      const e = extent(lensOutline(f, 1, 120))
      expect(e.w, s).toBeCloseTo(f.lensMm * unitsPerMm, 2)
      expect(e.h, s).toBeCloseTo(f.lensHighMm * unitsPerMm, 2)
    }
  })

  it('closes cleanly, with no repeated or NaN point', () => {
    for (const s of styles) {
      const pts = lensOutline(FRAMES[s], -1, 40)
      expect(pts).toHaveLength(40)
      for (const [x, y] of pts) expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      expect(pts[0]).not.toEqual(pts[39]) // an open list; the curve closes it
    }
  })

  it('mirrors every swept block instead of leaning both lenses the same way', () => {
    // a swept lens rises at the TEMPLE corner, so the pair are mirror images —
    // both leaning the same way is the classic way to get this wrong
    // compare the two corners rather than the apex: on a gentle sweep the apex is
    // still near the top centre, but the outer corner is unambiguously higher
    const cornerY = (pts: [number, number][], sign: number) =>
      pts.reduce((a, b) => (b[0] * sign > a[0] * sign ? b : a))[1]
    for (const s of styles.filter((k) => FRAMES[k].upsweep > 0)) {
      const l = lensOutline(FRAMES[s], -1, 80)
      const r = lensOutline(FRAMES[s], 1, 80)
      expect(cornerY(l, -1), `${s} left outer`).toBeGreaterThan(cornerY(l, 1))
      expect(cornerY(r, 1), `${s} right outer`).toBeGreaterThan(cornerY(r, -1))
    }
  })

  it('leaves the blocks with no upsweep symmetric', () => {
    // a wayfarer has a slight upsweep of its own, so it is not one of them
    for (const s of styles.filter((k) => FRAMES[k].upsweep === 0)) {
      const l = lensOutline(FRAMES[s], -1, 60)
      const r = lensOutline(FRAMES[s], 1, 60)
      for (let i = 0; i < l.length; i++) {
        expect(l[i][0], s).toBeCloseTo(r[i][0], 9)
        expect(l[i][1], s).toBeCloseTo(r[i][1], 9)
      }
    }
  })

  it('makes the teardrop wider at the top than the bottom', () => {
    // which is what a teardrop IS — an ellipse would be the same at both
    const pts = lensOutline(FRAMES.aviator, 1, 200)
    const spanAt = (y: number, tol: number) => {
      const band = pts.filter((p) => Math.abs(p[1] - y) < tol).map((p) => p[0])
      return band.length ? Math.max(...band) - Math.min(...band) : 0
    }
    const hh = (FRAMES.aviator.lensHighMm / 2) * unitsPerMm
    expect(spanAt(hh * 0.5, hh * 0.08)).toBeGreaterThan(spanAt(-hh * 0.5, hh * 0.08))
  })

  it('does not make a round lens a teardrop by accident', () => {
    const pts = lensOutline(FRAMES.round, 1, 200)
    const e = extent(pts)
    expect(e.w).toBeCloseTo(e.h, 6) // a circle
  })
})
