/**
 * **The straw hats** — the boater and the panama.
 *
 * Both are a blocked crown plus a brim plus a ribbon band, and the difference
 * between them is the whole point: a **boater** is sennit straw, stiffened until it
 * is rigid, so its brim is dead flat with a small turned edge and its crown is a
 * hard flat-topped drum. A **panama** is woven toquilla and stays soft, so its brim
 * falls away from the head and its crown takes a centre dent.
 *
 * Millimetres, as a milliner blocks, converted through the same `mmToUnits` the
 * brimless crowns use.
 */

import { mmToUnits, HEAD_BREADTH_MM } from './brimless'

export type StrawStyle = 'boater' | 'panama'
export const STRAW_STYLES: StrawStyle[] = ['boater', 'panama']

export interface StrawSpec {
  /** Crown height, and its diameter at band and top. */
  crownMm: number
  bandMm: number
  topMm: number
  /** How far the brim reaches out past the band, measured on the radius. */
  brimMm: number
  /**
   * How far the brim's outer edge sits below the band.
   *
   * Zero on a boater — a stiffened sennit brim is dead flat, and that flatness is
   * the hat. A panama's is soft and falls away.
   */
  brimDropMm: number
  /** The edge turns up by this much at the very rim; a boater has a small turn. */
  edgeCurlMm: number
  /** Depth of the crown's centre dent, 0 on a hard flat top. */
  dentMm: number
  /** Ribbon band height, and how far up the crown its bottom edge sits. */
  bandHeightMm: number
  strawColour: number
  ribbonColour: number
}

/**
 * The two blocks, at the sizes they are made in: a boater's brim is a narrow 55 mm
 * and rigidly flat, a panama's a wider 70 mm that falls 18 mm to the edge.
 */
export const STRAW_HATS: Record<StrawStyle, StrawSpec> = {
  boater: {
    crownMm: 100,
    bandMm: 181,
    topMm: 181,
    brimMm: 55,
    brimDropMm: 0,
    edgeCurlMm: 9,
    dentMm: 0,
    bandHeightMm: 38,
    strawColour: 0xe6d8a8,
    ribbonColour: 0x1a2a52
  },
  panama: {
    crownMm: 112,
    bandMm: 181,
    topMm: 168,
    brimMm: 70,
    brimDropMm: 18,
    edgeCurlMm: 4,
    dentMm: 22,
    bandHeightMm: 30,
    strawColour: 0xe9dfc4,
    ribbonColour: 0x2b2b2b
  }
}

/**
 * The brim's profile: how far out and how far down it is, at `t` from the crown
 * (0, at the band) to the outer edge (1). Both in head-frame units.
 *
 * The fall is quadratic, not linear — a soft brim hangs, so most of the drop
 * happens toward the edge where there is the most weight and the least support.
 * The last tenth turns back up by `edgeCurl`, which is what a rolled edge does and
 * what stops a brim reading as a paper disc.
 */
export function brimProfileAt(h: StrawSpec, t: number): { out: number; down: number } {
  const u = Math.min(1, Math.max(0, t))
  const out = ((h.bandMm / 2 + h.brimMm * u) as number) * mmToUnits
  const CURL_FROM = 0.9
  let down = h.brimDropMm * u * u
  if (u > CURL_FROM) {
    const s = (u - CURL_FROM) / (1 - CURL_FROM)
    down -= h.edgeCurlMm * s * s
  }
  return { out, down: down * mmToUnits }
}

/**
 * Depth of the crown's centre dent at `t` across it, −1 at one side and +1 at the
 * other, and `axial` from the front (−1) to the back (+1) of the crown.
 *
 * A centre dent is a single crease down the middle of the top, deepest in the
 * middle of its run and easing out to nothing at the front and back edges — not a
 * groove of constant depth, which reads as a machined slot rather than a hat that
 * has been pinched.
 */
export function centreDent(h: StrawSpec, across: number, axial: number): number {
  if (h.dentMm <= 0) return 0
  const a = Math.min(1, Math.abs(across))
  const b = Math.min(1, Math.abs(axial))
  const crease = Math.max(0, 1 - a * a * 3) // narrow across the crown
  const run = 1 - b * b // eased out at the front and back
  return h.dentMm * mmToUnits * crease * run
}

/** Total width of the hat across, in mm — the crown's band plus both brims. */
export function hatWidthMm(h: StrawSpec): number {
  return h.bandMm + h.brimMm * 2
}

/** A boater's brim really is flat: no drop anywhere except its turned edge. */
export function isFlatBrim(h: StrawSpec): boolean {
  return h.brimDropMm === 0
}

/** Sanity: a hat's band is drafted to a head, so it should be about head-sized. */
export function bandFitsHead(h: StrawSpec): boolean {
  return Math.abs(h.bandMm - HEAD_BREADTH_MM) <= 12
}
