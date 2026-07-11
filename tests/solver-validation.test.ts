import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { buildTubeGarment } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS, type FabricParams } from '../src/renderer/cloth/fabricPresets'

const mann = buildMannequin()

/** Build + drape a garment body tube over the mesh body-collider for `steps`. */
function drape(id: string, steps: number): { solver: XPBDSolver; positions: Float32Array } {
  const def = getGarment(id)
  const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
  const build = buildTubeGarment(spec)
  const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
  solver.colliders = mann.colliders
  solver.bodyCollider = mann.bodyCollider
  for (let i = 0; i < steps; i++) solver.step(1 / 60)
  return { solver, positions: build.positions }
}

describe('rest-state settle (the "hangs perfectly still" promise)', () => {
  it('a draped garment reaches a dead stop (sleep) within a bounded time', () => {
    const def = getGarment('dress')
    const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
    const build = buildTubeGarment(spec)
    const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
    solver.colliders = mann.colliders
    solver.bodyCollider = mann.bodyCollider
    let settledAt = -1
    for (let i = 0; i < 400; i++) {
      solver.step(1 / 60)
      if (solver.settled) {
        settledAt = i
        break
      }
    }
    expect(settledAt).toBeGreaterThan(0)
    expect(settledAt).toBeLessThan(400) // windless + still body ⇒ it must go to sleep
  }, 30000)
})

describe('golden-drape determinism (regression-ready)', () => {
  it('draping the same garment twice is bit-identical (no RNG / wall-clock in the sim)', () => {
    const a = drape('dress', 160).positions
    const b = drape('dress', 160).positions
    expect(a.length).toBe(b.length)
    let maxDiff = 0
    for (let i = 0; i < a.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]))
    expect(maxDiff).toBe(0)
  }, 30000)
})

describe('constraint-residual divergence guard', () => {
  it('no stretch constraint diverges — the settled residual stays finite + bounded', () => {
    // maxResidual() is the worst |len − rest| over the distance constraints. A healthy
    // settle keeps it modest (a seam/pin edge is the outlier, and it varies a little
    // across platforms); a diverging solve would send it to metres/∞. Guards the solve
    // the same way the energy/NaN checks do — finite + well under the blow-up scale.
    for (const id of ['dress', 'gown']) {
      const { solver } = drape(id, 180)
      const r = solver.maxResidual()
      expect(Number.isFinite(r), `${id} residual non-finite`).toBe(true)
      expect(r, `${id} residual diverged to ${r} m`).toBeLessThan(3)
    }
  }, 30000)
})

describe('cross-resolution drape invariance', () => {
  it('a coarser vs finer sim of the same garment agree on gross size (resolution refines, not changes)', () => {
    // Build the same garment tube at two ring counts and drape both; the overall
    // extent (length/width envelope) must match within tolerance — raising resolution
    // sharpens folds, it must not move the garment.
    const grossExtent = (ringScale: number): [number, number, number] => {
      const def = getGarment('dress')
      const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
      spec.rings = Math.max(6, Math.round(spec.rings * ringScale)) // re-resolution
      const build = buildTubeGarment(spec)
      const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
      solver.colliders = mann.colliders
      solver.bodyCollider = mann.bodyCollider
      for (let i = 0; i < 200; i++) solver.step(1 / 60)
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
      const p = build.positions
      for (let k = 0; k < p.length; k += 3) {
        minX = Math.min(minX, p[k]); maxX = Math.max(maxX, p[k])
        minY = Math.min(minY, p[k + 1]); maxY = Math.max(maxY, p[k + 1])
        minZ = Math.min(minZ, p[k + 2]); maxZ = Math.max(maxZ, p[k + 2])
      }
      return [maxX - minX, maxY - minY, maxZ - minZ]
    }
    const coarse = grossExtent(0.7)
    const fine = grossExtent(1.3)
    for (let a = 0; a < 3; a++) {
      expect(Number.isFinite(coarse[a]) && Number.isFinite(fine[a])).toBe(true)
      expect(Math.abs(coarse[a] - fine[a])).toBeLessThan(0.08) // ≤ 8 cm envelope drift
    }
  }, 30000)
})

describe('body friction / cling', () => {
  it('fabric friction changes how a garment settles on the true body surface', () => {
    const drapeWithFriction = (friction: number): Float32Array => {
      const def = getGarment('dress')
      const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
      const build = buildTubeGarment(spec)
      const params: FabricParams = { ...FABRICS.cotton, friction }
      const solver = new XPBDSolver(build.nx, build.ny, build.positions, params, { pinned: build.pinnedTop, wrapX: true })
      solver.colliders = mann.colliders
      solver.bodyCollider = mann.bodyCollider
      for (let i = 0; i < 180; i++) solver.step(1 / 60)
      return build.positions.slice()
    }
    const grippy = drapeWithFriction(0.95)
    const slippery = drapeWithFriction(0.05)
    let maxDiff = 0
    for (let i = 0; i < grippy.length; i++) maxDiff = Math.max(maxDiff, Math.abs(grippy[i] - slippery[i]))
    // before the fix `solveBody` ignored friction → the two drapes were ~identical
    expect(maxDiff).toBeGreaterThan(0.003) // ≥ 3 mm: friction now grips/slides on the mesh body
  }, 30000)
})

describe('momentum conservation (internal forces cancel)', () => {
  it('the centre of mass does not drift with no gravity / damping / drag', () => {
    const nx = 6
    const ny = 6
    const n = nx * ny
    const pos = new Float32Array(n * 3)
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        const k = (iy * nx + ix) * 3
        pos[k] = ix * 0.1 - 0.25
        pos[k + 1] = 1.3 + iy * 0.1 // above the ground plane
        pos[k + 2] = 0
      }
    }
    // perturb an interior particle out of plane BEFORE building the solver, so its
    // `prev` records the perturbed rest (initial velocity stays zero, Σmv = 0).
    pos[(2 * nx + 3) * 3 + 2] += 0.05

    const params: FabricParams = { stretchCompliance: 2e-3, bendCompliance: 5e-3, mass: 0.3, damping: 0, friction: 0, aero: 0, color: 0 }
    const solver = new XPBDSolver(nx, ny, pos, params, { pinned: [], wrapX: false })
    solver.colliders = []
    solver.gravity.set(0, 0, 0)

    const com = (): [number, number, number] => {
      let x = 0, y = 0, z = 0
      for (let k = 0; k < n; k++) {
        x += pos[k * 3]
        y += pos[k * 3 + 1]
        z += pos[k * 3 + 2]
      }
      return [x / n, y / n, z / n]
    }
    const c0 = com()
    for (let i = 0; i < 80; i++) solver.step(1 / 60)
    const c1 = com()
    // internal constraint impulses are equal-and-opposite ⇒ the COM must stay put
    expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2])).toBeLessThan(1e-5)
  })
})
