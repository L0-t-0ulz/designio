import { describe, it, expect } from 'vitest'
import { ClothWorld } from '../src/renderer/cloth/ClothWorld'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

// A stand-in body that pushes any queried particle out +0.1 along +y, so the
// contact surface normal is (0,1,0) — lets us reason about tangential vs normal
// velocity response without a full BVH mesh collider.
function flatBodyPushY(): unknown {
  return {
    ready: true,
    resolve: (px: number, py: number, pz: number) => ({ x: px, y: py + 0.1, z: pz })
  }
}

function params(friction: number): FabricParams {
  return { stretchCompliance: 3e-3, bendCompliance: 5e-3, mass: 0.3, damping: 0.8, friction, aero: 0, color: 0 }
}

// Build a one-particle world at the origin with a chosen velocity, run the body
// collision response once (solveBody is private — call it directly in isolation).
function responseFor(friction: number, vel: number[]): Float32Array {
  const world = new ClothWorld(params(friction))
  world.positions = new Float32Array([0, 0, 0])
  world.vel = new Float32Array(vel)
  world.invMass = new Float32Array([1])
  world.count = 1
  world.bodyCollider = flatBodyPushY() as never
  ;(world as unknown as { solveBody(): void }).solveBody()
  return world.vel
}

describe('ClothWorld.solveBody — body friction / cling (mirrors XPBDSolver.solveBody)', () => {
  it('damps the tangential slide by the fabric friction — a grippy knit clings to the body', () => {
    const v = responseFor(0.5, [1, 0, 0]) // purely tangential to the (0,1,0) contact normal
    expect(v[0]).toBeCloseTo(0.5, 6) // 1 × (1 − friction)
    expect(v[1]).toBeCloseTo(0, 6)
    expect(v[2]).toBeCloseTo(0, 6)
  })

  it('a frictionless fabric keeps its full tangential velocity — satin slides freely', () => {
    const v = responseFor(0, [1, 0, 0])
    expect(v[0]).toBeCloseTo(1, 6)
  })

  it('cancels inward normal velocity but lets an outward one leave (no sticking, no tunnelling)', () => {
    expect(responseFor(0, [0, -2, 0])[1]).toBeCloseTo(0, 6) // driving into the body → stopped at the surface
    expect(responseFor(0, [0, 3, 0])[1]).toBeCloseTo(3, 6) // lifting off → unimpeded
  })

  it('splits a mixed velocity: inward normal removed, tangential damped, outward normal kept', () => {
    const v = responseFor(0.5, [1, 1, 0]) // outward normal (+y) plus a tangential slide (+x)
    expect(v[0]).toBeCloseTo(0.5, 6) // tangential × keep
    expect(v[1]).toBeCloseTo(1, 6) // outward normal preserved in full
  })
})
