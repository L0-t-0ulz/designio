import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import type { Capsule } from '../src/renderer/avatar/colliders'
import {
  headFrame,
  hairstyleSpec,
  faceFeatureLayout,
  HAIRSTYLES,
  HAIR_COLORS,
  HAIRSTYLE_LABELS
} from '../src/renderer/avatar/face'

/** A minimal capsule array with a real head (0) + shoulder (3); the rest are dummies. */
function makeColliders(rotY = 0): Capsule[] {
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
  const v = (x: number, y: number, z: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, z).applyQuaternion(q)
  const c: Capsule[] = []
  for (let i = 0; i < 13; i++) c.push({ a: v(0, 0, 0), b: v(0, 0, 0), radius: 0.05 })
  c[0] = { a: v(0, 1.61, 0), b: v(0, 1.66, 0), radius: 0.1 } // head (b = crown)
  c[3] = { a: v(-0.15, 1.43, 0), b: v(0.15, 1.43, 0), radius: 0.05 } // shoulder (a=left → b=right)
  return c
}

const unit = (v: THREE.Vector3): number => v.length()

describe('headFrame', () => {
  it('at rest, points forward +z / up +y / right +x, radius = head radius', () => {
    const f = headFrame(makeColliders())
    expect(f.forward.z).toBeCloseTo(1, 5)
    expect(f.up.y).toBeCloseTo(1, 5)
    expect(f.right.x).toBeCloseTo(1, 5)
    expect(f.radius).toBeCloseTo(0.1, 6)
    expect(f.crown.y).toBeCloseTo(1.66, 6) // crown = head.b
  })

  it('is orthonormal at rest and when the body is turned', () => {
    for (const rot of [0, Math.PI / 2, -1.2, Math.PI]) {
      const f = headFrame(makeColliders(rot))
      expect(unit(f.forward)).toBeCloseTo(1, 5)
      expect(unit(f.up)).toBeCloseTo(1, 5)
      expect(unit(f.right)).toBeCloseTo(1, 5)
      expect(f.forward.dot(f.up)).toBeCloseTo(0, 5)
      expect(f.forward.dot(f.right)).toBeCloseTo(0, 5)
      expect(f.up.dot(f.right)).toBeCloseTo(0, 5)
    }
  })

  it('the facing turns with the body (a 90° turn rotates forward off +z)', () => {
    const f = headFrame(makeColliders(Math.PI / 2))
    expect(Math.abs(f.forward.z)).toBeLessThan(0.2) // no longer facing +z
    expect(Math.abs(f.forward.x)).toBeGreaterThan(0.8)
  })
})

describe('hairstyleSpec', () => {
  it('is defined for every listed style', () => {
    for (const s of HAIRSTYLES) expect(hairstyleSpec(s)).toBeDefined()
  })

  it('bald has no hair at all; every other style has some', () => {
    // "a cap or an afro" was the whole vocabulary once. Cornrows have neither —
    // they are rows braided flat with the scalp showing between them — so the
    // invariant is that a named style puts *something* on the head.
    const hasHair = (s: ReturnType<typeof hairstyleSpec>): boolean =>
      s.cap || s.afro || s.back > 0 || s.rows > 0 || s.gather !== undefined
    expect(hasHair(hairstyleSpec('bald'))).toBe(false)
    for (const s of HAIRSTYLES.filter((x) => x !== 'bald')) {
      expect(hasHair(hairstyleSpec(s)), s).toBe(true)
    }
  })

  it('length grows short → bob → long', () => {
    expect(hairstyleSpec('long').back).toBeGreaterThan(hairstyleSpec('bob').back)
    expect(hairstyleSpec('bob').back).toBeGreaterThan(hairstyleSpec('short').back)
  })

  it('afro is its own volume (no cap)', () => {
    expect(hairstyleSpec('afro').afro).toBe(true)
    expect(hairstyleSpec('afro').cap).toBe(false)
  })
})

describe('faceFeatureLayout', () => {
  const feats = faceFeatureLayout()
  const by = (name: string): [number, number, number] => feats.find((f) => f.name === name)!.pos

  it('eyes are mirrored across the centre line at the same height/depth', () => {
    const l = by('eyeL-sclera')
    const r = by('eyeR-sclera')
    expect(l[0]).toBeCloseTo(-r[0], 6)
    expect(l[1]).toBeCloseTo(r[1], 6)
    expect(l[2]).toBeCloseTo(r[2], 6)
  })

  it('brows sit above the eyes, lips below them', () => {
    const eyeY = by('eyeL-sclera')[1]
    expect(by('browL')[1]).toBeGreaterThan(eyeY)
    expect(by('lip')[1]).toBeLessThan(eyeY)
  })

  it('the iris sits in front of the sclera', () => {
    expect(by('eyeL-iris')[2]).toBeGreaterThan(by('eyeL-sclera')[2])
  })

  it('every feature is on the front hemisphere (z > 0)', () => {
    for (const f of feats) expect(f.pos[2]).toBeGreaterThan(0)
  })
})

describe('libraries', () => {
  it('expose styles + colours with labels', () => {
    expect(HAIRSTYLES.length).toBeGreaterThan(4)
    expect(HAIR_COLORS.length).toBeGreaterThan(4)
    for (const s of HAIRSTYLES) expect(HAIRSTYLE_LABELS[s]).toBeTruthy()
    for (const c of HAIR_COLORS) expect(c.hex).toBeGreaterThanOrEqual(0)
  })
})
