/**
 * Pressure / contact fit map colour ramp — maps a garment particle's **body-contact
 * pressure** (from `XPBDSolver.contactPressure`: the per-frame collision push-out) to
 * a cold→hot pressure colour: **no contact → deep blue**, light contact → cyan, firm →
 * yellow, **pressing hard → red**. Distinct from the strain heatmap (how *stretched*
 * the cloth is) — this shows where the garment actually **presses into** the body.
 * `scale` is the push-out (m/frame) that saturates red. Pure + unit-tested; the stack
 * bakes it into the mesh's vertex colours via the shared strain-view machinery.
 */
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))
const lerp3 = (a: [number, number, number], b: [number, number, number], u: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * u,
  a[1] + (b[1] - a[1]) * u,
  a[2] + (b[2] - a[2]) * u
]

const NONE: [number, number, number] = [0.04, 0.16, 0.38] // deep blue — hanging free
const LIGHT: [number, number, number] = [0.05, 0.62, 0.72] // cyan — resting contact
const FIRM: [number, number, number] = [0.93, 0.85, 0.25] // yellow — firm contact
const HARD: [number, number, number] = [0.95, 0.13, 0.1] // red — pressing into the body

/** Contact pressure (m/frame push-out) → cold→hot pressure colour. */
export function pressureColor(pressure: number, scale = 0.003): [number, number, number] {
  const t = clamp(pressure / (scale || 1), 0, 1)
  if (t < 1 / 3) return lerp3(NONE, LIGHT, t * 3)
  if (t < 2 / 3) return lerp3(LIGHT, FIRM, (t - 1 / 3) * 3)
  return lerp3(FIRM, HARD, (t - 2 / 3) * 3)
}
