import type { FabricParams } from './fabricPresets'

/**
 * Pure solver **diagnostics** — cheap numbers that flag when the XPBD sim is being
 * pushed outside its stable envelope, so a bad fabric preset or timestep is caught by
 * a test instead of by watching a garment jitter. No state, no side effects.
 */

/**
 * **Courant (CFL) number** for a cloth particle: how far it travels in one substep
 * relative to a rest edge length. Above ~1 a particle can jump past its neighbours in
 * a step (tunnelling / instability); well under 1 is safe. `restLength` is the local
 * edge length, `dt` the substep. Guard against a zero rest length.
 */
export function cflNumber(maxSpeed: number, dt: number, restLength: number): number {
  if (restLength <= 0) return Infinity
  return (Math.abs(maxSpeed) * Math.abs(dt)) / restLength
}

/**
 * **Stiffness ratio** of an XPBD distance constraint against the timestep: a
 * dimensionless `dt² / (compliance · mass)`. Low compliance (a rigid woven) or a light
 * particle makes this large → the constraint is stiff for the given `dt` and needs more
 * substeps to converge without ringing. A zero-compliance (perfectly rigid) constraint
 * is maximally stiff → `Infinity`. Monotonic: stiffer fabric ⇒ larger ratio.
 */
export function stiffnessRatio(compliance: number, mass: number, dt: number): number {
  if (compliance <= 0 || mass <= 0) return Infinity
  return (dt * dt) / (compliance * mass)
}

/**
 * Substeps advised for a fabric so the stiffest of its stretch/bend constraints stays
 * in a stable band — √(stiffnessRatio) grows the step count with stiffness, clamped to
 * a sane range. Used by the stiffness monitor / tests (not the hot loop). Pure.
 */
export function substepsForStiffness(p: FabricParams, dt: number, min = 8, max = 28): number {
  const r = Math.max(
    stiffnessRatio(p.stretchCompliance || 1e-6, p.mass, dt),
    stiffnessRatio(p.bendCompliance || 1e-6, p.mass, dt)
  )
  const n = Math.round(Math.sqrt(r) * 0.5)
  return Math.max(min, Math.min(max, n))
}
