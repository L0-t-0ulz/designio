import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { FIT_PADDING, MIN_FIT_DISTANCE, boundingRadius, fitDistance, fitPose, visibleBounds } from '../src/renderer/studio/zoomToFit'

const pose = (over: Partial<{ azimuth: number; polar: number; distance: number; target: [number, number, number] }> = {}) => ({
  azimuth: 0.7,
  polar: 1.2,
  distance: 3,
  target: [0, 1, 0] as [number, number, number],
  ...over
})

const boxMesh = (size: number, at: [number, number, number] = [0, 0, 0], visible = true): THREE.Mesh => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial())
  m.position.set(...at)
  m.visible = visible
  return m
}

describe('fit distance', () => {
  it('a bigger subject needs more room', () => {
    expect(fitDistance(2, 45, 1)).toBeGreaterThan(fitDistance(1, 45, 1))
  })

  it('scales linearly with the subject', () => {
    expect(fitDistance(2, 45, 1)).toBeCloseTo(fitDistance(1, 45, 1) * 2, 6)
  })

  it('matches the vertical-fit formula on a square viewport', () => {
    const vFov = (45 * Math.PI) / 180
    expect(fitDistance(1, 45, 1)).toBeCloseTo((1 / Math.sin(vFov / 2)) * FIT_PADDING, 6)
  })

  it('a narrower field of view needs more room', () => {
    expect(fitDistance(1, 20, 1)).toBeGreaterThan(fitDistance(1, 60, 1))
  })

  it('a tall narrow viewport pulls back further — the sides crop first', () => {
    // aspect < 1 means the horizontal field is the binding constraint
    expect(fitDistance(1, 45, 0.5)).toBeGreaterThan(fitDistance(1, 45, 1))
  })

  it('a wide viewport is bound by height, so widening it changes nothing', () => {
    expect(fitDistance(1, 45, 2)).toBeCloseTo(fitDistance(1, 45, 1), 6)
    expect(fitDistance(1, 45, 4)).toBeCloseTo(fitDistance(1, 45, 1), 6)
  })

  it('padding leaves breathing room rather than touching the frame edge', () => {
    expect(fitDistance(1, 45, 1, 1)).toBeLessThan(fitDistance(1, 45, 1, FIT_PADDING))
  })

  it('never puts the camera on top of its own target', () => {
    for (const r of [0, 1e-9, 0.0001]) expect(fitDistance(r, 45, 1)).toBeGreaterThanOrEqual(MIN_FIT_DISTANCE)
    expect(fitDistance(-5, 45, 1)).toBeGreaterThanOrEqual(MIN_FIT_DISTANCE)
  })

  it('survives a garbage aspect or field of view', () => {
    for (const a of [0, -1, NaN, Infinity]) expect(Number.isFinite(fitDistance(1, 45, a))).toBe(true)
    for (const f of [0, -30]) expect(Number.isFinite(fitDistance(1, f, 1))).toBe(true)
  })
})

describe('bounding radius', () => {
  it('is half the diagonal, so the subject fits from any angle', () => {
    expect(boundingRadius(new THREE.Vector3(2, 0, 0))).toBeCloseTo(1)
    expect(boundingRadius(new THREE.Vector3(2, 2, 2))).toBeCloseTo(Math.sqrt(12) / 2)
  })
})

describe('fit pose', () => {
  it('keeps the angle you were looking from — a fit is a zoom, not a camera move', () => {
    const p = fitPose(new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1)), pose(), 45, 1)!
    expect(p.azimuth).toBe(0.7)
    expect(p.polar).toBe(1.2)
  })

  it('centres on the subject, not the origin', () => {
    const box = new THREE.Box3(new THREE.Vector3(2, 1, 0), new THREE.Vector3(4, 3, 0))
    expect(fitPose(box, pose(), 45, 1)!.target).toEqual([3, 2, 0])
  })

  it('changes the distance to fit', () => {
    const box = new THREE.Box3(new THREE.Vector3(-5, -5, -5), new THREE.Vector3(5, 5, 5))
    expect(fitPose(box, pose(), 45, 1)!.distance).toBeGreaterThan(3)
  })

  it('declines an empty box rather than flying to the origin', () => {
    expect(fitPose(new THREE.Box3(), pose(), 45, 1)).toBeNull()
  })

  it('declines a box with non-finite bounds', () => {
    const bad = new THREE.Box3(new THREE.Vector3(NaN, 0, 0), new THREE.Vector3(1, 1, 1))
    expect(fitPose(bad, pose(), 45, 1)).toBeNull()
  })
})

describe('visible bounds', () => {
  it('measures a mesh in world space, following its transform', () => {
    const box = visibleBounds([boxMesh(2, [10, 0, 0])])
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(10)
  })

  it('covers every visible mesh', () => {
    const box = visibleBounds([boxMesh(2, [-4, 0, 0]), boxMesh(2, [4, 0, 0])])
    expect(box.min.x).toBeCloseTo(-5)
    expect(box.max.x).toBeCloseTo(5)
  })

  it('ignores a hidden mesh, so a hidden layer cannot drag the framing sideways', () => {
    const box = visibleBounds([boxMesh(2, [0, 0, 0]), boxMesh(2, [100, 0, 0], false)])
    expect(box.max.x).toBeCloseTo(1)
  })

  it('ignores a hidden group, children and all', () => {
    const group = new THREE.Group()
    group.add(boxMesh(2, [100, 0, 0]))
    group.visible = false
    const box = visibleBounds([boxMesh(2), group])
    expect(box.max.x).toBeCloseTo(1)
  })

  it('reaches meshes nested under a visible group', () => {
    const group = new THREE.Group()
    group.position.set(5, 0, 0)
    group.add(boxMesh(2))
    expect(visibleBounds([group]).getCenter(new THREE.Vector3()).x).toBeCloseTo(5)
  })

  it('is empty when there is nothing to measure', () => {
    expect(visibleBounds([]).isEmpty()).toBe(true)
    expect(visibleBounds([new THREE.Group()]).isEmpty()).toBe(true)
  })

  it('skips a mesh with no positions rather than throwing', () => {
    const empty = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial())
    expect(visibleBounds([empty]).isEmpty()).toBe(true)
  })
})
