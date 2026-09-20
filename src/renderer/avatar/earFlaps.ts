/**
 * **The ear-flap hats** — the ushanka and the deerstalker.
 *
 * Both are a crown with flaps, and both flaps do the same two jobs: they hang over
 * the ears in the down position and fold up against the crown in the up one. So the
 * flap is one shape and one hinge, and the two hats differ in the crown they hang
 * from, the material, and what else is attached — a deerstalker also carries the
 * pair of bills that make it a deerstalker.
 *
 * Millimetres, as the brimmed and brimless hats use, converted with the same
 * `mmToUnits`.
 */

import { mmToUnits, type CrownSpec } from './brimless'
import { EAR_CENTRE_FRAC } from './face'

export type FlapStyle = 'ushanka' | 'deerstalker'
export const FLAP_STYLES: FlapStyle[] = ['ushanka', 'deerstalker']

/** A flap can be worn down over the ears or folded up onto the crown. */
export type FlapWorn = 'down' | 'up'
export const FLAP_WORN: FlapWorn[] = ['down', 'up']

export interface FlapHatSpec {
  crownMm: number
  bandMm: number
  /** How far down the flap reaches past the band, and how wide it is. */
  flapDropMm: number
  flapWidthMm: number
  /** The deerstalker's front and back bills, measured out from the band. */
  billMm: number
  /** Pile depth — an ushanka is fur, a deerstalker is tweed. */
  pileMm: number
  /**
   * How much the shell is blocked over the head, per side.
   *
   * A winter hat is not drafted to the skull. It is lined, and worn over hair, so
   * its shell is blocked well outside the head — an ushanka by more than a
   * centimetre. Drafted to the head instead, it clears by a millimetre or two and
   * the skull interleaves with it from every angle.
   */
  liningMm: number
  crownColour: number
  flapColour: number
}

/**
 * The two blocks. An ushanka's flaps are long enough to tie under the chin; a
 * deerstalker's are short, because they are there to be tied on **top** and the
 * hat's real weather protection is its two bills.
 */
export const FLAP_HATS: Record<FlapStyle, FlapHatSpec> = {
  ushanka: { crownMm: 120, bandMm: 183, flapDropMm: 120, flapWidthMm: 105, billMm: 0, pileMm: 9, liningMm: 14, crownColour: 0x4a3a2c, flapColour: 0x6b5744 },
  deerstalker: { crownMm: 96, bandMm: 181, flapDropMm: 78, flapWidthMm: 92, billMm: 62, pileMm: 1.5, liningMm: 8, crownColour: 0x7a6a4e, flapColour: 0x7a6a4e }
}

/**
 * Each flap hat's crown as a `CrownSpec`, so it goes through the same graded lathe
 * as the fez and the kufi.
 *
 * A hemisphere is the obvious shape for a fur hat and it is the wrong one: this
 * head is squarer at the top than a sphere, so a dome drafted to clear it at the
 * band has the skull coming out through it higher up. The lathe is graded to fit
 * in girth and in height, which is the machinery that already solves that.
 */
export function crownOf(h: FlapHatSpec): CrownSpec {
  return {
    heightMm: h.crownMm,
    bandMm: h.bandMm + 2 * h.liningMm,
    topMm: (h.bandMm + 2 * h.liningMm) * 0.86,
    roundTop: 0.5,
    tiltDeg: 0,
    setBack: 0,
    fitted: true,
    colour: h.crownColour
  }
}

/**
 * How far the flap has rotated about its hinge, in radians, for a worn state.
 *
 * Down is a few degrees out from vertical rather than exactly vertical, because a
 * flap hangs clear of the jaw rather than pressing against it. Up is past the
 * horizontal, folded back onto the crown and held there.
 */
export const FLAP_DOWN_RAD = -0.12
export const FLAP_UP_RAD = 2.35
export function flapAngle(worn: FlapWorn): number {
  return worn === 'up' ? FLAP_UP_RAD : FLAP_DOWN_RAD
}

/**
 * Where the flap hinges, as a fraction of the head's height below the crown.
 *
 * On the ear, which is where a flap that covers the ear has to pivot — the same
 * landmark the earrings use, so the two agree about where an ear is.
 */
export const FLAP_HINGE_FRAC = EAR_CENTRE_FRAC

/**
 * Half-width of a flap at `t` down it, 0 at the hinge and 1 at the tip, as a
 * fraction of its full width.
 *
 * A flap is widest where it covers the ear and narrows toward the tie, which is
 * what gives it its shape; a rectangle reads as a mud guard.
 */
export function flapHalfWidth(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  const WIDE = 0.35 // the ear is covered by here
  if (u < WIDE) return 0.5 * (0.78 + 0.22 * (u / WIDE))
  const s = (u - WIDE) / (1 - WIDE)
  return 0.5 * (1 - 0.55 * s * s) // tapers to the tie
}

/**
 * How far the flap's outer face stands off the head at `t` down it, in head-frame
 * units — the thickness of the pile plus the flare a stiff flap keeps.
 */
export function flapStandoff(spec: FlapHatSpec, t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return spec.pileMm * mmToUnits * (1 + 1.6 * u)
}

/**
 * A deerstalker's bills sit front and back, not at the sides — which is the whole
 * point of the hat, and the thing that distinguishes it from every other flapped
 * cap. Returns their azimuths in radians about the crown, 0 being the face.
 */
export const BILL_AZIMUTHS = [0, Math.PI]
