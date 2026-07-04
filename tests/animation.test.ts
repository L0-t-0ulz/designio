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
