/**
 * **Turbulent wind field** — a swirling, spatially-varying wind offset so gusty air
 * hits different parts of a garment differently (flags ripple, skirts swirl),
 * instead of one uniform vector pushing every particle in lock-step. Deterministic
 * layered trig noise (no RNG — replays identically): bounded, decorrelated per
 * axis, drifting through space and time. Pure + unit-tested; the solver samples it
 * once per frame per particle, scaled by the base wind strength — no base wind,
 * no turbulence (so `still` stays perfectly still and the sleep logic is untouched).
 */

export interface Vec3Like {
  x: number
  y: number
  z: number
}

/** The unit-ish turbulence vector at a point + time: |x|,|z| ≤ 1, |y| ≤ 0.6 (air swirls sideways more than up). */
export function turbulentWind(px: number, py: number, pz: number, t: number, out: Vec3Like): void {
  const a = px * 2.1 + py * 1.3 + t * 1.7
  const b = py * 2.7 + pz * 1.9 + t * 1.1 + 4.2
  const c = pz * 2.3 + px * 1.5 + t * 2.3 + 9.1
  out.x = Math.sin(a) * 0.6 + Math.sin(b * 1.7 + Math.sin(c)) * 0.4
  out.y = Math.sin(b) * 0.35 + Math.sin(c * 1.3 + Math.sin(a)) * 0.25
  out.z = Math.sin(c) * 0.6 + Math.sin(a * 1.9 + Math.sin(b)) * 0.4
}
