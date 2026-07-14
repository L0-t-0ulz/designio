import type { NecklineStyle, PleatStyle } from '../cloth/Garment'
export type { PleatStyle } from '../cloth/Garment'
export const PLEAT_STYLES: PleatStyle[] = ['knife', 'box', 'accordion', 'cartridge', 'gather', 'shirr', 'smock']

/** A garment id from the registry (see garments/registry.ts). */
export type GarmentType = string
export type SleeveStyle = 'none' | 'short' | 'elbow' | 'three-quarter' | 'bracelet' | 'long'
/** Sleeve shapes (the sleeve library). Active when the sleeve isn't 'none'. */
export type SleeveShape = 'set-in' | 'raglan' | 'dolman' | 'bishop' | 'puff' | 'bell'
export const SLEEVE_SHAPES: SleeveShape[] = ['set-in', 'raglan', 'dolman', 'bishop', 'puff', 'bell']
/** Collar / lapel styles (active when the `collar` detail is on). */
export type CollarStyle = 'band' | 'shirt' | 'mandarin' | 'peterpan' | 'notch'
export const COLLAR_STYLES: CollarStyle[] = ['band', 'shirt', 'mandarin', 'peterpan', 'notch']
/** Hem frill styles (ruffles/flounces/godets; active when the `ruffles` detail is on). */
export type FrillStyle = 'ruffle' | 'flounce' | 'godet'
export const FRILL_STYLES: FrillStyle[] = ['ruffle', 'flounce', 'godet']
/** Pocket styles (the pocket library; active when the `pocket` detail is on). */
export type PocketStyle = 'patch' | 'welt' | 'jetted' | 'flap' | 'bellows'
export const POCKET_STYLES: PocketStyle[] = ['patch', 'welt', 'jetted', 'flap', 'bellows']

export interface GarmentParams {
  /** Overall length, 0 (short) … 1 (long). */
  length: number
  /** Looseness added to the body radius, in metres. */
  ease: number
  /** Per-zone ease offsets (m) on top of `ease` — chest · waist · hip land on their own landmarks. */
  easeChest?: number
  easeWaist?: number
  easeHip?: number
  /** Extra radius at the hem (A-line flare), in metres. */
  flare: number
  /** Size-grade length offset (m) — from the layer's grade rules; the factory drops/raises the hem by it. */
  lengthGradeM?: number
  /** Size-grade sleeve-length offset (m) — extends/shortens the sleeve along the arm. */
  sleeveGradeM?: number
  /** Neckline style for tops/dresses. */
  neckline?: NecklineStyle
  /** Sleeves for tops/dresses. */
  sleeve?: SleeveStyle
  /** Sleeve shape (set-in / raglan / dolman / bishop / puff / bell). */
  sleeveShape?: SleeveShape
  /** Balaclava face-opening override (full · eyes · three-hole · open-face). */
  faceStyle?: import('../garments/schema').BalaclavaFace
  /** Balaclava worn state — down over the face (default) or rolled up into a beanie. */
  balaclavaWorn?: import('../garments/schema').BalaclavaWorn
  /** Scarf width multiplier, 0.5 (skinny) … 1.8 (blanket-wide). */
  scarfWidth?: number
  /** Beanie cuff height, 0 (skull-cap edge) … 1 (deep double roll). */
  cuffHeight?: number
  /** Beanie slouch depth, 0 (fitted crown) … 1 (full slouch). */
  slouch?: number
  // ---- construction detail (all optional) ----
  /** Collar stand — raises/closes the neckline + a collar band on the pattern. */
  collar?: boolean
  /** Which collar/lapel shape to draw when `collar` is on (default 'band'). */
  collarStyle?: CollarStyle
  /** Fitted cuff at the sleeve hem (+ a cuff turn-up line on the sleeve pattern). */
  cuff?: boolean
  /** Extra hem fullness (a fuller, pleated skirt/dress/leg) + pleat lines. */
  pleats?: boolean
  /** Pressed trouser crease — sharp fore/aft ridges down each leg (tailored trousers). */
  crease?: boolean
  /** Trouser break — extra leg length that stacks/pools softly on the ankle. */
  trouserBreak?: boolean
  /** Fringe trim — hanging strands along the bottom hem (western / flapper / shawl). */
  fringe?: boolean
  /** Piping — a corded contrast edge along the neckline + hem. */
  piping?: boolean
  /** Seam & topstitch spec — SPI dash pitch + single/double needle rows on the 3D topstitch. */
  stitch?: import('./stitchTypes').StitchSpec
  /** Pleat/gather fold style when `pleats` is on (knife / box / accordion / cartridge / gather). */
  pleatStyle?: PleatStyle
  /** Waist darts — a more fitted, shaped waist + dart wedges on the pattern. */
  dart?: boolean
  /** Patch pocket(s) on the front (a pocket panel on the pattern + a 3D patch). */
  pocket?: boolean
  /** Pocket shape when `pocket` is on (patch / welt / jetted / flap / bellows). */
  pocketStyle?: PocketStyle
  /** Hem shape — straight · high-low · shirttail · handkerchief bottom-edge curve. */
  hemShape?: import('../cloth/Garment').HemShape
  /** Rolled hem — a shorter, finished hem (turn-up). */
  hem?: boolean
  /** Front closure — a centre-front placket with buttons (or a zip). */
  closure?: boolean
  /** Wear the closure **open** (unbuttoned/unzipped): the centre-front seam is unsewn
   *  so the garment really gaps and hangs open — a functional opening. */
  closureOpen?: boolean
  /** Real inner lining — a satiny contrast layer inside, shown at the openings. */
  lined?: boolean
  /** Interfacing — a structured, crisper drape that holds its shape. */
  interfaced?: boolean
  /** Waterlogged rain/swim look — heavier + limp + clinging physics + a wet glossy sheen. */
  wet?: boolean
  /** Trapped-air loft — inflate the garment off the body (a puffer), even without quilting. */
  puff?: boolean
  /** Constructed waistband at the top of a skirt/trouser. */
  waistband?: boolean
  /** Neckline facing — a clean inner finish at the neck. */
  facing?: boolean
  /** Functional drawstring — a cord at the waist/hood with two aglet-tipped ends. */
  drawstring?: boolean
  /** Hem frill — a ruffle/flounce/godet flare at the hem. */
  ruffles?: boolean
  /** Boning / corsetry — a structured bodice that cinches + holds its shape, with
   * visible boning channels + back lacing. */
  boning?: boolean
  /** Knit ribbing trims — ribbed bands at the hem, cuffs + collar (sweatshirt look). */
  ribbing?: boolean
  /** Shoulder/back yoke — a horizontal yoke seam + a yoke pattern piece. */
  yoke?: boolean
  /** Princess seams — curved vertical shaping seams (front + back) instead of darts. */
  princess?: boolean
  /** Which hem frill to draw when `ruffles` is on (ruffle / flounce / godet). */
  frillStyle?: FrillStyle
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
