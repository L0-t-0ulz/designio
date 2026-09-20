import { describe, it, expect } from 'vitest'
import { malarDensity, scatterFreckles, freckleColour, FRECKLE_MIN_MM, FRECKLE_MAX_MM, FIELD_WIDTH_MM } from '../src/renderer/avatar/freckles'

describe('malar distribution', () => {
  it('is densest on the nose bridge and the cheekbones', () => {
    const bridge = malarDensity(0, 0.6)
    const cheek = malarDensity(0.58, 0.6)
    const between = malarDensity(0.3, 0.6)
    expect(bridge).toBeGreaterThan(between)
    expect(cheek).toBeGreaterThan(between)
  })

  it('thins toward the jaw and stops at the temples', () => {
    expect(malarDensity(0, 0.1)).toBeLessThan(malarDensity(0, 0.9))
    expect(malarDensity(0.98, 0.6)).toBeLessThan(malarDensity(0.58, 0.6))
    expect(malarDensity(1.3, 0.5)).toBe(0)
    expect(malarDensity(0, -0.2)).toBe(0)
    expect(malarDensity(0, 1.4)).toBe(0)
  })

  it('cuts out the eye sockets, which are shaded', () => {
    // a freckle on an eyeball is the single most obvious way to get this wrong
    expect(malarDensity(0.52, 0.95)).toBeCloseTo(0, 2)
    expect(malarDensity(-0.52, 0.95)).toBeCloseTo(0, 2)
    expect(malarDensity(0.52, 0.55)).toBeGreaterThan(0.2) // the cheek below it does
  })

  it('is symmetric, and never negative', () => {
    for (let x = 0; x <= 1; x += 0.05) {
      for (let y = 0; y <= 1; y += 0.1) {
        expect(malarDensity(x, y)).toBeCloseTo(malarDensity(-x, y), 12)
        expect(malarDensity(x, y)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('scatter', () => {
  it('is deterministic from its seed, so a face keeps its own freckles', () => {
    const a = scatterFreckles(60, 1, 7)
    const b = scatterFreckles(60, 1, 7)
    expect(a).toEqual(b)
    expect(scatterFreckles(60, 1, 8)).not.toEqual(a)
  })

  it('scales with density and vanishes at zero', () => {
    expect(scatterFreckles(100, 0, 1)).toHaveLength(0)
    expect(scatterFreckles(100, 0.3, 1).length).toBeLessThan(scatterFreckles(100, 1, 1).length)
  })

  it('follows the density rather than filling the rectangle', () => {
    // the point of rejection sampling: no freckles where the face does not freckle
    const pts = scatterFreckles(300, 1, 3)
    expect(pts.length).toBeGreaterThan(50)
    for (const p of pts) expect(malarDensity(p.x, p.y), `${p.x},${p.y}`).toBeGreaterThan(0)
    // and more of them land near the bridge than out at the temple
    const near = pts.filter((p) => Math.abs(p.x) < 0.25).length
    const far = pts.filter((p) => Math.abs(p.x) > 0.85).length
    expect(near).toBeGreaterThan(far)
  })

  it('sizes them as ephelides, in radii not diameters', () => {
    for (const p of scatterFreckles(200, 1, 5)) {
      const diameterMm = p.r * FIELD_WIDTH_MM * 2
      expect(diameterMm).toBeGreaterThanOrEqual(FRECKLE_MIN_MM - 1e-9)
      expect(diameterMm).toBeLessThanOrEqual(FRECKLE_MAX_MM + 1e-9)
      expect(p.strength).toBeGreaterThan(0)
      expect(p.strength).toBeLessThanOrEqual(1)
    }
  })

  it('stays inside the field', () => {
    for (const p of scatterFreckles(200, 1, 11)) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
    }
  })
})

describe('freckle colour', () => {
  it('is the same skin turned up, not a fixed brown', () => {
    const fair = 0xf0d0b8
    const deep = 0x5a3a26
    // each stays recognisably its own skin, darker
    for (const skin of [fair, deep]) {
      const c = freckleColour(skin, 1)
      expect(c).toBeLessThan(skin) // darker overall
      const lum = (v: number) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11
      expect(lum(c)).toBeLessThan(lum(skin))
      expect(lum(c)).toBeGreaterThan(lum(skin) * 0.5) // and not a different colour entirely
    }
  })

  it('warms as it darkens, because melanin absorbs blue hardest', () => {
    const c = freckleColour(0xf0d0b8, 1)
    const rDrop = 0xf0 - ((c >> 16) & 255)
    const bDrop = 0xb8 - (c & 255)
    expect(bDrop / 0xb8).toBeGreaterThan(rDrop / 0xf0)
  })

  it('does nothing at zero strength and never leaves the byte range', () => {
    expect(freckleColour(0xd8a98c, 0)).toBe(0xd8a98c)
    for (const s of [0, 0.3, 1]) {
      const c = freckleColour(0xffffff, s)
      for (const ch of [(c >> 16) & 255, (c >> 8) & 255, c & 255]) {
        expect(ch).toBeGreaterThanOrEqual(0)
        expect(ch).toBeLessThanOrEqual(255)
      }
    }
  })
})
