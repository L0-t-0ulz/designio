/**
 * **The fascinator** — the occasion headpiece, as the three things it is made of.
 *
 * A fascinator is not a hat. It has no crown and does not fit the head: it is a
 * small base pinned to one side of the head on a comb, tilted off the skull, with
 * trim standing off it. Treating it as a small hat puts it on top of the head
 * facing forward, which is the one place it is never worn.
 *
 * The parts: a **base** (a stiffened disc, 60–110 mm), a **quill spray** of
 * feathers arcing off it, and a **loop** of sinamay. Millimetres, converted with
 * the same `mmToUnits` the hats use.
 */

import { mmToUnits } from './brimless'

/** Base diameters a milliner blocks fascinators in. */
export const BASE_MIN_MM = 60
export const BASE_MAX_MM = 110
export const BASE_MM = 88
/** A stiffened sinamay base is a couple of millimetres thick. */
export const BASE_THICK_MM = 3

/**
 * Where it sits: **above and forward of one ear**, tilted off the skull.
 *
 * Not on the crown and not square to the face. The angle from centre-front is
 * about 55°, which puts it on the side of the head where it reads from the front
 * three-quarter view a fascinator is designed for, and it cants about 28° off the
 * skull so the base catches the light rather than lying flat against the hair.
 */
export const AZIMUTH_DEG = 55
export const CANT_DEG = 28
/** How far down from the crown the comb grips, as a fraction of the head's height. */
export const SEAT_FRAC = 0.24

/** Feathers in the spray, and how long the longest is relative to the base. */
export const QUILLS = 7
export const QUILL_LENGTH_OF_BASE = 2.1

/**
 * A point along quill `i` of `n`, at `t` from the base (0) to the tip (1), in
 * base-diameter units.
 *
 * Each quill is an arc, not a straight spike: a feather is sprung, so it leaves
 * the base steeply and flattens as it goes. The spray fans across a range of
 * headings and the outer ones are shorter, which is what makes it a spray rather
 * than a bundle.
 */
export function quillPoint(i: number, n: number, t: number): { x: number; y: number; z: number } {
  const u = Math.min(1, Math.max(0, t))
  const spread = n <= 1 ? 0 : (i / (n - 1) - 0.5) * 2 // −1 … +1 across the fan
  const FAN_RAD = 0.85
  const a = spread * FAN_RAD
  // the outer quills are shorter, so the spray reads as a fan and not a broom
  const len = QUILL_LENGTH_OF_BASE * (1 - 0.32 * spread * spread)
  const r = len * u
  // sprung: steep off the base, flattening toward the tip
  const rise = len * 0.62 * Math.sin(u * Math.PI * 0.62)
  return { x: Math.sin(a) * r, y: rise, z: Math.cos(a) * r }
}

/** Quill thickness at `t`, in base-diameter units — a feather tapers to nothing. */
export function quillRadius(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return 0.018 * (1 - u * 0.85)
}

/**
 * The sinamay loop: a ribbon standing off the base in a teardrop.
 *
 * Returns a point at `t` round the loop, in base-diameter units. It leaves the
 * base and returns to it, which is what a loop is — a bow tied and left open.
 */
export function loopPoint(t: number, height = 1.15, lean = 0.35): { x: number; y: number; z: number } {
  const a = Math.min(1, Math.max(0, t)) * Math.PI * 2
  // a teardrop: pinched where it meets the base, full at the top
  const open = (1 - Math.cos(a)) / 2
  return { x: Math.sin(a) * 0.42 * open, y: height * open, z: lean * open }
}

/** Is this a base a milliner would actually block? */
export function isBlockableBase(mm: number): boolean {
  return mm >= BASE_MIN_MM && mm <= BASE_MAX_MM
}

/** Base radius in head-frame units. */
export function baseRadius(mm = BASE_MM): number {
  return (mm / 2) * mmToUnits
}
