/**
 * The **straw weave material** for the structured sun-hat blocks: the 2/2
 * basket draft (paired ends + picks — exactly how straw is plaited) baked
 * into normal + roughness maps by the weave-draft system, under a **dry
 * sheen** — the silica shine that runs along dried straw without any of a
 * fabric's softness. Pure recipe; the accessory builder bakes and applies it.
 */
import { draftPreset, type WeaveDraft } from '../fabric/weaveDraft'

export interface StrawRecipe {
  draft: WeaveDraft
  /** Weave tiles across the hat surface — coarse enough to read as plait. */
  repeats: number
  normalStrength: number
  color: number
  roughness: number
  /** The dry silica shine along the straw. */
  sheen: number
  sheenColor: number
  sheenRoughness: number
}

/** The sun-hat straw look. Pure. */
export function strawRecipe(): StrawRecipe {
  return {
    draft: draftPreset('basket')!.draft,
    repeats: 18,
    normalStrength: 4.5,
    // deep enough that the key light + sheen don't wash it to white
    // (big pale surfaces bloom — the visor lesson)
    color: 0xc2a468,
    roughness: 0.82,
    sheen: 0.25,
    sheenColor: 0xe8d9ae,
    sheenRoughness: 0.6
  }
}
