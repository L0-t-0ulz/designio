import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { tuckCentre } from '../src/renderer/cloth/Garment'
import type { ScarfSpec } from '../src/renderer/cloth/Garment'

const spec: ScarfSpec = {
  nx: 40,
  ny: 8,
  neckY: 1.5,
  wrapR: 0.09,
  width: 0.1,
  tailLen: 0.5,
  tailZ: 0.18, // the DRAPED tip sits well forward of the chest
  tuck: true
}

const at = (u: number): THREE.Vector3 => tuckCentre(u, spec, new THREE.Vector3())

describe('scarf tuck-into-coat', () => {
  it('the collar still wraps the neck at the middle', () => {
    const mid = at(0.5)
    expect(mid.y).toBeCloseTo(spec.neckY, 6)
    expect(Math.hypot(mid.x, mid.z)).toBeCloseTo(spec.wrapR, 5) // on the neck ring
  })

  it('the tucked tails are SHORT + pressed close to the chest (not hanging forward)', () => {
    const tip = at(0) // the very end of a tail
    // tucked tip sits much closer to the body than the draped tip would (tailZ = 0.18)
    expect(tip.z).toBeLessThan(spec.tailZ)
    // and it doesn't hang as low as a full-length draped tail
    expect(spec.neckY - tip.y).toBeLessThan(spec.tailLen) // shorter than the full tail
  })

  it('the tails are pulled toward centre-front (not spread wide)', () => {
    const leftTip = at(0)
    const rightTip = at(1)
    expect(leftTip.x).toBeLessThan(0)
    expect(rightTip.x).toBeGreaterThan(0)
    // tucked toward centre — the tips are within the neck ring's half-width
    expect(Math.abs(leftTip.x)).toBeLessThan(spec.wrapR)
    expect(Math.abs(rightTip.x)).toBeLessThan(spec.wrapR)
  })
})
