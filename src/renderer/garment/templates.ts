import type { NecklineStyle, PleatStyle } from '../cloth/Garment'
export type { PleatStyle } from '../cloth/Garment'
export const PLEAT_STYLES: PleatStyle[] = ['knife', 'box', 'accordion', 'cartridge', 'gather']

/** A garment id from the registry (see garments/registry.ts). */
export type GarmentType = string
export type SleeveStyle = 'none' | 'short' | 'long'
/** Sleeve shapes (the sleeve library). Active when the sleeve isn't 'none'. */
export type SleeveShape = 'set-in' | 'raglan' | 'dolman' | 'bishop' | 'puff' | 'bell'
export const SLEEVE_SHAPES: SleeveShape[] = ['set-in', 'raglan', 'dolman', 'bishop', 'puff', 'bell']
/** Collar / lapel styles (active when the `collar` detail is on). */
export type CollarStyle = 'band' | 'shirt' | 'mandarin' | 'peterpan' | 'notch'
export const COLLAR_STYLES: CollarStyle[] = ['band', 'shirt', 'mandarin', 'peterpan', 'notch']
/** Pocket styles (the pocket library; active when the `pocket` detail is on). */
export type PocketStyle = 'patch' | 'welt' | 'jetted' | 'flap' | 'bellows'
export const POCKET_STYLES: PocketStyle[] = ['patch', 'welt', 'jetted', 'flap', 'bellows']

export interface GarmentParams {
  /** Overall length, 0 (short) … 1 (long). */
  length: number
  /** Looseness added to the body radius, in metres. */
  ease: number
  /** Extra radius at the hem (A-line flare), in metres. */
  flare: number
  /** Neckline style for tops/dresses. */
  neckline?: NecklineStyle
  /** Sleeves for tops/dresses. */
  sleeve?: SleeveStyle
  /** Sleeve shape (set-in / raglan / dolman / bishop / puff / bell). */
  sleeveShape?: SleeveShape
  // ---- construction detail (all optional) ----
  /** Collar stand — raises/closes the neckline + a collar band on the pattern. */
  collar?: boolean
  /** Which collar/lapel shape to draw when `collar` is on (default 'band'). */
  collarStyle?: CollarStyle
  /** Fitted cuff at the sleeve hem (+ a cuff turn-up line on the sleeve pattern). */
  cuff?: boolean
  /** Extra hem fullness (a fuller, pleated skirt/dress/leg) + pleat lines. */
  pleats?: boolean
  /** Pleat/gather fold style when `pleats` is on (knife / box / accordion / cartridge / gather). */
  pleatStyle?: PleatStyle
  /** Waist darts — a more fitted, shaped waist + dart wedges on the pattern. */
  dart?: boolean
  /** Patch pocket(s) on the front (a pocket panel on the pattern + a 3D patch). */
  pocket?: boolean
  /** Pocket shape when `pocket` is on (patch / welt / jetted / flap / bellows). */
  pocketStyle?: PocketStyle
  /** Rolled hem — a shorter, finished hem (turn-up). */
  hem?: boolean
  /** Front closure — a centre-front placket with buttons (or a zip). */
  closure?: boolean
  /** Real inner lining — a satiny contrast layer inside, shown at the openings. */
  lined?: boolean
  /** Interfacing — a structured, crisper drape that holds its shape. */
  interfaced?: boolean
  /** Constructed waistband at the top of a skirt/trouser. */
  waistband?: boolean
  /** Neckline facing — a clean inner finish at the neck. */
  facing?: boolean
  /** Functional drawstring — a cord at the waist/hood with two aglet-tipped ends. */
  drawstring?: boolean
  /** Seam allowance in mm for the flat pattern's cut line (default 10). */
  seam?: number
  /** Draw matching notches on the pattern (default true). */
  notches?: boolean
}

export const DEFAULT_PARAMS: GarmentParams = {
  length: 0.6,
  ease: 0.015,
  flare: 0.05,
  neckline: 'scoop',
  sleeve: 'short'
}
