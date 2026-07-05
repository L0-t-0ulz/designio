import type { NecklineStyle } from '../cloth/Garment'

/** A garment id from the registry (see garments/registry.ts). */
export type GarmentType = string
export type SleeveStyle = 'none' | 'short' | 'long'

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
}

export const DEFAULT_PARAMS: GarmentParams = {
  length: 0.6,
  ease: 0.015,
  flare: 0.05,
  neckline: 'scoop',
  sleeve: 'short'
}
