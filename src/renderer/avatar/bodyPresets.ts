import type { BodyParams } from './Mannequin'

/**
 * Body-shape **presets** for diversity beyond the two runway figures — plus,
 * athletic, petite, tall, curvy. Each preset is a set of the mannequin's shape
 * multipliers (height · build · per-region girth), kept inside the sliders' valid
 * range so every preset produces valid cloth colliders. Applied on top of the
 * current figure (female/male), so e.g. "athletic" works for either.
 */
export type BodyShape = Pick<BodyParams, 'height' | 'build' | 'bust' | 'waist' | 'hips'>

export interface BodyPreset {
  name: string
  label: string
  shape: BodyShape
}

export const BODY_PRESETS: BodyPreset[] = [
  { name: 'runway', label: 'Runway', shape: { height: 1, build: 1, bust: 1, waist: 1, hips: 1 } },
  { name: 'curvy', label: 'Curvy', shape: { height: 1, build: 1.05, bust: 1.16, waist: 0.9, hips: 1.2 } },
  { name: 'plus', label: 'Plus', shape: { height: 1, build: 1.2, bust: 1.18, waist: 1.24, hips: 1.18 } },
  { name: 'athletic', label: 'Athletic', shape: { height: 1.03, build: 1.1, bust: 0.98, waist: 0.9, hips: 0.95 } },
  { name: 'petite', label: 'Petite', shape: { height: 0.88, build: 0.94, bust: 0.94, waist: 0.92, hips: 0.94 } },
  { name: 'tall', label: 'Tall', shape: { height: 1.13, build: 0.97, bust: 0.98, waist: 0.94, hips: 0.98 } }
]

export const BODY_PRESET_NAMES: string[] = BODY_PRESETS.map((p) => p.name)

export function getBodyPreset(name: string): BodyPreset | undefined {
  return BODY_PRESETS.find((p) => p.name === name)
}

/** Apply a preset's shape to a body, keeping the current figure (bodyType). */
export function applyBodyPreset(current: BodyParams, preset: BodyPreset): BodyParams {
  return { ...current, ...preset.shape }
}
