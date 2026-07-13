import type { BodyParams } from './Mannequin'
import type { BodyShape } from './bodyPresets'
import { BASE_MEASUREMENTS_CM } from './measure'

/**
 * **Kids' size range** — toddler → teen age blocks with age-appropriate
 * proportions, not just scaled-down adults: a child carries a relatively bigger
 * head (build stays high while height drops — the head scales with build), a
 * straight up-and-down torso (waist ≥ bust: no adult waist nip) and narrower
 * hips. Deliberately outside the adult sliders' range; applied like a body
 * preset, so garments refit through the same resize path. Pure.
 */
export interface KidsBlock {
  name: string
  label: string
  ageYears: number
  /** Real stature (cm) — the height multiplier is derived from the 175 cm base. */
  statureCm: number
  shape: BodyShape
}

const block = (
  name: string,
  label: string,
  ageYears: number,
  statureCm: number,
  build: number,
  bust: number,
  waist: number,
  hips: number
): KidsBlock => ({
  name,
  label,
  ageYears,
  statureCm,
  shape: { height: statureCm / BASE_MEASUREMENTS_CM.height, build, bust, waist, hips }
})

export const KIDS_BLOCKS: KidsBlock[] = [
  block('toddler', 'Toddler', 2, 92, 0.68, 0.9, 1.14, 0.92),
  block('child', 'Child', 6, 118, 0.72, 0.92, 1.08, 0.93),
  block('tween', 'Tween', 10, 140, 0.78, 0.94, 1.02, 0.95),
  block('teen', 'Teen', 14, 163, 0.88, 0.96, 0.98, 0.97)
]

export const KIDS_BLOCK_NAMES: string[] = KIDS_BLOCKS.map((k) => k.name)

export function getKidsBlock(name: string): KidsBlock | undefined {
  return KIDS_BLOCKS.find((k) => k.name === name)
}

/** Apply a block's shape to a body, keeping the figure (a boy = the male figure). */
export function applyKidsBlock(current: BodyParams, block: KidsBlock): BodyParams {
  return { ...current, ...block.shape }
}
