import { describe, it, expect } from 'vitest'
import { crownDrop, CROWN_STYLES, DEFAULT_CROWN } from '../src/renderer/avatar/crown'

describe('the crown shape library — plan-disc crease fields', () => {
  it('every style is non-negative, bounded, and zero outside the disc', () => {
    for (const s of CROWN_STYLES) {
      for (let x = -1.2; x <= 1.2; x += 0.1) {
        for (let z = -1.2; z <= 1.2; z += 0.1) {
          const d = crownDrop(s, x, z)
          expect(d).toBeGreaterThanOrEqual(0)
          expect(d).toBeLessThanOrEqual(0.35)
          if (Math.hypot(x, z) >= 1) expect(d).toBe(0)
        }
      }
    }
  })

  it('dome is the un-creased block — zero everywhere', () => {
    expect(crownDrop('dome', 0, 0)).toBe(0)
    expect(crownDrop('dome', 0.3, -0.4)).toBe(0)
  })

  it('centre-dent: one gutter down the middle, running the crown length', () => {
    expect(crownDrop('centre-dent', 0, 0)).toBeGreaterThan(0.2)
    // runs front↔back along the centreline
    expect(crownDrop('centre-dent', 0, 0.45)).toBeGreaterThan(0.2)
    expect(crownDrop('centre-dent', 0, -0.45)).toBeGreaterThan(0.2)
    // symmetric across the centreline, gone at the sides
    expect(crownDrop('centre-dent', 0.2, 0)).toBeCloseTo(crownDrop('centre-dent', -0.2, 0), 10)
    expect(crownDrop('centre-dent', 0.55, 0)).toBe(0)
  })

  it('teardrop: a centred bowl that reads wider at the back', () => {
    expect(crownDrop('teardrop', 0, 0)).toBeGreaterThan(0.25)
    // at the same offset, the back (−z) carries more crease than the front
    expect(crownDrop('teardrop', 0.4, -0.3)).toBeGreaterThan(crownDrop('teardrop', 0.4, 0.3))
    // mirror-symmetric left↔right
    expect(crownDrop('teardrop', 0.3, -0.2)).toBeCloseTo(crownDrop('teardrop', -0.3, -0.2), 10)
  })

  it('diamond: pressed inside the rhombus, clean outside it', () => {
    expect(crownDrop('diamond', 0, 0)).toBeGreaterThan(0.25)
    expect(crownDrop('diamond', 0.5, 0.6)).toBe(0) // outside |x|/a + |z|/b = 1
    expect(crownDrop('diamond', 0.3, 0)).toBeGreaterThan(0)
    expect(crownDrop('diamond', 0, 0.4)).toBeGreaterThan(0)
  })

  it('telescope (pork-pie): a ring gutter — the centre stays popped', () => {
    expect(crownDrop('telescope', 0, 0)).toBe(0) // popped centre
    expect(crownDrop('telescope', 0.6, 0)).toBeGreaterThan(0.25) // the gutter
    expect(crownDrop('telescope', 0, -0.6)).toBeGreaterThan(0.25) // rotationally symmetric
    expect(crownDrop('telescope', 0.95, 0)).toBe(0) // gone before the wall
  })

  it('the default crease is the classic teardrop', () => {
    expect(DEFAULT_CROWN).toBe('teardrop')
    expect(CROWN_STYLES).toContain(DEFAULT_CROWN)
  })
})
