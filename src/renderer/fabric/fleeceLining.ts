/**
 * **Fleece lining reveal** — a fleece/sherpa lining is only *seen* where the garment
 * opens or folds back: the front placket edges when worn open, a folded cuff, the
 * underside of a fold-back lapel, a hood opening. This computes those reveal zones
 * from the construction + the soft-lining material recipe, so a lined outer shows its
 * fuzzy inside exactly where it would in real life. Pure (no DOM) so it's unit-tested;
 * the tech pack notes the lining + reveals, and the renderer can face the inside faces.
 */
export interface RevealZone {
  name: string
  /** Where on the garment the lining peeks out. */
  where: string
}

export interface LiningConstruction {
  /** Worn open (a functional opening) — the front edges show the lining. */
  open?: boolean
  /** A folded cuff. */
  cuff?: boolean
  /** A fold-back collar (notch / peak / shawl) — the lapel underside is lined. */
  collar?: boolean
  collarStyle?: string
  /** A hood. */
  hood?: boolean
}

const FOLD_LAPELS = ['notch', 'peak', 'shawl']

/** The zones where the fleece lining is revealed, from the construction. Pure. */
export function fleeceRevealZones(c: LiningConstruction): RevealZone[] {
  const zones: RevealZone[] = []
  if (c.open) zones.push({ name: 'Front placket', where: 'the open front edges' })
  if (c.collar && FOLD_LAPELS.includes(c.collarStyle ?? '')) zones.push({ name: 'Lapel', where: 'the fold-back lapel underside' })
  if (c.cuff) zones.push({ name: 'Cuff', where: 'the folded-back cuff' })
  if (c.hood) zones.push({ name: 'Hood', where: 'the hood opening' })
  return zones
}

/** A soft-lining material recipe (matte, fuzzy, high loft) for the reveal. Pure. */
export function fleeceLiningRecipe(): { roughness: number; sheen: number; sheenRoughness: number; pile: number } {
  return { roughness: 0.95, sheen: 0.55, sheenRoughness: 0.9, pile: 0.7 }
}

/** A one-line tech-pack note of the lining + where it shows. Pure. */
export function fleeceLiningNote(zones: RevealZone[]): string {
  if (!zones.length) return 'fleece-lined (fully enclosed — no reveal)'
  return `fleece-lined — revealed at ${zones.map((z) => z.where).join(', ')}`
}
