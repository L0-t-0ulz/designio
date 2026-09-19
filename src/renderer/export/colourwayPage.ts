import type { Colorway } from '../studio/document'

/**
 * **Colourway page** for the tech pack — every saved variant of the design, with its
 * colour, fabric and finishes, so a buyer can sign off the range on one page instead
 * of opening the file.
 *
 * The finish-tag logic lives here rather than in the panel because both the swatch
 * grid and this page need the same answer to "what makes this colourway different",
 * and two versions of that would drift.
 */

export interface ColourwaySummary {
  id: string
  name: string
  /** `#rrggbb`, ready to print. */
  hex: string
  color: number
  /** Resolved fabric name, or the raw id when the fabric is unknown. */
  fabric: string
  /** Contrast trim colour, when this colourway sets one. */
  trimHex?: string
  /** Finishes that distinguish this colourway, in a stable order. */
  finishes: string[]
}

export const hexOf = (c: number): string => `#${(c >>> 0).toString(16).padStart(6, '0').slice(-6)}`

/**
 * The finishes that make a colourway distinct, in a fixed order so two colourways
 * with the same finishes always read the same way.
 *
 * Boolean-ish fields contribute a fixed word; the rest contribute their own value.
 */
export function colourwayFinishes(cw: Colorway): string[] {
  return [
    cw.textile,
    cw.tartan && 'tartan',
    cw.ombre && 'ombré',
    cw.wear,
    cw.sparkle,
    cw.iridescent,
    cw.quilt,
    cw.lace && 'lace',
    cw.fur,
    cw.duotone && 'duotone',
    cw.weaveDraft && 'custom weave',
    cw.knitChart && 'knit chart',
    cw.colourwork && 'colourwork',
    cw.trim ? 'contrast trim' : undefined,
    cw.reflectiveTrim ? 'reflective' : undefined,
    cw.thermo ? 'thermochromic' : undefined
  ].filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/** One line of the page. `fabricName` resolves an id; unknown ids fall back to the id
 *  itself, so a retired fabric shows as something a human can still chase. */
export function colourwaySummary(cw: Colorway, fabricName: (id: string) => string | undefined): ColourwaySummary {
  return {
    id: cw.id,
    name: cw.name,
    color: cw.color,
    hex: hexOf(cw.color),
    fabric: fabricName(cw.fabricId) ?? cw.fabricId,
    trimHex: cw.trim && cw.trimColor !== undefined ? hexOf(cw.trimColor) : undefined,
    finishes: colourwayFinishes(cw)
  }
}

/** The whole page, in saved order. */
export function colourwayPage(colorways: readonly Colorway[], fabricName: (id: string) => string | undefined): ColourwaySummary[] {
  return colorways.map((cw) => colourwaySummary(cw, fabricName))
}

/** A one-line tag for the compact swatch grid in the panel. */
export function colourwayTag(cw: Colorway): string | undefined {
  const f = colourwayFinishes(cw)
  return f.length ? f.join(' · ') : undefined
}
