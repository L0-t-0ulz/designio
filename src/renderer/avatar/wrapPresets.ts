/**
 * **Pre-tied wrap presets** — named one-click scarf looks over the existing wrap
 * mechanics (Parisian knot · double wrap · blanket ruana · pin) + width. A preset is
 * pure data: it sets exactly one worn-state (they're mutually exclusive in the sim)
 * and clears the rest, plus a flattering width, so "Infinity" or "Ascot" is a single
 * choice instead of toggling four switches. Applied to a layer (or the start-page
 * config) via `applyWrapPreset`; `?wrapPreset=<name>` and the scarf panel drive it.
 */

/** The scarf fields a wrap preset controls (a structural subset of the layer/config). */
export interface WrapTarget {
  scarfKnot?: boolean
  scarfDouble?: boolean
  scarfBlanket?: boolean
  scarfPin?: boolean
  pinAt?: number
  scarfWidth?: number
}

export interface WrapPreset {
  name: string
  label: string
  /** The exact field set this preset applies (unset = cleared/default). */
  target: WrapTarget
}

export const WRAP_PRESETS: WrapPreset[] = [
  { name: 'draped', label: 'Draped (open)', target: {} },
  { name: 'parisian', label: 'Parisian knot', target: { scarfKnot: true } },
  { name: 'infinity', label: 'Infinity loop', target: { scarfDouble: true, scarfWidth: 0.9 } },
  { name: 'blanket', label: 'Blanket ruana', target: { scarfBlanket: true, scarfWidth: 1.6 } },
  { name: 'ascot', label: 'Ascot (pinned)', target: { scarfPin: true, pinAt: 0.1, scarfWidth: 0.75 } }
]

export const WRAP_PRESET_NAMES: string[] = WRAP_PRESETS.map((p) => p.name)

export function getWrapPreset(name: string): WrapPreset | undefined {
  return WRAP_PRESETS.find((p) => p.name === name)
}

/**
 * Apply a wrap preset in place — set the preset's fields and CLEAR every other wrap
 * field, so switching presets never leaves a stale knot/wrap behind. Pure mutation.
 */
export function applyWrapPreset(t: WrapTarget, preset: WrapPreset): void {
  const g = preset.target
  t.scarfKnot = g.scarfKnot
  t.scarfDouble = g.scarfDouble
  t.scarfBlanket = g.scarfBlanket
  t.scarfPin = g.scarfPin
  t.pinAt = g.pinAt
  t.scarfWidth = g.scarfWidth
}
