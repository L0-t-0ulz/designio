/**
 * Adaptive remeshing — silhouette-driven vertical ring placement.
 *
 * A garment tube is a structured `radial × rings` grid. Historically the `rings`
 * were spread **uniformly** in the height parameter t (each ring at iy/(rings-1)).
 * This packs the same ring budget **non-uniformly** instead: more rings where the
 * silhouette changes fastest (a cinched waist, a flare, a puff-sleeve bell) and
 * fewer where the tube runs straight — so cloth detail (and the folds that
 * nucleate at those transitions) is resolved where it matters, at no extra
 * particle cost. A straight cone has a constant-slope profile, so it stays exactly
 * uniform: the change is *zero* for the simple case and a refinement for shaped
 * garments.
 *
 * Because the XPBD solver measures every rest length from the initial geometry,
 * moving the rings needs no solver change — the distance constraints simply adapt.
 * UVs are driven by the same t values (`fillTube`/`buildTubeGarment`) so a placed
 * print stays at its physical height regardless of where the rings land.
 *
 * Pure + unit-tested.
 */

/** How hard to concentrate rings toward high-slope regions. 0 = uniform spacing. */
export const ADAPTIVE_STRENGTH = 1.1
/**
 * Cap on the local ring density: the steepest region gets at most this many rings
 * per unit t relative to a flat region. Bounds the ring spacing so no distance
 * constraint collapses to near-zero rest length (which would destabilise the solver);
 * the tightest gap is ≥ uniformGap / MAX_DENSITY.
 */
const MAX_DENSITY = 2.5

/** Uniform ring parameters (the classic even spacing) — the strength-0 fallback. */
function uniformRings(rings: number): number[] {
  const out = new Array<number>(rings)
  for (let i = 0; i < rings; i++) out[i] = rings > 1 ? i / (rings - 1) : 0
  return out
}

/** 3-tap smoothing so a piecewise-linear cinch spreads over its transition zone. */
function smooth(a: Float64Array): void {
  const n = a.length
  const b = a.slice()
  for (let i = 0; i < n; i++) {
    const l = b[Math.max(0, i - 1)]
    const c = b[i]
    const r = b[Math.min(n - 1, i + 1)]
    a[i] = 0.25 * l + 0.5 * c + 0.25 * r
  }
}

/**
 * Adaptive ring placement: given a tube's radius profile `r(t)` (t = 0 at the top
 * ring … 1 at the hem), return `rings` monotonically-increasing height parameters
 * (out[0] = 0, out[rings-1] = 1) that pack more rings where the silhouette **bends**.
 *
 * The density is driven by the local *curvature* (turning rate) of the profile
 * curve (t, r) — so rings gather at a cinched waist, a flare onset, a puff-sleeve
 * bell or a shaped neckline, and a straight run stays uniform whether the tube is
 * a plain cylinder (constant r) or a plain cone (constant slope). r is normalised
 * by its mean, so a big gown and a shirt cuff concentrate by the same rule
 * (scale-free); dividing the turn by the sample step keeps a smooth curve
 * resolution-independent.
 */
export function adaptiveRingT(profile: (t: number) => number, rings: number, strength = ADAPTIVE_STRENGTH): number[] {
  if (rings <= 1) return rings === 1 ? [0] : []
  if (rings === 2 || strength <= 0) return uniformRings(rings)

  // Sample the radius profile on a fine grid.
  const M = 256
  const dt = 1 / M
  const r = new Float64Array(M + 1)
  let mean = 0
  for (let k = 0; k <= M; k++) {
    r[k] = Math.max(1e-6, profile(k / M))
    mean += r[k]
  }
  mean /= M + 1
  const invMean = 1 / mean

  // density_k ≥ 1: 1 + strength·(turning rate). At each node measure the angle
  // between the incoming and outgoing profile segments (in scale-free (t, r/mean)
  // space) over a *wide* stencil `h` — a ring-scale span — so a sharp corner (a
  // waist) registers as an elevated band with real integrated weight (enough to
  // pull a ring or two toward it), not a one-sample spike. Dividing the turn by the
  // span ≈ the curvature (resolution-independent); clamped to MAX_DENSITY so the
  // sharpest bend is at most MAX_DENSITY× a straight run → bounded ring spacing.
  const h = Math.max(2, Math.round(M / 12))
  const span = h * dt
  const dens = new Float64Array(M + 1)
  for (let k = 0; k <= M; k++) {
    const kl = Math.max(0, k - h)
    const kr = Math.min(M, k + h)
    const ay = (r[k] - r[kl]) * invMean
    const by = (r[kr] - r[k]) * invMean
    const la = Math.hypot((k - kl) * dt, ay)
    const lb = Math.hypot((kr - k) * dt, by)
    const cos = la > 0 && lb > 0 ? Math.max(-1, Math.min(1, ((k - kl) * dt * (kr - k) * dt + ay * by) / (la * lb))) : 1
    const turn = Math.acos(cos) // bend angle at node k (0 on any straight run)
    dens[k] = Math.min(MAX_DENSITY, 1 + strength * (turn / span))
  }
  smooth(dens) // ease the packing in at the band edges

  // Cumulative density (trapezoidal): its inverse maps equal density-mass to equal
  // ring spacing, so rings pack where density is high. dens ≥ 1 ⇒ strictly rising.
  const cum = new Float64Array(M + 1)
  for (let k = 1; k <= M; k++) cum[k] = cum[k - 1] + (0.5 * (dens[k - 1] + dens[k])) / M
  const total = cum[M]
  if (total <= 0) return uniformRings(rings) // unreachable (dens ≥ 1); belt & braces

  const out = new Array<number>(rings)
  out[0] = 0
  out[rings - 1] = 1
  let k = 0
  for (let i = 1; i < rings - 1; i++) {
    const target = (i / (rings - 1)) * total
    while (k < M - 1 && cum[k + 1] < target) k++
    const span = cum[k + 1] - cum[k] || 1
    out[i] = (k + (target - cum[k]) / span) / M
  }
  return out
}
