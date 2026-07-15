/**
 * **Thermochromic preview** — heat-reactive dye. A leuco-dyed fabric holds its
 * colour when cool and shifts (classically *fades pale*, or crosses to a second
 * colour) as it warms past the activation temperature. The preview drives that
 * shift off a `temp` slider (0 cool … 1 warm) so a designer can see the effect
 * without a heat gun. Pure integer-RGB maths (no THREE) so it's unit-tested; the
 * renderer just sets the shifted colour on the material.
 */

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Linear blend of two packed 0xRRGGBB colours by `t` (clamped 0…1). Pure. */
export function thermochromicColor(cold: number, warm: number, t: number): number {
  const u = clamp01(t)
  const cr = (cold >> 16) & 255
  const cg = (cold >> 8) & 255
  const cb = cold & 255
  const wr = (warm >> 16) & 255
  const wg = (warm >> 8) & 255
  const wb = warm & 255
  const r = Math.round(cr + (wr - cr) * u)
  const g = Math.round(cg + (wg - cg) * u)
  const b = Math.round(cb + (wb - cb) * u)
  return (r << 16) | (g << 8) | b
}

/**
 * The default warm/activated colour for a cold base — a **pale fade** (85 % toward
 * white), the classic leuco-dye behaviour where the colour washes out as it heats.
 * Overridable for a two-colour thermochromic. Pure.
 */
export function thermoDefaultWarm(cold: number): number {
  return thermochromicColor(cold, 0xffffff, 0.85)
}
