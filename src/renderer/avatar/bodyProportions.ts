/**
 * **Body proportions** beyond the girth sliders — neck length, leg length, thigh
 * girth and calf girth.
 *
 * Each one is a multiplier on the authored skeleton. `1` is the figure as shipped,
 * so an older project that never stored these fields drapes exactly as before.
 * Values are clamped into the slider range so a bad `.dio` cannot blow a collider
 * out to a size the cloth solver will not settle.
 *
 * Pure + unit-tested. `Mannequin.applyBody` is the only consumer.
 */

export const PROPORTION_MIN = 0.82
export const PROPORTION_MAX = 1.22

/** Clamp a proportion slider. Missing or non-finite reads as the neutral `1`. */
export function proportionOf(v: number | undefined): number {
  if (v == null || !Number.isFinite(v)) return 1
  return Math.min(PROPORTION_MAX, Math.max(PROPORTION_MIN, v))
}

/**
 * A proportion worth writing into a `.dio`. Neutral `1` (and anything that clamps
 * back to it) is omitted so a default body stays byte-for-byte the old shape.
 */
export function storedProportion(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  const p = proportionOf(v)
  return p === 1 ? undefined : p
}

/** How far the top of a neck of authored span `span` rises when stretched. */
export function neckLift(span: number, neck: number | undefined): number {
  return span * (proportionOf(neck) - 1)
}

/**
 * Move a point that hangs below `attachY` when the leg is lengthened.
 *
 * The hip attachment stays put. Only the knee and the ankle travel, so a longer
 * leg does not shove the pelvis up into the waist.
 */
export function scaledBelow(attachY: number, y: number, leg: number | undefined): number {
  return attachY + (y - attachY) * proportionOf(leg)
}

/**
 * Extra torso length, in the same units as the authored span.
 *
 * The hip stays. The chest grows, and everything above the torso (shoulders,
 * neck, head, arms) rises by this amount so the neck is not crushed.
 */
export function torsoLift(span: number, torso: number | undefined): number {
  return span * (proportionOf(torso) - 1)
}

/** A point inside the torso span, stretched upward from `anchor`. Points above `spanTop` are lifted whole. */
export function torsoY(y: number, anchor: number, spanTop: number, torso: number | undefined): number {
  const s = proportionOf(torso)
  if (y <= anchor) return y
  if (y <= spanTop) return anchor + (y - anchor) * s
  return y + (spanTop - anchor) * (s - 1)
}

/** Scale a point away from `origin` — an arm lengthened from the shoulder. */
export function scaledFromPoint(
  origin: { x: number; y: number; z: number },
  p: { x: number; y: number; z: number },
  scale: number | undefined
): { x: number; y: number; z: number } {
  const s = proportionOf(scale)
  return {
    x: origin.x + (p.x - origin.x) * s,
    y: origin.y + (p.y - origin.y) * s,
    z: origin.z + (p.z - origin.z) * s
  }
}
