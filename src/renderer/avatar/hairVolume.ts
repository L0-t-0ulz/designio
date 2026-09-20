import type { Hairstyle } from './face'

/**
 * **Hair-volume aware fit** — thick hair takes up room under a hat, so a voluminous
 * style effectively enlarges the head girth and may push the fit up a size. Pure,
 * unit-tested: `hairVolumeCm` is the extra circumference each style adds, and
 * `effectiveHeadCircCm` folds it into the measured girth so the head-sizing readout
 * can recommend the size for head + hair.
 */
const HAIR_VOLUME_CM: Record<Hairstyle, number> = {
  bald: 0,
  // cut to the head, so it takes less room than a short bowl standing off it
  pixie: 0.3,
  // braided flat to the scalp: almost none, which is half the reason for the style
  cornrows: 0.4,
  short: 0.5,
  // the cap is close and the tail hangs behind the hat entirely
  ponytail: 0.7,
  bob: 1.2,
  long: 1.8,
  // a crown bun is the classic reason a hat will not sit down: it is not extra
  // girth so much as a lump under the crown, and it costs more than an afro does
  bun: 3.6,
  afro: 3.2
}

/** Extra head circumference (cm) a hairstyle adds under a hat. Pure. */
export function hairVolumeCm(style: Hairstyle): number {
  return HAIR_VOLUME_CM[style] ?? 0
}

/** The measured head girth plus the hairstyle's volume (cm). Pure. */
export function effectiveHeadCircCm(circCm: number, style: Hairstyle): number {
  return circCm + hairVolumeCm(style)
}
