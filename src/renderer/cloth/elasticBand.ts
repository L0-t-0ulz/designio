/**
 * **Elastic band physics** — the pure mechanics of a stretched elastic band (a
 * beanie cuff · waistband · cuff). A band drafted smaller than the body it's worn on
 * stretches to fit; the hoop tension that builds turns into an inward grip pressure
 * (Laplace's law for a cylinder). Pure + unit-tested; feeds the head-sizing "band
 * grip" readout so a maker sees how firmly a cuff clamps.
 */

/** Fractional stretch of a band worn over a bigger girth (0 when slack/compressed). */
export function bandStretch(restCirc: number, wornCirc: number): number {
  if (restCirc <= 0) return 0
  return Math.max(0, (wornCirc - restCirc) / restCirc)
}

/** Hoop tension (N) from the stretch — linear elastic up to the modulus. */
export function bandTensionN(stretch: number, modulusN = 60): number {
  return Math.max(0, stretch) * modulusN
}

/**
 * Inward grip pressure (kPa) a band of hoop tension `tensionN` and height `heightM`
 * exerts at radius `radiusM` — Laplace's law P = (T / height) / radius. Pure.
 */
export function bandPressureKpa(tensionN: number, radiusM: number, heightM = 0.03): number {
  if (radiusM <= 0 || heightM <= 0) return 0
  return tensionN / heightM / radiusM / 1000
}

/**
 * The grip pressure (kPa) of an elastic band worn over a body girth — the whole
 * chain: rest→worn stretch, tension, then Laplace pressure. `restCirc`/`wornCirc` in
 * cm, `radiusM` in m. 0 when the band is slack (not drafted smaller). Pure.
 */
export function bandGripKpa(restCircCm: number, wornCircCm: number, radiusM: number, modulusN = 60, heightM = 0.03): number {
  const t = bandTensionN(bandStretch(restCircCm, wornCircCm), modulusN)
  return Math.round(bandPressureKpa(t, radiusM, heightM) * 10) / 10
}
