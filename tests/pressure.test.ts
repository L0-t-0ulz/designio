import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { pressureColor } from '../src/renderer/fabric/pressure'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import type { FabricParams } from '../src/renderer/cloth/fabricPresets'

const fabric: FabricParams = {
  mass: 0.3,
  stretchCompliance: 1e-6,
  bendCompliance: 1e-3,
  damping: 0.02,
  friction: 0.5,
  aero: 0.2,
  color: 0x808080
}

/** A flat nx×ny grid in the XY plane, top row pinned. */
function makeGrid(nx: number, ny: number, pin = true): { pos: Float32Array; solver: XPBDSolver } {
  const pos = new Float32Array(nx * ny * 3)
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const k = (iy * nx + ix) * 3
    pos[k] = ix * 0.05
    pos[k + 1] = 1 - iy * 0.05
  }
  const pinned = pin ? Array.from({ length: nx }, (_, i) => i) : []
  return { pos, solver: new XPBDSolver(nx, ny, pos, fabric, { wrapX: false, pinned }) }
}

describe('pressure / contact fit map', () => {
  it('colour ramp: no contact → blue, light → cyan, hard → red; clamped + in range', () => {
    const [zr, , zb] = pressureColor(0)
    expect(zb).toBeGreaterThan(zr) // blue dominates when hanging free
    const [lr, lg, lb] = pressureColor(0.001)
    expect(lg).toBeGreaterThan(lr) // cyan-green mid ramp
    expect(lb).toBeGreaterThan(lr)
    const [hr, hg, hb] = pressureColor(0.003)
    expect(hr).toBeGreaterThan(hg) // red dominates when pressing hard
    expect(hr).toBeGreaterThan(hb)
    expect(pressureColor(99)).toEqual(pressureColor(0.003)) // clamps at the hot end
    expect(pressureColor(-1)).toEqual(pressureColor(0)) // no negative pressure
    for (const t of [0, 0.0006, 0.0014, 0.002, 0.003]) for (const c of pressureColor(t)) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })

  it('is monotonic along the red channel as pressure rises', () => {
    let prev = -1
    for (const p of [0, 0.0008, 0.0016, 0.0024, 0.003]) {
      const [r] = pressureColor(p)
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
  })

  it('solver: zero contact before any step, and zero for cloth hanging free', () => {
    const { solver } = makeGrid(5, 5)
    const out = new Float32Array(solver.count)
    solver.contactPressure(out)
    for (const v of out) expect(v).toBe(0) // untouched buffer before stepping

    solver.colliders = [] // nothing to collide with
    for (let i = 0; i < 30; i++) solver.step(1 / 60)
    solver.contactPressure(out)
    for (const v of out) expect(v).toBe(0) // free-hanging cloth never contacts
  })

  it('solver: particles resting on a capsule register contact; free ones stay zero', () => {
    const nx = 5
    const ny = 5
    const { solver } = makeGrid(nx, ny)
    // a fat horizontal capsule right under the cloth's lower half
    solver.colliders = [
      { a: new THREE.Vector3(-0.2, 0.85, 0), b: new THREE.Vector3(0.4, 0.85, 0), radius: 0.06 }
    ]
    for (let i = 0; i < 60; i++) solver.step(1 / 60)
    const out = new Float32Array(solver.count)
    solver.contactPressure(out)
    // the bottom rows drape onto the capsule → contact; the pinned top row hangs free
    const bottom = Array.from({ length: nx }, (_, ix) => out[(ny - 1) * nx + ix])
    expect(Math.max(...bottom)).toBeGreaterThan(0)
    for (let ix = 0; ix < nx; ix++) expect(out[ix]).toBe(0) // pinned top row: skipped by collision
  })

  it('solver: a deeper (tighter) squeeze reads higher pressure than a grazing contact', () => {
    const make = (radius: number): number => {
      const { solver } = makeGrid(5, 5)
      solver.colliders = [{ a: new THREE.Vector3(0.1, 0.9, -0.01), b: new THREE.Vector3(0.1, 0.9, 0.01), radius }]
      for (let i = 0; i < 60; i++) solver.step(1 / 60)
      const out = new Float32Array(solver.count)
      solver.contactPressure(out)
      return Math.max(...out)
    }
    const grazing = make(0.02) // barely touches the cloth plane
    const pressing = make(0.08) // bulges well through it
    expect(pressing).toBeGreaterThan(grazing)
  })
})
