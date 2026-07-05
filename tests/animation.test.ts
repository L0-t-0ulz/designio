import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

describe('poseable mannequin', () => {
  it('walk swings the legs but leaves the head fixed', () => {
    const m = buildMannequin()
    const shin = m.colliders[8] // left shin
    const head = m.colliders[0]

    const t = Math.PI / 6 // → phase π/2 at walk freq 3, speed 1 (sin = 1)
    m.update(t, 'static', 1)
    const shinRest = shin.b.clone()
    const headRest = head.a.clone()

    m.update(t, 'walk', 1)
    expect(shin.b.distanceTo(shinRest)).toBeGreaterThan(0.02) // leg moved
    expect(head.a.distanceTo(headRest)).toBeLessThan(1e-9) // torso/head fixed
  })

  it('returns to the rest pose in static mode', () => {
    const m = buildMannequin()
    const shin = m.colliders[8]
    m.update(0, 'static', 1)
    const rest = shin.b.clone()
    m.update(2.3, 'walk', 1)
    m.update(2.3, 'static', 1)
    expect(shin.b.distanceTo(rest)).toBeLessThan(1e-9)
  })
})

describe('slim seat (single source of truth)', () => {
  const SEAT = 0.52 // must match Mannequin.ts; both mesh + collider use hipR * SEAT
  it('the hip collider radius equals the mesh seat radius (no fat invisible capsule)', () => {
    const m = buildMannequin()
    // colliders[4] is the pelvis/hip segment.
    expect(m.colliders[4].radius).toBeCloseTo(m.measurements.hipR * SEAT, 6)
    // …and far slimmer than the old fat 0.14 capsule that pushed garments over the rear.
    expect(m.colliders[4].radius).toBeLessThan(0.12)
  })

  it('the slim seat holds after a resize (still one source)', () => {
    const m = buildMannequin()
    m.resize({ bodyType: 'male', build: 1.1, hips: 1.2 })
    expect(m.colliders[4].radius).toBeCloseTo(m.measurements.hipR * SEAT, 6)
  })
})
