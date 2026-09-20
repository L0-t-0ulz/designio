/**
 * **Fabric consumption** — what has to be *bought*, which is more than the marker
 * is long.
 *
 * `marker.nestMarker` lays the panels out and measures the marker: that is the
 * cutting-room plan. Buying is a different question, because a roll carries losses
 * the marker does not contain —
 *
 * - **end loss**, the unusable cloth at each end of a lay;
 * - **splice loss**, wherever one roll runs out and the next is joined on;
 * - **shrinkage**, which cloth gives up when it is relaxed before cutting, so the
 *   marker has to be cut long enough that it is still right afterwards;
 * - a **minimum cut**, because nobody sells a 4 cm length.
 *
 * And the bolt width is a decision, not a given: a piece a little over half the
 * width leaves the rest of that width empty for the marker's whole length, so a
 * *narrower* bolt can beat a wider one outright. The only way to know is to nest
 * at each width and compare, which is what a cutting room does and what `bestBolt`
 * does here.
 *
 * Pure + unit-tested.
 */

import { nestMarker, type MarkerLayout } from './marker'
import type { PatternPanel } from './garmentPattern'

/** Bolt widths cloth is actually sold in, cm. */
export const BOLT_WIDTHS_CM = [90, 112, 140, 150, 160, 180]
export const DEFAULT_BOLT_CM = 140

/** Unusable cloth at each end of a lay, m. */
export const END_LOSS_M = 0.12
/** Cloth lost at each roll join, m. */
export const SPLICE_LOSS_M = 0.08
/** The shortest length anyone will sell, m. */
export const MIN_CUT_M = 0.15

/**
 * A **nap**, pile or one-way print forces every piece to lie the same way up, so a
 * piece can no longer be turned to fill a gap. The published cost is around 6 % of
 * the marker's efficiency, which is applied here by lengthening the marker.
 */
export const NAP_PENALTY = 0.06

export interface ConsumptionInputs {
  panels: PatternPanel[]
  boltWidthCm?: number
  /** A nap, pile or one-way print. */
  napped?: boolean
  /** Residual shrinkage as a fraction — 0.03 is a typical relaxed cotton. */
  shrinkage?: number
  /** How many roll joins the lay spans. */
  splices?: number
  /** Gap between pieces on the marker, cm. */
  gapCm?: number
}

export interface Consumption {
  layout: MarkerLayout
  boltWidthCm: number
  /** The marker itself, m — after any nap penalty. */
  markerM: number
  /** What to buy, m. */
  buyM: number
  /** Area bought, m² — the honest denominator for a waste figure. */
  boughtM2: number
  /** Fraction of the bought cloth that ends up in the garment, 0…1. */
  utilisation: number
  /** What the cutting room sweeps up, m². */
  wasteM2: number
}

/**
 * Plan the buy for one bolt width.
 *
 * Shrinkage divides rather than multiplies: cloth that shrinks 3 % has to be cut
 * `1/0.97` long to finish right, not `1.03` — the two differ by enough to matter
 * over a long lay, and the wrong one is short.
 */
export function fabricConsumption(inp: ConsumptionInputs): Consumption {
  const boltWidthCm = inp.boltWidthCm ?? DEFAULT_BOLT_CM
  const layout = nestMarker(inp.panels, boltWidthCm, inp.gapCm ?? 1)
  const napped = inp.napped ?? false
  // a nap costs efficiency, which shows up as a longer marker for the same panels
  const markerM = (layout.lengthCm / 100) * (napped ? 1 / (1 - NAP_PENALTY) : 1)
  const shrink = Math.min(0.5, Math.max(0, inp.shrinkage ?? 0))
  const splices = Math.max(0, Math.floor(inp.splices ?? 0))
  const withLoss = markerM + END_LOSS_M + splices * SPLICE_LOSS_M
  const buyM = Math.max(MIN_CUT_M, withLoss / (1 - shrink))
  const boughtM2 = buyM * (boltWidthCm / 100)
  const panelM2 = layout.panelAreaCm2 / 10000
  return {
    layout,
    boltWidthCm,
    markerM: r3(markerM),
    buyM: r3(buyM),
    boughtM2: r3(boughtM2),
    utilisation: boughtM2 > 0 ? r3(Math.min(1, panelM2 / boughtM2)) : 0,
    wasteM2: r3(Math.max(0, boughtM2 - panelM2))
  }
}

/**
 * Which bolt width buys the least cloth, by **nesting at each one**.
 *
 * Not always the widest. A panel a little over half the bolt leaves the rest of
 * that width empty for the whole marker, and a narrower bolt that fits two across
 * beats it. Ties go to the narrower bolt, which is the cheaper cloth.
 */
export function bestBolt(inp: ConsumptionInputs, widths: readonly number[] = BOLT_WIDTHS_CM): Consumption {
  let best: Consumption | null = null
  for (const w of [...widths].sort((a, b) => a - b)) {
    const c = fabricConsumption({ ...inp, boltWidthCm: w })
    if (!best || c.boughtM2 < best.boughtM2 - 1e-9) best = c
  }
  return best ?? fabricConsumption(inp)
}

/** A one-line readout for the panel. */
export function consumptionReadout(c: Consumption): string {
  return `${c.buyM.toFixed(2)} m @ ${c.boltWidthCm} cm · ${Math.round(c.utilisation * 100)}% utilised`
}

const r3 = (v: number): number => Math.round(v * 1000) / 1000
