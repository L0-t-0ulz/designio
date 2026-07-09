import type { GarmentParams } from '../garment/templates'

/** Top-level grouping for the garment picker. */
export type GarmentCategory = 'top' | 'bottom' | 'dress' | 'onepiece' | 'outerwear'

/**
 * A garment = a category + an ordered list of parametric **pieces** + a
 * declaration of which construction params it exposes. Adding a garment is a
 * data change (a new definition), not new mesh code — the factory turns the
 * pieces into simulated cloth by composing the existing tube/sew primitives.
 */
export interface GarmentDefinition {
  id: string
  name: string
  category: GarmentCategory
  pieces: PieceSpec[]
  /** Which construction controls the UI should show for this garment. */
  supports: ConstructionCaps
  /** Starting fit/style values (applied when the garment is selected). */
  defaults: Partial<GarmentParams>
  defaultFabric?: string
  /** Which silhouette icon to draw in the picker (defaults by category). */
  icon?: GarmentIcon
  /** Draw a hood (a draped cowl behind the neck) — e.g. a hoodie. */
  hood?: boolean
  /** How the front closure reads when enabled: a button placket (default) or a zip. */
  closureStyle?: 'button' | 'zip'
}

/** The four base silhouette icons the picker can draw. */
export type GarmentIcon = 'top' | 'skirt' | 'dress' | 'pants'

/** Construction controls a garment supports (drives the dynamic UI). */
export interface ConstructionCaps {
  neckline?: boolean
  sleeve?: boolean
  length?: boolean
  ease?: boolean
  flare?: boolean
  // ---- construction detail ----
  collar?: boolean
  cuff?: boolean
  pleats?: boolean
  dart?: boolean
  pocket?: boolean
  hem?: boolean
  closure?: boolean
  lined?: boolean
  interfaced?: boolean
  waistband?: boolean
  facing?: boolean
  drawstring?: boolean
  ruffles?: boolean
  boning?: boolean
  ribbing?: boolean
  yoke?: boolean
  princess?: boolean
}

export type PieceSpec = BodyTubePiece | LegTubesPiece | SleevesPiece | HeadTubePiece

/**
 * A tube wrapped around the torso (top/dress/skirt). Anchored at a body landmark,
 * its hem drops `hemDrop*` metres below at length 0…1; radii read from body
 * measurements so it fits any figure/size.
 */
export interface BodyTubePiece {
  kind: 'bodyTube'
  /** Body landmark the top edge hangs from. */
  topAnchor: 'shoulder' | 'waist'
  /** Metres the hem sits below `topAnchor` at length = 0 and length = 1. */
  hemDropHi: number
  hemDropLo: number
  /** Top radius source (chest for tops/dresses, waist for skirts). */
  topR: 'chest' | 'waist'
  /** Bottom radius source (full hip, or 90% hip for a closer top). */
  botR: 'hip' | 'hip90'
  /** Multiplier on the flare added at the hem (default 1). */
  flareScale?: number
  /** Cinch a waist (bust → waist → hip hourglass). */
  cinchWaist?: boolean
  /** Shape a neckline at the top edge (tops/dresses). */
  neckline?: boolean
}

/** The two trouser legs (hip → knee/ankle by length). */
export interface LegTubesPiece {
  kind: 'legTubes'
}

/** Sleeves along the arm colliders; length comes from `params.sleeve`. */
export interface SleevesPiece {
  kind: 'sleeves'
}

/**
 * A tube around the **head or neck** (cowl · snood · gaiter · beanie) — anchored at
 * the crown or the neck, running down over the head/neck and colliding with the head/
 * neck capsules. Radii read from the head/neck measurements so it fits any figure/size.
 */
export interface HeadTubePiece {
  kind: 'headTube'
  /** Where the top edge hangs from — the crown (over the head) or the neck (around it). */
  anchor: 'crown' | 'neck'
  /** Metres the top edge sits above the anchor landmark (default 0). */
  riseHi?: number
  /** Metres it drops below the top edge at length = 0 and length = 1. */
  dropHi: number
  dropLo: number
  /** Radius multiples on the head/neck radius at the top / bottom edge. */
  topScale: number
  botScale: number
}
