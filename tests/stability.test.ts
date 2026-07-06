import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment, GARMENT_IDS } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { buildTubeGarment } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'

const mann = buildMannequin()

/** Drape a garment's body tube over the real mesh body-collider and settle it. */
function drapeMaxAbs(id: GarmentType, steps = 140): number {
  const spec = garmentTubeSpecs(getGarment(id), { ...DEFAULT_PARAMS, ...getGarment(id).defaults }, mann.measurements)[0]
  if (!spec) return 0
  const build = buildTubeGarment(spec)
  const solver = new XPBDSolver(build.nx, build.ny, build.positions, FABRICS.cotton, { pinned: build.pinnedTop, wrapX: true })
  solver.colliders = mann.colliders
  solver.bodyCollider = mann.bodyCollider
  for (let i = 0; i < steps; i++) solver.step(1 / 60)
  let mx = 0
  for (let k = 0; k < build.positions.length; k++) mx = Math.max(mx, Math.abs(build.positions[k]))
  return mx
}

describe('cloth stability (never flies away / explodes)', () => {
  it('a long gown over the mesh collider stays finite + bounded (was exploding to NaN)', () => {
    const mx = drapeMaxAbs('gown', 160) // it used to blow past 20 km by step 20
    expect(Number.isFinite(mx)).toBe(true)
    expect(mx).toBeLessThan(3) // metres — stays around the body, never diverges
  }, 20000)

  // The long / leg-wrapping garments are the ones that used to destabilise.
  it('the risky long/wide garments stay bounded on the mesh collider', () => {
    for (const id of ['maxi-skirt', 'wide-leg', 'jumpsuit'] as GarmentType[]) {
      if (!GARMENT_IDS.includes(id)) continue
      const mx = drapeMaxAbs(id)
      expect(Number.isFinite(mx), `${id} went non-finite`).toBe(true)
      expect(mx, `${id} diverged to ${mx}`).toBeLessThan(3)
    }
  }, 20000)
})
