import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment, GARMENT_IDS } from '../src/renderer/garments/registry'
import { garmentTubeSpecs, garmentSleeveSpecs } from '../src/renderer/garments/factory'
import { buildTubeGarment, buildAxisTube } from '../src/renderer/cloth/Garment'
import { XPBDSolver } from '../src/renderer/cloth/XPBDSolver'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { SLEEVE_SHAPES, type SleeveShape } from '../src/renderer/garment/templates'

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

/** Drape a sleeve (any shape) over the arm capsules + mesh collider and settle it. */
function drapeSleeveMaxAbs(shape: SleeveShape, steps = 140): number {
  const def = getGarment('long-sleeve')
  const p = { ...DEFAULT_PARAMS, ...def.defaults, sleeve: 'long' as const, sleeveShape: shape }
  const spec = garmentSleeveSpecs(def, p, mann.colliders)[0]
  if (!spec) return 0
  const build = buildAxisTube(spec)
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

  // The long / leg-wrapping garments are the ones that used to destabilise; the snood
  // is a short head/neck tube (a new piece kind) — confirm it drapes bounded too.
  it('the risky long/wide garments stay bounded on the mesh collider', () => {
    for (const id of ['maxi-skirt', 'wide-leg', 'jumpsuit', 'snood', 'beanie'] as GarmentType[]) {
      if (!GARMENT_IDS.includes(id)) continue
      const mx = drapeMaxAbs(id)
      expect(Number.isFinite(mx), `${id} went non-finite`).toBe(true)
      expect(mx, `${id} diverged to ${mx}`).toBeLessThan(3)
    }
  }, 20000)

  // Every sleeve shape must drape bounded — the puff used to build a ~4× oversized cap ring
  // (a fixed 0.138 m) that self-intersected and exploded into torn balloons.
  it('every sleeve shape drapes finite + bounded (no exploding puff)', () => {
    for (const shape of SLEEVE_SHAPES) {
      const mx = drapeSleeveMaxAbs(shape)
      expect(Number.isFinite(mx), `${shape} sleeve went non-finite`).toBe(true)
      expect(mx, `${shape} sleeve diverged to ${mx}`).toBeLessThan(3)
    }
  }, 20000)
})
