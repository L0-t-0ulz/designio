import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

const visibleMeshes = (root: THREE.Object3D): number => {
  let n = 0
  root.traverse((o) => {
    // effective visibility: the object and every ancestor up to root
    if (!(o as THREE.Mesh).isMesh) return
    let v = true
    for (let p: THREE.Object3D | null = o; p && p !== root.parent; p = p.parent) if (!p.visible) v = false
    if (v) n++
  })
  return n
}

describe('ghost mannequin (product shot)', () => {
  it('hides every body mesh but keeps colliders + measurements fully live', () => {
    const mann = buildMannequin()
    expect(visibleMeshes(mann.group)).toBeGreaterThan(0) // the body renders normally
    const collidersBefore = mann.colliders.map((c) => ({ r: c.radius, ax: c.a.x, ay: c.a.y }))
    const chest = mann.measurements.chestR

    mann.setGhost(true)
    expect(visibleMeshes(mann.group)).toBe(0) // nothing of the body renders…
    expect(mann.measurements.chestR).toBe(chest) // …but the garment's world is untouched
    mann.colliders.forEach((c, i) => {
      expect(c.radius).toBe(collidersBefore[i].r)
      expect(c.a.x).toBe(collidersBefore[i].ax)
      expect(c.a.y).toBe(collidersBefore[i].ay)
    })

    mann.setGhost(false)
    expect(visibleMeshes(mann.group)).toBeGreaterThan(0) // back to normal
  })

  it('survives a body-mode switch while ghosted', () => {
    const mann = buildMannequin()
    mann.setGhost(true)
    mann.setBodyMode(false) // procedural body (the GLB may not exist headless)
    expect(visibleMeshes(mann.group)).toBe(0) // mode switch must not resurrect the body
    mann.setGhost(false)
    expect(visibleMeshes(mann.group)).toBeGreaterThan(0)
  })
})
