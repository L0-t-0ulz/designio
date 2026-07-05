import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { BodyCollider } from '../src/renderer/cloth/BodyCollider'
import { BodyMesh, type BodyPart } from '../src/renderer/avatar/BodyMesh'

/** Distance of a point from the origin. */
const rad = (v: THREE.Vector3): number => Math.hypot(v.x, v.y, v.z)

describe('BodyCollider — signed distance on a known sphere', () => {
  const R = 0.5
  const build = (flipNormals: boolean): BodyCollider => {
    const geom = new THREE.IcosahedronGeometry(R, 4) // fine, watertight, outward normals
    if (flipNormals) {
      // Simulate a source that winds its faces inward (like MarchingCubes): the
      // collider must auto-detect and correct this.
      const n = geom.getAttribute('normal') as THREE.BufferAttribute
      for (let i = 0; i < n.array.length; i++) (n.array as Float32Array)[i] *= -1
    }
    const bc = new BodyCollider()
    bc.buildFromGeometry(geom)
    return bc
  }

  for (const flip of [false, true]) {
    describe(flip ? 'inward-wound source (auto-corrected)' : 'outward-wound source', () => {
      const bc = build(flip)

      it('classifies the centre as inside and a far point as outside', () => {
        expect(bc.signedDistance(0, 0, 0)).toBeLessThan(0)
        expect(bc.signedDistance(2, 0, 0)).toBeGreaterThan(0)
      })

      it('signed distance tracks the true distance to the surface (±mesh error)', () => {
        // a point 0.1 outside along +x
        expect(bc.signedDistance(R + 0.1, 0, 0)).toBeCloseTo(0.1, 1)
        // a point 0.1 inside along +x
        expect(bc.signedDistance(R - 0.1, 0, 0)).toBeCloseTo(-0.1, 1)
      })

      it('resolve() pushes an interior point out to radius R + skin', () => {
        const skin = 0.02
        const out = new THREE.Vector3()
        const r = bc.resolve(0.1, 0, 0, skin, out)
        expect(r).not.toBeNull()
        expect(rad(out)).toBeGreaterThan(R) // pushed outside the sphere
        expect(rad(out)).toBeCloseTo(R + skin, 1)
      })

      it('resolve() leaves a point well outside untouched (returns null)', () => {
        const out = new THREE.Vector3()
        expect(bc.resolve(1.5, 0, 0, 0.02, out)).toBeNull()
      })

      it('resolve() catches a point just inside and moves it outward', () => {
        const out = new THREE.Vector3()
        const r = bc.resolve(R - 0.01, 0, 0, 0.02, out)
        expect(r).not.toBeNull()
        expect(rad(out)).toBeGreaterThan(R - 0.01) // moved outward, off the surface
      })
    })
  }
})

describe('BodyCollider — real metaball body (MarchingCubes extraction)', () => {
  // A simple upright torso + head blob, matching how Mannequin drives BodyMesh.
  const parts: BodyPart[] = [
    { a: new THREE.Vector3(0, 0.9, 0), b: new THREE.Vector3(0, 1.4, 0), radiusA: 0.16, radiusB: 0.15 },
    { a: new THREE.Vector3(0, 1.5, 0), b: new THREE.Vector3(0, 1.6, 0), radiusA: 0.09, radiusB: 0.09, cap: 'head' }
  ]

  it('extracts a watertight surface whose interior classifies as inside', () => {
    const mesh = new BodyMesh(new THREE.MeshStandardMaterial())
    mesh.rebuild(parts)
    const bc = new BodyCollider()
    bc.buildFromMarchingCubes(mesh.object)
    expect(bc.ready).toBe(true)

    // Deep inside the torso → inside (negative).
    expect(bc.signedDistance(0, 1.15, 0)).toBeLessThan(0)
    // Well away from the body → outside (positive).
    expect(bc.signedDistance(0.6, 1.15, 0)).toBeGreaterThan(0)
  })

  it('resolve() ejects a particle sitting inside the torso to just outside the skin', () => {
    const mesh = new BodyMesh(new THREE.MeshStandardMaterial())
    mesh.rebuild(parts)
    const bc = new BodyCollider()
    bc.buildFromMarchingCubes(mesh.object)

    const skin = 0.01
    const out = new THREE.Vector3()
    const r = bc.resolve(0.05, 1.15, 0, skin, out) // just off-centre, inside the torso
    expect(r).not.toBeNull()
    // The ejected point must now read as (just) outside the surface.
    expect(bc.signedDistance(out.x, out.y, out.z)).toBeGreaterThan(-1e-3)
    // …and further from the body axis than where it started.
    expect(Math.hypot(out.x, out.z)).toBeGreaterThan(0.05)
  })
})
