/**
 * **Brimless crowns** — the fez, the kufi and the pillbox.
 *
 * Three hats with nothing in common visually and everything in common
 * structurally: each is a crown with no brim, blocked to a profile and sat on the
 * head at a hat's own angle. So they are one lathe and a table of profiles, which
 * is also the honest description of how they are made — a fez and a pillbox come
 * off the same kind of block, cut to different heights and tapers.
 *
 * Heights and diameters are in millimetres, the units a milliner blocks to, and
 * convert into the head frame through the measured head breadth.
 */

import { HEAD_UNITS_ACROSS } from './shades'

/** A 57 cm head — the trade's medium — is 181 mm across. */
export const HEAD_BREADTH_MM = 181
/** Millimetres → head-frame units, off the measured head breadth. */
export const mmToUnits = HEAD_UNITS_ACROSS / HEAD_BREADTH_MM

export type BrimlessStyle = 'fez' | 'kufi' | 'pillbox'
export const BRIMLESS_STYLES: BrimlessStyle[] = ['fez', 'kufi', 'pillbox']

export interface CrownSpec {
  /** Height of the crown, in mm. */
  heightMm: number
  /** Diameter at the headband, and at the top — a fez tapers, a pillbox does not. */
  bandMm: number
  topMm: number
  /**
   * What fraction of the crown's height rolls over at the top.
   *
   * The roll always closes at the apex — that is what a rolled edge is — so this
   * says how *far down* the roll starts, not how much of the radius survives. At
   * 0.06 a pillbox keeps its full diameter to 94 % of its height and then turns a
   * hard blocked lip; at 0.75 a kufi is a dome from a quarter of the way up.
   */
  roundTop: number
  /** Worn tilted back off the brow by this many degrees (a fez is worn straight). */
  tiltDeg: number
  /** Sits this far back from centre, as a fraction of the head radius. */
  setBack: number
  /**
   * Whether the hat is **fitted** to the head.
   *
   * A fez and a kufi are sized to the wearer, so their band has to clear the head's
   * widest point or the skull bulges straight through the crown. A pillbox is not:
   * it is famously smaller than the head, which is the whole reason it perches.
   */
  fitted: boolean
  colour: number
}

/**
 * The three blocks.
 *
 * A **fez** is the tall truncated cone, ~100 mm high with a flat top a little
 * narrower than its band. A **kufi** is the short rounded skullcap that follows the
 * head. A **pillbox** is the shallow straight-sided drum, worn tilted and set back —
 * it is famously *smaller* than the head, which is why it perches rather than fits.
 */
export const CROWNS: Record<BrimlessStyle, CrownSpec> = {
  fez: { heightMm: 100, bandMm: 178, topMm: 162, roundTop: 0.08, tiltDeg: 0, setBack: 0.05, fitted: true, colour: 0x8e1b1b },
  kufi: { heightMm: 62, bandMm: 181, topMm: 150, roundTop: 0.75, tiltDeg: 0, setBack: 0, fitted: true, colour: 0xe8e2d4 },
  pillbox: { heightMm: 58, bandMm: 150, topMm: 150, roundTop: 0.06, tiltDeg: 14, setBack: 0.3, fitted: false, colour: 0xd8b9c6 }
}

/**
 * The crown's radius at height `t` up the block, 0 at the band and 1 at the top,
 * in head-frame units.
 *
 * Straight-sided between the two diameters, then rolled over at the top: the roll
 * is a quarter-circle easing in over the last `roundTop` of the height and closing
 * at the apex, which is what gives a kufi its dome and a pillbox its hard lip.
 */
export function crownRadius(c: CrownSpec, t: number): number {
  const u = Math.min(1, Math.max(0, t))
  const band = (c.bandMm / 2) * mmToUnits
  const top = (c.topMm / 2) * mmToUnits
  const straight = band + (top - band) * u
  if (c.roundTop <= 0) return straight
  // the roll: a quarter-circle easing in over the top `roundTop` of the height
  const rollFrom = 1 - c.roundTop
  if (u <= rollFrom) return straight
  const s = (u - rollFrom) / c.roundTop
  return straight * Math.sqrt(Math.max(0, 1 - s * s))
}

/** Crown height in head-frame units. */
export function crownHeight(c: CrownSpec): number {
  return c.heightMm * mmToUnits
}

/**
 * Where a hat sits on the head, in head-frame units below the crown.
 *
 * The **hat line** is the head's widest point — the parietal eminence — because
 * that is the only place a band can rest without either sliding down or being
 * stopped by a wider part of the skull above it. Measured with `?probeHead=1`, the
 * rendered head is widest at 0.2 radii below the collider's crown point.
 */
export const HAT_LINE_Y = -0.2

/**
 * Scale to apply to a **fitted** crown so its band clears the head.
 *
 * A hat blocked to a 181 mm head goes on a 181 mm head. This one is measured, and
 * the two do not have to agree — so a fitted hat is graded to the head it is on,
 * the way a hatter grades to a head size, and an unfitted one is left alone.
 */
export const BAND_CLEARANCE = 1.02
export function crownFit(c: CrownSpec, headUnitsAcross = HEAD_UNITS_ACROSS): number {
  if (!c.fitted) return 1
  const band = c.bandMm * mmToUnits
  return Math.max(1, (headUnitsAcross * BAND_CLEARANCE) / band)
}

/**
 * The rendered head's crown, in head-frame units above the collider's own point —
 * 0.9, measured with `?probeHead=1`.
 */
export const HEAD_CROWN_Y = 0.9

/**
 * Vertical grade for a **fitted** crown: enough that it actually contains the skull
 * above its band.
 *
 * Width and height are graded separately, because they answer different questions.
 * A hatter grades the *girth* to the head; the *height* is a style choice — until
 * it is too short, at which point the skull comes out of the top of the hat, which
 * is what a 100 mm fez does on a head this tall. So the height is the block's own
 * unless the skull needs more, and then it is exactly enough.
 */
export const CROWN_HEADROOM = 0.03
export function crownRise(c: CrownSpec, bandY: number, headCrownY = HEAD_CROWN_Y): number {
  if (!c.fitted) return 1
  const needed = headCrownY - bandY + CROWN_HEADROOM
  return Math.max(1, needed / crownHeight(c))
}

/* ---------------------------------- tassel --------------------------------- */

/**
 * A fez's tassel: a bundle of silk threads on a cord, hanging from a button at the
 * centre of the flat top.
 */
export const TASSEL_LENGTH_MM = 150
export const TASSEL_STRANDS = 14
export const TASSEL_BUTTON_MM = 16

/**
 * Where strand `i` of `n` is at `drop` along its length, as an offset from the
 * button, in head-frame units.
 *
 * A tassel does not hang from the middle of the top — it **spills over one edge**,
 * as a single bundle. The bundle runs from the button out to one point on the rim
 * over the first `TASSEL_OVER_EDGE` of its length and only then falls, and the
 * strands fan tightly around that path.
 *
 * Two ways to get this wrong, both of which I did: hanging the strands straight
 * down from the button sends them through the crown and the head, and spreading
 * them in a ring across the whole top makes a fringe all the way round rather than
 * a tassel.
 *
 * `swing` tips the falling part off the vertical, which is what a tassel does as
 * soon as the head is not still; the caller supplies it so the tassel can lag behind
 * a turning head.
 */
export const TASSEL_OVER_EDGE = 0.28

/** Which way the bundle runs off the top — the wearer's right, as a fez is worn. */
export const TASSEL_AZIMUTH = 0

export function tasselStrand(
  i: number,
  n: number,
  drop: number,
  swing: number,
  rimR: number,
  azimuth = TASSEL_AZIMUTH
): { x: number; y: number; z: number } {
  const d = Math.min(1, Math.max(0, drop))
  const buttonR = (TASSEL_BUTTON_MM / 2) * mmToUnits
  // the BUNDLE's path: out from the button to one point on the rim, then down
  const outT = Math.min(1, d / TASSEL_OVER_EDGE)
  const fall = Math.max(0, d - TASSEL_OVER_EDGE) / (1 - TASSEL_OVER_EDGE)
  const centreR = buttonR + (rimR - buttonR) * outT
  const cx = Math.cos(azimuth) * centreR + swing * fall
  const cz = Math.sin(azimuth) * centreR
  // and the strands fan tightly around that path, opening a little as they fall
  const th = (i / n) * Math.PI * 2
  const bundleR = buttonR * 0.55 * (1 + 1.6 * fall)
  return {
    x: cx + Math.cos(th) * bundleR,
    y: -fall * TASSEL_LENGTH_MM * mmToUnits,
    z: cz + Math.sin(th) * bundleR
  }
}
