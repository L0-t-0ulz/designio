import { describe, it, expect } from 'vitest'
import { dialFromWind, windFromDial } from '../src/renderer/studio/windDial'

describe('wind compass dial', () => {
  it('up blows front→back (−z, the runway draft); right blows +x', () => {
    const up = windFromDial(0, 1)
    expect(up.x).toBeCloseTo(0, 10)
    expect(up.z).toBeCloseTo(-10, 10)
    const right = windFromDial(Math.PI / 2, 0.5)
    expect(right.x).toBeCloseTo(5, 10)
    expect(right.z).toBeCloseTo(0, 10)
  })

  it('round-trips wind ↔ dial and clamps strength', () => {
    for (const [x, z] of [
      [3.8, 1.2],
      [-2, 4],
      [0.4, -3.4]
    ]) {
      const d = dialFromWind(x, z)
      const w = windFromDial(d.angle, d.strength01)
      expect(w.x).toBeCloseTo(x, 8)
      expect(w.z).toBeCloseTo(z, 8)
    }
    expect(windFromDial(1, 5).x).toBeCloseTo(windFromDial(1, 1).x, 10) // strength clamped at 1
    expect(dialFromWind(0, 0).strength01).toBe(0) // calm centre
    expect(dialFromWind(30, 0).strength01).toBe(1) // over-max clamps
  })
})
