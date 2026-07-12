import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { POSTURES, applyPostureToColliders, postureAngles } from '../src/renderer/avatar/posture'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import type { Capsule } from '../src/renderer/avatar/colliders'

describe('posture presets', () => {
  it('neutral is a no-op; each preset bends a distinct carriage', () => {
    expect(postureAngles('neutral')).toEqual({ spine: 0, neck: 0 })
    expect(postureAngles('slouch').spine).toBeGreaterThan(0) // forward
    expect(postureAngles('athletic').spine).toBeLessThan(0) // lifted
    expect(postureAngles('swayback').spine).toBeLessThan(0)
    expect(postureAngles('swayback').neck).toBeGreaterThan(0) // …but the head juts forward
    expect(new Set(POSTURES).size).toBe(4)
  })

  it('bends the upper chain about the waist; legs and hips stay planted', () => {
    // a synthetic 13-capsule chain: head/neck/torso up top, legs below the waist
    const cap = (ax: number, ay: number, bx: number, by: number): Capsule => ({
      a: new THREE.Vector3(ax, ay, 0),
      b: new THREE.Vector3(bx, by, 0),
      radius: 0.05
    })
    const waistY = 1
    const colliders: Capsule[] = [
      cap(0, 1.7, 0, 1.8), // 0 head
      cap(0, 1.55, 0, 1.65), // 1 neck
      cap(0, waistY, 0, 1.5), // 2 torso (a = waist end)
      cap(-0.2, 1.45, 0.2, 1.45), // 3 shoulder line
      cap(-0.15, 1.05, 0.15, 1.05), // 4 hip line (untouched)
      cap(-0.25, 1.4, -0.25, 1.15), // 5 upper arm L
      cap(-0.25, 1.15, -0.25, 0.9), // 6 forearm L
      cap(-0.1, 1, -0.1, 0.55), // 7 thigh L
      cap(-0.1, 0.55, -0.1, 0.1), // 8 shin L
      cap(0.25, 1.4, 0.25, 1.15), // 9 upper arm R
      cap(0.25, 1.15, 0.25, 0.9), // 10 forearm R
      cap(0.1, 1, 0.1, 0.55), // 11 thigh R
      cap(0.1, 0.55, 0.1, 0.1) // 12 shin R
    ]
    const headZ0 = colliders[0].b.z
    const thigh0 = colliders[7].a.clone()
    applyPostureToColliders(colliders, waistY, postureAngles('slouch'))
    expect(colliders[0].b.z).toBeGreaterThan(headZ0) // the head moves forward (+z)
    expect(colliders[0].b.y).toBeLessThan(1.8) // …and drops
    expect(colliders[7].a.equals(thigh0)).toBe(true) // legs untouched
    expect(colliders[2].a.y).toBe(waistY) // the torso stays planted at the waist
    expect(colliders[2].b.z).toBeGreaterThan(0) // …and bends forward above it
    // arms follow the ribcage
    expect(colliders[5].a.z).toBeGreaterThan(0)
  })

  it('the live mannequin re-carries: slouch pushes the head forward, legs identical', () => {
    const mann = buildMannequin()
    const headZ = mann.colliders[0].b.z
    const legA = mann.colliders[7].a.clone()
    mann.setPosture('slouch')
    expect(mann.colliders[0].b.z).toBeGreaterThan(headZ)
    expect(mann.colliders[7].a.equals(legA)).toBe(true)
    mann.setPosture('neutral')
    expect(mann.colliders[0].b.z).toBeCloseTo(headZ, 10) // fully reversible
  })
})
