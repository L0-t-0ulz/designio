import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { buildTubeGarment } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS, type FabricParams } from '../src/renderer/cloth/fabricPresets'

const mann = buildMannequin()

// These are invariant checks (settle · determinism · bounded residual · resolution
// agreement · friction effect), none of which need full resolution — so build the
// garment COARSE (far fewer particles ⇒ the mesh-BVH drape is several× faster). That
// keeps the whole file well under its timeouts even on the slower CI runner (it used
// to run ~74 s on Node 20 at full res and flake the residual test).
function buildDrape(id: string, opts: { ringScale?: number; radialScale?: number; friction?: number } = {}): { solver: XPBDSolver; positions: Float32Array } {
  const def = getGarment(id)
  const spec = garmentTubeSpecs(def, { ...DEFAULT_PARAMS, ...def.defaults }, mann.measurements)[0]
  spec.radial = Math.max(10, Math.round(spec.radial * (opts.radialScale ?? 0.4))) // coarse — plenty for invariants
  spec.rings = Math.max(8, Math.round(spec.rings * (opts.ringScale ?? 0.6)))
  const build = buildTubeGarment(spec)
  const params: FabricParams = opts.friction != null ? { ...FABRICS.cotton, friction: opts.friction } : FABRICS.cotton
  const solver = new XPBDSolver(build.nx, build.ny, build.positions, params, { pinned: build.pinnedTop, wrapX: true })
  solver.colliders = mann.colliders
  solver.bodyCollider = mann.bodyCollider
  return { solver, positions: build.positions }
}

function drape(id: string, steps: number, opts: { ringScale?: number; radialScale?: number; friction?: number } = {}): { solver: XPBDSolver; positions: Float32Array } {
  const d = buildDrape(id, opts)
  for (let i = 0; i < steps; i++) d.solver.step(1 / 60)
  return d
}

describe('rest-state settle (the "hangs perfectly still" promise)', () => {
  it('a draped garment reaches a dead stop (sleep) within a bounded time', () => {
    const { solver } = buildDrape('dress')
    let settledAt = -1
    for (let i = 0; i < 300; i++) {
      solver.step(1 / 60)
      if (solver.settled) {
        settledAt = i
        break
      }
    }
    expect(settledAt).toBeGreaterThan(0)
    expect(settledAt).toBeLessThan(300) // windless + still body ⇒ it must go to sleep
  }, 20000)
})

describe('golden-drape determinism (regression-ready)', () => {
  it('draping the same garment twice is bit-identical (no RNG / wall-clock in the sim)', () => {
    const a = drape('dress', 120).positions
    const b = drape('dress', 120).positions
    expect(a.length).toBe(b.length)
    let maxDiff = 0
    for (let i = 0; i < a.length; i++) maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]))
    expect(maxDiff).toBe(0)
  }, 20000)
})

describe('constraint-residual divergence guard', () => {
  it('no stretch constraint diverges — the settled residual stays finite + bounded', () => {
    // maxResidual() is the worst |len − rest| over the distance constraints. A healthy
    // settle keeps it modest; a diverging solve would send it to metres/∞. Guards the
    // solve the same way the energy/NaN checks do — finite + well under the blow-up scale.
    const { solver } = drape('dress', 140)
    const r = solver.maxResidual()
    expect(Number.isFinite(r)).toBe(true)
    expect(r, `residual diverged to ${r} m`).toBeLessThan(3)
  }, 20000)
})

describe('cross-resolution drape invariance', () => {
  it('a coarser vs finer sim of the same garment agree on gross size (resolution refines, not changes)', () => {
    // Drape the same garment at two ring counts; the overall extent (length/width
    // envelope) must match within tolerance — raising resolution sharpens folds, it
    // must not move the garment.
    // a smooth radial (invariance needs it) but coarse rings — the axis under test
    const grossExtent = (ringScale: number): [number, number, number] => {
      const { positions: p } = drape('dress', 140, { ringScale, radialScale: 0.8 })
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (let k = 0; k < p.length; k += 3) {
        minX = Math.min(minX, p[k]); maxX = Math.max(maxX, p[k])
        minY = Math.min(minY, p[k + 1]); maxY = Math.max(maxY, p[k + 1])
        minZ = Math.min(minZ, p[k + 2]); maxZ = Math.max(maxZ, p[k + 2])
      }
      return [maxX - minX, maxY - minY, maxZ - minZ]
    }
    const coarse = grossExtent(0.7)
    const fine = grossExtent(1.2) // both above the ring floor — a real but moderate resolution step
    for (let a = 0; a < 3; a++) {
      expect(Number.isFinite(coarse[a]) && Number.isFinite(fine[a])).toBe(true)
      expect(Math.abs(coarse[a] - fine[a])).toBeLessThan(0.1) // ≤ 10 cm envelope drift
    }
  }, 20000)
})

describe('body friction / cling', () => {
  it('fabric friction changes how a garment settles on the true body surface', () => {
    const grippy = drape('dress', 140, { friction: 0.95 }).positions
    const slippery = drape('dress', 140, { friction: 0.05 }).positions
    let maxDiff = 0
    for (let i = 0; i < grippy.length; i++) maxDiff = Math.max(maxDiff, Math.abs(grippy[i] - slippery[i]))
    // before the fix `solveBody` ignored friction → the two drapes were ~identical
    expect(maxDiff).toBeGreaterThan(0.003) // ≥ 3 mm: friction now grips/slides on the mesh body
  }, 20000)
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
