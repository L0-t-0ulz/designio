/**
 * **Maternity fit** — an expandable belly through the trimesters. The bump is one
 * capsule (radius + endpoints, body space) that is BOTH the cloth collider and
 * the visual metaball, so cloth and eye always agree. Trimester 0 keeps it buried
 * inside the torso (radius < waist, barely forward) so the default figure is
 * untouched; 1 → 3 grow it forward + rounder so garments drape over a real bump
 * and the silhouette adjusts through the pregnancy. Pure.
 */
export const MAX_TRIMESTER = 3

export interface BellySpec {
  radius: number
  a: [number, number, number]
  b: [number, number, number]
}

/** The belly capsule for a trimester (0 = none, clamped 0…3; fractions blend). */
export function bellySpec(trimester: number, m: { waistR: number; waistY: number; hipY: number }): BellySpec {
  const t = Math.max(0, Math.min(MAX_TRIMESTER, trimester))
  const r = m.waistR * (0.6 + 0.3 * t)
  const z = m.waistR * (0.1 + 0.32 * t)
  // navel→pubis span, leaning forward as it grows (the fundus rides high)
  return { radius: r, a: [0, m.hipY + 0.02, z * 0.75], b: [0, m.waistY + 0.02, z] }
}

/** Front protrusion (m) beyond the waist front — 0 while the bump is buried. */
export function bellyProtrusion(s: BellySpec, waistR: number): number {
  return Math.max(0, Math.max(s.a[2], s.b[2]) + s.radius - waistR)
}
