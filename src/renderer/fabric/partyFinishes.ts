import type { SparkleKind } from './sparkle'
import type { IridescentKind } from './iridescent'

/**
 * **Party headwear finishes** — one-click festive looks for celebration headwear (or
 * anything): each preset combines the existing sparkle + iridescent finishes with a
 * festive colour so a party hat is a single choice instead of dialling three
 * controls. Pure data + `applyPartyFinish`; `?partyFinish=<name>` sets it. (These
 * compose the finishes already in the engine — the presets are the curation.)
 */
export interface PartyTarget {
  sparkle?: SparkleKind
  iridescent?: IridescentKind
  color?: number
}

export interface PartyFinish {
  name: string
  label: string
  /** The exact finish fields this look applies (colour set only when defined). */
  finish: PartyTarget
}

export const PARTY_FINISHES: PartyFinish[] = [
  { name: 'disco', label: 'Disco ball', finish: { sparkle: 'sequins', iridescent: 'holographic' } },
  { name: 'gold-glam', label: 'Gold glam', finish: { sparkle: 'foil', color: 0xd4af37 } },
  { name: 'tinsel', label: 'Silver tinsel', finish: { sparkle: 'foil', color: 0xc7ccd6 } },
  { name: 'neon', label: 'Neon rave', finish: { iridescent: 'oil-slick', color: 0x39ff14 } },
  { name: 'frost', label: 'Frosted ice', finish: { sparkle: 'beading', color: 0xd6ebf5 } }
]

export const PARTY_FINISH_NAMES: string[] = PARTY_FINISHES.map((p) => p.name)

export function getPartyFinish(name: string): PartyFinish | undefined {
  return PARTY_FINISHES.find((p) => p.name === name)
}

/**
 * Apply a party finish in place — set the preset's sparkle + iridescent (clearing the
 * other), and its festive colour when the preset defines one. Pure mutation.
 */
export function applyPartyFinish(t: PartyTarget, preset: PartyFinish): void {
  t.sparkle = preset.finish.sparkle
  t.iridescent = preset.finish.iridescent
  if (preset.finish.color !== undefined) t.color = preset.finish.color
}
