import type { NecklineStyle } from '../cloth/Garment'

/**
 * **Surprise me** — a random but wearable starting point, for when the blank-page
 * problem is the problem.
 *
 * Deterministic given a seed, which is what makes it testable at all and lets a
 * particular result be reproduced from `?surprise=<seed>`. The catalogues are passed
 * in rather than imported, so the tests can pin behaviour with three fabrics instead
 * of thirty-nine.
 */

/** Ranges match the panel's own sliders, so nothing this produces is unreachable by
 *  hand or out of bounds when the panel next renders it. */
export const RANDOM_RANGES = {
  length: { min: 0.3, max: 0.95 },
  /** The panel allows -0.03…0.12; the negative end is a deliberately skin-tight fit
   *  that reads as a mistake when it arrives unasked-for, so surprises start at 0. */
  ease: { min: 0, max: 0.09 },
  flare: { min: 0, max: 0.18 }
} as const

export const NECKLINES: NecklineStyle[] = ['strapless', 'scoop', 'crew', 'v', 'one-shoulder']

export interface RandomDesign {
  garmentType: string
  fabricId: string
  color: number
  length: number
  ease: number
  flare: number
  neckline: NecklineStyle
}

/**
 * A small deterministic PRNG (mulberry32). `Math.random` can't be seeded, and a
 * surprise you can't reproduce is one you can't report a bug against.
 */
export function seededRandom(seed: number): () => number {
  let a = (seed >>> 0) || 1 // seed 0 would make the generator a constant
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A value in [min, max), rounded to `step` so it lands where a slider could put it. */
export function pickInRange(rand: () => number, min: number, max: number, step = 0.01): number {
  const raw = min + rand() * (max - min)
  const snapped = Math.round(raw / step) * step
  const clamped = Math.min(max, Math.max(min, snapped))
  // rounding at float precision leaves 0.30000000000000004; the panel formats these
  return Number(clamped.toFixed(4))
}

/** One item from a list. Returns undefined only for an empty list. */
export function pickOne<T>(rand: () => number, items: T[]): T | undefined {
  if (!items.length) return undefined
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))]
}

/**
 * A random colour with the saturation and lightness kept in a range that looks like
 * cloth — fully random RGB is mostly muddy browns and electric primaries, neither of
 * which reads as a fabric anyone would choose.
 */
export function pickColor(rand: () => number): number {
  const h = rand()
  const s = 0.35 + rand() * 0.4 // 0.35…0.75
  const l = 0.38 + rand() * 0.34 // 0.38…0.72
  return hslToHex(h, s, l)
}

function hslToHex(h: number, s: number, l: number): number {
  const f = (n: number): number => {
    const k = (n + h * 12) % 12
    const a = s * Math.min(l, 1 - l)
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
  }
  return (f(0) << 16) | (f(8) << 8) | f(4)
}

/**
 * A complete random design. `garmentIds` and `fabricIds` are the catalogues to draw
 * from; both must be non-empty for the result to mean anything, so an empty catalogue
 * returns null rather than a design referring to nothing.
 */
export function randomDesign(rand: () => number, garmentIds: string[], fabricIds: string[]): RandomDesign | null {
  const garmentType = pickOne(rand, garmentIds)
  const fabricId = pickOne(rand, fabricIds)
  if (garmentType === undefined || fabricId === undefined) return null
  return {
    garmentType,
    fabricId,
    color: pickColor(rand),
    length: pickInRange(rand, RANDOM_RANGES.length.min, RANDOM_RANGES.length.max),
    ease: pickInRange(rand, RANDOM_RANGES.ease.min, RANDOM_RANGES.ease.max, 0.005),
    flare: pickInRange(rand, RANDOM_RANGES.flare.min, RANDOM_RANGES.flare.max, 0.005),
    neckline: pickOne(rand, NECKLINES) as NecklineStyle
  }
}
