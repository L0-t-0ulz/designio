import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { XPBDSolver, contactNormalVelocity } from '../src/renderer/cloth/XPBDSolver'
import { fillFlatGrid } from '../src/renderer/cloth/ClothMesh'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { closestPointOnSegment, type Capsule } from '../src/renderer/avatar/colliders'

describe('pressure loft (trapped-air puff)', () => {
  it('inflates a closed tube outward (correct normal sign), stably', () => {
    const nx = 16
    const ny = 8
    const R0 = 0.15
    const pos = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = (ix / nx) * Math.PI * 2
        const k = (iy * nx + ix) * 3
        pos[k] = Math.cos(a) * R0
        pos[k + 1] = 1.5 - iy * 0.05
        pos[k + 2] = Math.sin(a) * R0
      }
    }
    const params = { stretchCompliance: 3e-3, bendCompliance: 5e-3, mass: 0.3, damping: 0.8, friction: 0, aero: 0, color: 0 }
    const solver = new XPBDSolver(nx, ny, pos, params, { pinned: [], wrapX: true })
    solver.colliders = []
    solver.gravity.set(0, 0, 0) // isolate the pressure
    solver.pressure = 8
    const meanRadius = (): number => {
      let s = 0
      for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) { const k = (iy * nx + ix) * 3; s += Math.hypot(pos[k], pos[k + 2]) }
      return s / (nx * ny)
    }
    const r0 = meanRadius()
    for (let i = 0; i < 40; i++) solver.step(1 / 60)
    const r1 = meanRadius()
    expect(r1).toBeGreaterThan(r0) // lofted outward, not collapsed inward
    expect(Number.isFinite(r1)).toBe(true)
    expect(r1).toBeLessThan(R0 * 3) // capped by the stretch constraints — no runaway balloon
  })

  it('does nothing when pressure is 0 (opt-in, no regression)', () => {
    const nx = 12
    const ny = 6
    const R0 = 0.15
    const pos = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const a = (ix / nx) * Math.PI * 2
        const k = (iy * nx + ix) * 3
        pos[k] = Math.cos(a) * R0
        pos[k + 1] = 1.5 - iy * 0.05
        pos[k + 2] = Math.sin(a) * R0
      }
    }
    const params = { stretchCompliance: 3e-3, bendCompliance: 5e-3, mass: 0.3, damping: 0.8, friction: 0, aero: 0, color: 0 }
    const solver = new XPBDSolver(nx, ny, pos, params, { pinned: [], wrapX: true })
    solver.colliders = []
    solver.gravity.set(0, 0, 0)
    // pressure stays 0
    const meanRadius = (): number => {
      let s = 0
      for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) { const k = (iy * nx + ix) * 3; s += Math.hypot(pos[k], pos[k + 2]) }
      return s / (nx * ny)
    }
    const r0 = meanRadius()
    for (let i = 0; i < 30; i++) solver.step(1 / 60)
    expect(meanRadius()).toBeCloseTo(r0, 4) // unchanged
  })
})

describe('contactNormalVelocity (inelastic contact)', () => {
  it('kills the inbound (into-surface) normal component', () => {
    expect(contactNormalVelocity(-2, 0.3)).toBe(0)
    expect(contactNormalVelocity(-0.001, 0.3)).toBe(0)
  })

  it('scales the outbound (separating) component by the restitution', () => {
    expect(contactNormalVelocity(2, 0.3)).toBeCloseTo(0.6, 10)
    expect(contactNormalVelocity(2, 0)).toBe(0) // fully inelastic — no bounce
    expect(contactNormalVelocity(2, 1)).toBe(2) // fully elastic — the old behaviour
  })

  it('is monotonic in restitution and never exceeds the input', () => {
    expect(contactNormalVelocity(3, 0.5)).toBeGreaterThan(contactNormalVelocity(3, 0.2))
    expect(contactNormalVelocity(3, 0.5)).toBeLessThanOrEqual(3)
  })
})

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

describe('XPBDSolver body-pin', () => {
  // A 3x2 grid; pin the top row (0,1,2). Rows at z=0 (top) and z=0.1.
  const makeGrid = (): { positions: Float32Array; solver: XPBDSolver } => {
    const nx = 3
    const ny = 2
    const positions = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++)
      for (let ix = 0; ix < nx; ix++) {
        const k = (iy * nx + ix) * 3
        positions[k] = ix * 0.1
        positions[k + 1] = 1
        positions[k + 2] = iy * 0.1
      }
    const solver = new XPBDSolver(nx, ny, positions, FABRICS.denim, { pinned: [0, 1, 2] })
    return { positions, solver }
  }

  it('pinned particles follow a moving anchor', () => {
    const { positions, solver } = makeGrid()
    solver.gravity.set(0, 0, 0) // isolate the pin motion
    solver.reset()
    solver.bindPins(new THREE.Matrix4()) // bind at identity
    solver.setAnchor(new THREE.Matrix4().makeTranslation(0, 0, 0.5)) // shift the body +0.5 z
    solver.step(1 / 60)
    for (let i = 0; i < 3; i++) {
      expect(positions[i * 3 + 2]).toBeCloseTo(0.5, 5) // top row moved +0.5 in z
      expect(positions[i * 3]).toBeCloseTo(i * 0.1, 5) // x unchanged
      expect(positions[i * 3 + 1]).toBeCloseTo(1, 5) // y unchanged
    }
  })

  it('binds separate pin groups to their own anchors (sleeve: shoulder + elbow)', () => {
    const { positions, solver } = makeGrid()
    solver.gravity.set(0, 0, 0)
    solver.reset()
    solver.bindPinGroups([
      { idx: [0], anchor: new THREE.Matrix4() },
      { idx: [2], anchor: new THREE.Matrix4() }
    ])
    solver.setPinAnchors([new THREE.Matrix4().makeTranslation(0.3, 0, 0), new THREE.Matrix4().makeTranslation(0, 0.4, 0)])
    solver.step(1 / 60)
    expect(positions[0]).toBeCloseTo(0.3, 5) // group A → +0.3 x
    expect(positions[2 * 3 + 1]).toBeCloseTo(1.4, 5) // group B → +0.4 y
  })

  it('with no anchor the pins stay fixed in space (unchanged behaviour)', () => {
    const { positions, solver } = makeGrid()
    solver.reset()
    for (let i = 0; i < 30; i++) solver.step(1 / 60) // gravity pulls, pins hold
    for (let i = 0; i < 3; i++) {
      expect(positions[i * 3 + 1]).toBeCloseTo(1, 6) // top row never falls
      expect(positions[i * 3 + 2]).toBeCloseTo(0, 6)
    }
  })
})

describe('XPBDSolver aerodynamic drag', () => {
  // A free, horizontal sheet (normal ≈ +y) falling under gravity — aero opposes the
  // broadside (vertical) motion, so a high-aero fabric floats and stays higher.
  const dropSheet = (aero: number): Float32Array => {
    const nx = 4
    const ny = 4
    const positions = new Float32Array(nx * ny * 3)
    for (let iy = 0; iy < ny; iy++)
      for (let ix = 0; ix < nx; ix++) {
        const k = (iy * nx + ix) * 3
        positions[k] = ix * 0.1
        positions[k + 1] = 1
        positions[k + 2] = iy * 0.1
      }
    const solver = new XPBDSolver(nx, ny, positions, { ...FABRICS.silk, aero })
    for (let i = 0; i < 30; i++) solver.step(1 / 60)
    return positions
  }
  const avgY = (p: Float32Array): number => {
    let y = 0
    for (let k = 1; k < p.length; k += 3) y += p[k]
    return y / (p.length / 3)
  }

  it('a high-aero (light) fabric floats — falls less than a low-aero one', () => {
    expect(avgY(dropSheet(12))).toBeGreaterThan(avgY(dropSheet(0)) + 0.1)
  })
})

describe('XPBDSolver collision', () => {
  it('pushes a particle inside a sphere out to its surface (+ a garment-thickness skin)', () => {
    const center = new THREE.Vector3(0, 0.95, 0)
    const sphere: Capsule = { a: center.clone(), b: center.clone(), radius: 0.1 }
    const positions = new Float32Array([0, 1.0, 0]) // 0.05 above center => inside
    const solver = new XPBDSolver(1, 1, positions, FABRICS.cotton)
    solver.gravity.set(0, 0, 0)
    solver.colliders = [sphere]

    solver.step(1 / 60)

    // cloth rests a garment-thickness (bodySkin) off the capsule surface, not on it
    const R = 0.1 + solver.bodySkin
    const p = new THREE.Vector3(positions[0], positions[1], positions[2])
    expect(p.distanceTo(center)).toBeCloseTo(R, 4)
    expect(positions[1]).toBeCloseTo(0.95 + R, 4) // pushed straight up
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

  it('reports `advanced` while moving and stops once it sleeps (gates the mesh refresh)', () => {
    const { solver } = drape()
    solver.step(1 / 60)
    expect(solver.advanced).toBe(true) // falling/draping → mesh needs a refresh
    for (let i = 0; i < 800; i++) solver.step(1 / 60) // settle to a dead stop
    expect(solver.settled).toBe(true)
    expect(solver.advanced).toBe(false) // asleep → skip the per-frame recompute
    solver.wind.set(8, 0, 0)
    solver.wake()
    solver.step(1 / 60)
    expect(solver.advanced).toBe(true) // woken → refresh again
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

  it('force-settles after a few seconds even if it never stops moving', () => {
    // A single free-falling particle (no ground/collider) keeps speeding up, so it
    // never velocity-sleeps — the force timeout must still freeze it (static at default).
    const positions = new Float32Array([0, 2, 0])
    const solver = new XPBDSolver(1, 1, positions, FABRICS.cotton)
    solver.groundY = -1e6 // no ground — only the stability box can stop it
    for (let i = 0; i < 320; i++) solver.step(1 / 60) // past the ~5 s force-sleep
    expect(positions[1]).toBeLessThan(1) // it fell well below its start (y=2)
    const snap = positions.slice()
    for (let i = 0; i < 30; i++) solver.step(1 / 60)
    let maxDelta = 0
    for (let k = 0; k < positions.length; k++) maxDelta = Math.max(maxDelta, Math.abs(positions[k] - snap[k]))
    expect(maxDelta).toBe(0) // force-froze to a dead stop
  })
})
