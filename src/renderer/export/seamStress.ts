/**
 * **Seam stress** — whether the seams will hold, which is a different question
 * from whether the fabric will.
 *
 * The existing `stress` view colours the *cloth* against the fabric's own failure
 * strain. A garment more often fails at a **seam**, and a seam is weaker than the
 * cloth either side of it: it is a line of needle holes with thread through them.
 * Which of the two is the limit depends on the seam type, the stitch density and
 * the thread, and it is not always the one you would guess.
 *
 * Two independent limits, and the seam is as strong as the weaker:
 *
 * - **Thread-limited.** Every stitch along the seam contributes its thread's
 *   breaking strength, so this rises linearly with stitch density.
 * - **Fabric-limited.** The seam's efficiency against the fabric's own strength,
 *   times the damage the needle does. This **falls** with stitch density, because
 *   every stitch is another hole. Above roughly 14 stitches to the inch a woven
 *   starts to perforate along the seam line and tear there.
 *
 * So seam strength is **not monotonic in stitch density**: it rises while thread
 * is the limit, peaks where the two curves cross, and falls as the needle damage
 * takes over. That peak is why a sewing room specifies an SPI rather than
 * "as many as possible", and it is the single most useful thing this module knows.
 *
 * Pure + unit-tested.
 */

import { SEAM_TYPES, type SeamType, type StitchSpec, type ThreadWeight } from '../garment/stitchTypes'

/** Breaking strength of one thread leg, in newtons, by weight. */
export const THREAD_STRENGTH_N: Record<ThreadWeight, number> = {
  'tex-27': 15,
  'tex-40': 22,
  'tex-60': 32
}

/**
 * **Seam efficiency** — the fraction of the fabric's own strength a perfect seam
 * of this type retains.
 *
 * A plain lockstitch keeps most of it; a french seam is sewn twice but through a
 * folded edge and keeps less across the join; an overlock on a knit gives up more
 * still. A flat-fell is the exception that exceeds 1: it is folded and
 * twin-stitched, so the join carries four plies and is genuinely stronger than
 * the single cloth beside it, which is why jeans are made that way. A bonded seam
 * has no thread at all and is limited entirely by the weld.
 */
export const SEAM_EFFICIENCY: Record<SeamType, number> = {
  plain: 0.85,
  french: 0.8,
  'flat-fell': 1.15,
  overlock: 0.7,
  bonded: 0.9
}

/** Stitches per inch above which needle perforation starts to weaken a woven. */
export const PERFORATION_SPI = 14
/** How fast the fabric gives up beyond that, per extra stitch per inch. */
export const PERFORATION_RATE = 0.045

/** Needle-damage factor, 0…1, for a stitch density. */
export function needleDamage(spi: number): number {
  const over = Math.max(0, spi - PERFORATION_SPI)
  return Math.max(0.25, 1 - over * PERFORATION_RATE)
}

/**
 * Fabric tensile strength in newtons per cm of seam, from its weight.
 *
 * Strip tensile scales roughly with mass per unit area for a woven, at about
 * **0.45 N per cm per gsm**. Checked both ends of the range rather than taken on
 * faith: a 120 gsm poplin strip-tests around 300 N per 5 cm, which is 60 N/cm and
 * 0.50 per gsm; a 400 gsm denim around 800 N per 5 cm, which is 160 N/cm and 0.40.
 *
 * An earlier pass had this at 0.16, which is roughly a third of the real figure
 * and made every seam thread-limited — including a fine thread on denim, which
 * anyone who has burst a seam knows is not how it goes.
 */
export const N_PER_CM_PER_GSM = 0.45
export function fabricStrengthNPerCm(gsm: number): number {
  return Math.max(0, gsm) * N_PER_CM_PER_GSM
}

/** Stitches per centimetre, from stitches per inch. */
export function stitchesPerCm(spi: number): number {
  return Math.max(0, spi) / 2.54
}

export interface SeamStrength {
  /** What the thread can take, N per cm. */
  threadN: number
  /** What the fabric can take through that many needle holes, N per cm. */
  fabricN: number
  /** The weaker of the two — what the seam can take, N per cm. */
  strengthN: number
  /** Which one is the limit, which is what a maker can act on. */
  limitedBy: 'thread' | 'fabric'
}

/**
 * Seam strength per cm. A lockstitch has **two** thread legs per stitch, and a
 * twin needle doubles the rows again.
 */
export function seamStrength(spec: StitchSpec, fabricGsm: number): SeamStrength {
  const perCm = stitchesPerCm(spec.spi)
  const legs = 2 * (spec.needle === 'double' ? 2 : 1)
  const rows = SEAM_TYPES[spec.seamType].visibleRows === 2 ? 2 : 1
  const bonded = spec.seamType === 'bonded'
  // a bonded seam carries no thread at all: it is the weld or nothing
  const threadN = bonded ? Infinity : perCm * legs * rows * THREAD_STRENGTH_N[spec.threadWt]
  const fabricN = fabricStrengthNPerCm(fabricGsm) * SEAM_EFFICIENCY[spec.seamType] * (bonded ? 1 : needleDamage(spec.spi))
  return {
    threadN: r2(threadN),
    fabricN: r2(fabricN),
    strengthN: r2(Math.min(threadN, fabricN)),
    limitedBy: threadN < fabricN ? 'thread' : 'fabric'
  }
}

/**
 * The stitch density that makes this seam strongest.
 *
 * Where the rising thread limit meets the falling fabric one. Reported rather
 * than hard-coded because it moves with the thread, the seam type and the cloth:
 * a heavy thread on a light fabric peaks early, a fine thread on canvas peaks
 * late and may never be fabric-limited at all.
 */
export function bestSpi(spec: StitchSpec, fabricGsm: number, lo = 4, hi = 22): number {
  let best = lo
  let bestN = -1
  for (let spi = lo; spi <= hi; spi += 0.5) {
    const n = seamStrength({ ...spec, spi }, fabricGsm).strengthN
    if (n > bestN + 1e-9) {
      bestN = n
      best = spi
    }
  }
  return best
}

/**
 * Load in the cloth at a given strain, N per cm.
 *
 * Linear in the strain up to failure, with the modulus taken from the fabric's
 * own strength and the strain it fails at — which is the only elastic data a
 * fabric preset carries, and enough for a warning.
 */
export function clothLoadNPerCm(strain: number, gsm: number, failStrain: number): number {
  const s = Math.max(0, strain)
  const f = Math.max(0.01, failStrain)
  return (fabricStrengthNPerCm(gsm) * s) / f
}

/**
 * How hard the seam is working, 0…1+ — the load across it over what it can take.
 * At or over 1 the seam is the thing that gives.
 */
export function seamUtilisation(strain: number, spec: StitchSpec, gsm: number, failStrain: number): number {
  const s = seamStrength(spec, gsm).strengthN
  if (!(s > 0)) return 0
  return clothLoadNPerCm(strain, gsm, failStrain) / s
}

/**
 * Colour ramp for the overlay: green while there is margin, amber as it closes,
 * red at and beyond the limit.
 *
 * Held flat red above 1 rather than continuing to brighten — past failure there
 * is nothing more to say, and a ramp that keeps going implies a precision the
 * model does not have.
 */
export function seamStressColor(u: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, u))
  if (t >= 1) return [0.86, 0.1, 0.12]
  if (t < 0.6) {
    const k = t / 0.6 // green → amber
    return [0.25 + 0.65 * k, 0.65 - 0.05 * k, 0.28 - 0.18 * k]
  }
  const k = (t - 0.6) / 0.4 // amber → red
  return [0.9 - 0.04 * k, 0.6 - 0.5 * k, 0.1 - 0.0 * k]
}

/** A one-line readout. */
export function seamStressReadout(u: number, s: SeamStrength): string {
  const pct = Math.round(u * 100)
  const verdict = u >= 1 ? 'AT FAILURE' : u > 0.75 ? 'marginal' : 'holding'
  return `${pct}% of seam strength (${s.strengthN.toFixed(0)} N/cm, ${s.limitedBy}-limited) — ${verdict}`
}

const r2 = (v: number): number => (Number.isFinite(v) ? Math.round(v * 100) / 100 : v)
