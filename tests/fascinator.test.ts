import { describe, it, expect } from 'vitest'
import {
  BASE_MM,
  BASE_MIN_MM,
  BASE_MAX_MM,
  AZIMUTH_DEG,
  CANT_DEG,
  SEAT_FRAC,
  QUILLS,
  QUILL_LENGTH_OF_BASE,
  quillPoint,
  quillRadius,
  loopPoint,
  isBlockableBase,
  baseRadius
} from '../src/renderer/avatar/fascinator'
import { mmToUnits } from '../src/renderer/avatar/brimless'

describe('the base', () => {
  it('is a size a milliner blocks', () => {
    expect(isBlockableBase(BASE_MM)).toBe(true)
    expect(isBlockableBase(BASE_MIN_MM)).toBe(true)
    expect(isBlockableBase(BASE_MAX_MM)).toBe(true)
    expect(isBlockableBase(BASE_MIN_MM - 1)).toBe(false)
    expect(isBlockableBase(BASE_MAX_MM + 1)).toBe(false)
  })

  it('converts through the same millimetres the hats use', () => {
    expect(baseRadius(BASE_MM)).toBeCloseTo((BASE_MM / 2) * mmToUnits, 12)
  })

  it('is worn on the side, tilted — not on the crown facing forward', () => {
    // a fascinator built as a small hat sits on top facing front, which is the one
    // place it is never worn
    expect(AZIMUTH_DEG).toBeGreaterThan(30)
    expect(AZIMUTH_DEG).toBeLessThan(90) // forward of the ear, not behind it
    expect(CANT_DEG).toBeGreaterThan(10) // canted off the skull
    expect(SEAT_FRAC).toBeGreaterThan(0)
    expect(SEAT_FRAC).toBeLessThan(0.5) // high on the head, not down by the ear
  })
})

describe('the quill spray', () => {
  it('starts every quill at the base and takes it out to its own length', () => {
    for (let i = 0; i < QUILLS; i++) {
      const at0 = quillPoint(i, QUILLS, 0)
      expect(Math.hypot(at0.x, at0.y, at0.z)).toBeCloseTo(0, 9)
      const tip = quillPoint(i, QUILLS, 1)
      expect(Math.hypot(tip.x, tip.z)).toBeGreaterThan(0.5)
      expect(Math.hypot(tip.x, tip.z)).toBeLessThanOrEqual(QUILL_LENGTH_OF_BASE + 1e-9)
    }
  })

  it('arcs rather than spiking: steep off the base, flattening to the tip', () => {
    // a feather is sprung; a straight line reads as a skewer
    const rise = (t: number) => quillPoint(3, QUILLS, t).y
    const early = rise(0.2) - rise(0)
    const late = rise(1) - rise(0.8)
    expect(early).toBeGreaterThan(late)
    expect(rise(0.5)).toBeGreaterThan(0)
  })

  it('fans, with the outer quills shorter', () => {
    const len = (i: number) => {
      const p = quillPoint(i, QUILLS, 1)
      return Math.hypot(p.x, p.y, p.z)
    }
    const mid = (QUILLS - 1) / 2
    expect(len(mid)).toBeGreaterThan(len(0))
    expect(len(mid)).toBeGreaterThan(len(QUILLS - 1))
    // and they spread across the fan rather than bunching
    const xs = Array.from({ length: QUILLS }, (_, i) => quillPoint(i, QUILLS, 1).x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1)
  })

  it('is symmetric about the middle of the fan', () => {
    for (const t of [0.3, 0.7, 1]) {
      const a = quillPoint(0, QUILLS, t)
      const b = quillPoint(QUILLS - 1, QUILLS, t)
      expect(a.x).toBeCloseTo(-b.x, 9)
      expect(a.y).toBeCloseTo(b.y, 9)
      expect(a.z).toBeCloseTo(b.z, 9)
    }
  })

  it('survives a single quill and clamps outside 0…1', () => {
    const one = quillPoint(0, 1, 1)
    expect(Number.isFinite(one.x + one.y + one.z)).toBe(true)
    expect(quillPoint(2, QUILLS, -1)).toEqual(quillPoint(2, QUILLS, 0))
    expect(quillPoint(2, QUILLS, 9)).toEqual(quillPoint(2, QUILLS, 1))
  })

  it('tapers the quill to a point', () => {
    expect(quillRadius(0)).toBeGreaterThan(quillRadius(0.5))
    expect(quillRadius(0.5)).toBeGreaterThan(quillRadius(1))
    expect(quillRadius(1)).toBeGreaterThan(0) // a feather has a tip, not a knife edge
  })
})

describe('the sinamay loop', () => {
  it('leaves the base and comes back to it', () => {
    const a = loopPoint(0)
    const b = loopPoint(1)
    expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(0, 9)
    expect(Math.hypot(b.x, b.y, b.z)).toBeCloseTo(0, 9)
  })

  it('is full at the top and pinched where it meets the base', () => {
    expect(loopPoint(0.5).y).toBeGreaterThan(loopPoint(0.1).y)
    expect(loopPoint(0.5).y).toBeGreaterThan(loopPoint(0.9).y)
  })

  it('leans, so it is a loop and not a flat ring', () => {
    expect(loopPoint(0.5).z).toBeGreaterThan(0)
  })

  it('scales its height and lean without moving its feet', () => {
    expect(loopPoint(0.5, 2).y).toBeCloseTo(loopPoint(0.5, 1).y * 2, 9)
    expect(loopPoint(0, 2).y).toBeCloseTo(0, 9)
  })
})
