/**
 * **Walk-cycle library** — how the runway walk *reads*: editorial (long, slow,
 * deliberate), commercial (the friendly default), sport (quick, punchy). Each
 * style is pure data — procedural stride/arm amplitudes + cadence, and a playback
 * rate the GLB clip follows — so both body paths walk in character. `commercial`
 * matches the app's historical walk exactly (byte-compat default).
 */

export type WalkStyleName = 'commercial' | 'editorial' | 'sport'

export interface WalkStyle {
  name: WalkStyleName
  label: string
  /** Procedural leg swing amplitude (rad-ish). */
  legAmp: number
  /** Procedural arm swing amplitude. */
  armAmp: number
  /** Procedural cadence (rad/s of the stride oscillator). */
  freq: number
  /** GLB clip playback-rate multiplier (also scales the procedural cadence feel). */
  rate: number
}

export const WALK_STYLES: WalkStyle[] = [
  // the historical walk — friendly, medium stride (values unchanged for byte-compat)
  { name: 'commercial', label: 'Commercial', legAmp: 0.5, armAmp: 0.35, freq: 3.0, rate: 1 },
  // long slow deliberate strides, quiet arms — the editorial runway glide
  { name: 'editorial', label: 'Editorial', legAmp: 0.6, armAmp: 0.22, freq: 2.2, rate: 0.8 },
  // quick punchy cadence with driving arms — the sport walk
  { name: 'sport', label: 'Sport', legAmp: 0.45, armAmp: 0.5, freq: 3.9, rate: 1.25 }
]

export const WALK_STYLE_NAMES: string[] = WALK_STYLES.map((w) => w.name)

export function getWalkStyle(name: string): WalkStyle | undefined {
  return WALK_STYLES.find((w) => w.name === name)
}
