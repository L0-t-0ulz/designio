import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { fillFlatGrid } from '../src/renderer/cloth/ClothMesh'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { closestPointOnSegment, type Capsule } from '../src/renderer/avatar/colliders'

describe('closestPointOnSegment', () => {
  const out = new THREE.Vector3()
  const a = new THREE.Vector3(-1, 0, 0)
  const b = new THREE.Vector3(1, 0, 0)

  it('projects onto the interior of the segment', () => {
    closestPointOnSegment(new THREE.Vector3(0, 5, 0), a, b, out)
    expect(out.x).toBeCloseTo(0, 6)
    expect(out.y).toBeCloseTo(0, 6)
  })

  it('clamps beyond the endpoints', () => {
    closestPointOnSegment(new THREE.Vector3(9, 1, 0), a, b, out)
    expect(out.x).toBeCloseTo(1, 6)
    closestPointOnSegment(new THREE.Vector3(-9, 1, 0), a, b, out)
    expect(out.x).toBeCloseTo(-1, 6)
  })
})

describe('XPBDSolver distance constraint', () => {
  it('pulls two stretched particles back to rest length', () => {
    const rest = 0.05
    const positions = new Float32Array([0, 1, 0, rest, 1, 0]) // rest measured here
    const solver = new XPBDSolver(2, 1, positions, FABRICS.denim)
    solver.gravity.set(0, 0, 0)

    // stretch them apart, then let the constraint pull them back
    positions[3] = 0.2
    solver.reset()
    for (let i = 0; i < 5; i++) solver.step(1 / 60)

    const dx = positions[0] - positions[3]
    const dy = positions[1] - positions[4]
    const dz = positions[2] - positions[5]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    expect(dist).toBeCloseTo(rest, 3)
  })
})

describe('XPBDSolver collision', () => {
  it('pushes a particle inside a sphere out to its surface', () => {
    const center = new THREE.Vector3(0, 0.95, 0)
    const sphere: Capsule = { a: center.clone(), b: center.clone(), radius: 0.1 }
    const positions = new Float32Array([0, 1.0, 0]) // 0.05 above center => inside
    const solver = new XPBDSolver(1, 1, positions, FABRICS.cotton)
    solver.gravity.set(0, 0, 0)
    solver.colliders = [sphere]

    solver.step(1 / 60)

    const p = new THREE.Vector3(positions[0], positions[1], positions[2])
    expect(p.distanceTo(center)).toBeCloseTo(0.1, 4)
    expect(positions[1]).toBeCloseTo(1.05, 4) // pushed straight up
  })
})

describe('XPBDSolver drape (integration)', () => {
  it('drapes a panel over a sphere without penetrating it and settles', () => {
    const nx = 16
    const ny = 16
    const spacing = 0.04
    const center = new THREE.Vector3(0, 1.0, 0)
    const sphere: Capsule = { a: center.clone(), b: center.clone(), radius: 0.25 }

    const positions = new Float32Array(nx * ny * 3)
    const spawn = new THREE.Vector3(-((nx - 1) * spacing) / 2, 1.45, -((ny - 1) * spacing) / 2)
    fillFlatGrid(positions, nx, ny, spacing, spawn)

    const solver = new XPBDSolver(nx, ny, positions, FABRICS.cotton)
    solver.colliders = [sphere]

    for (let i = 0; i < 200; i++) solver.step(1 / 60)

    let minDistToCenter = Infinity
    let minY = Infinity
    for (let k = 0; k < nx * ny; k++) {
      const x = positions[k * 3]
      const y = positions[k * 3 + 1]
      const z = positions[k * 3 + 2]
      expect(Number.isFinite(x + y + z)).toBe(true) // no NaN blow-ups
      const d = Math.hypot(x - center.x, y - center.y, z - center.z)
      minDistToCenter = Math.min(minDistToCenter, d)
      minY = Math.min(minY, y)
    }

    // never tunnels meaningfully into the body
    expect(minDistToCenter).toBeGreaterThan(sphere.radius - 0.02)
    // and it actually fell and draped (lower than where it spawned)
    expect(minY).toBeLessThan(spawn.y - 0.1)
  })
})

describe('XPBDSolver rest / sleep', () => {
  const drape = (): { solver: XPBDSolver; positions: Float32Array } => {
    const nx = 14
    const ny = 14
    const spacing = 0.04
    const center = new THREE.Vector3(0, 1.0, 0)
    const sphere: Capsule = { a: center.clone(), b: center.clone(), radius: 0.25 }
    const positions = new Float32Array(nx * ny * 3)
    const spawn = new THREE.Vector3(-((nx - 1) * spacing) / 2, 1.45, -((ny - 1) * spacing) / 2)
    fillFlatGrid(positions, nx, ny, spacing, spawn)
    const solver = new XPBDSolver(nx, ny, positions, FABRICS.cotton)
    solver.colliders = [sphere]
    return { solver, positions }
  }

  it('settles to a dead stop with no wind (garment stays still at default)', () => {
    const { solver, positions } = drape()
    for (let i = 0; i < 800; i++) solver.step(1 / 60) // fall, drape, then sleep
    const snap = positions.slice()
    for (let i = 0; i < 30; i++) solver.step(1 / 60)
    let maxDelta = 0
    for (let k = 0; k < positions.length; k++) maxDelta = Math.max(maxDelta, Math.abs(positions[k] - snap[k]))
    expect(maxDelta).toBe(0) // asleep → not a single particle drifts
  })

  it('wakes back up when the wind picks up', () => {
    const { solver, positions } = drape()
    for (let i = 0; i < 800; i++) solver.step(1 / 60)
    const snap = positions.slice()
    solver.wind.set(8, 0, 0)
    solver.wake()
    for (let i = 0; i < 10; i++) solver.step(1 / 60)
    let moved = 0
    for (let k = 0; k < positions.length; k++) moved = Math.max(moved, Math.abs(positions[k] - snap[k]))
    expect(moved).toBeGreaterThan(1e-4)
  })
})
