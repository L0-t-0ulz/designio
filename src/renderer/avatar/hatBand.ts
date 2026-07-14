/**
 * The **hat band designer** — the ribbon around a structured hat's crown base
 * (fedora · sun hat): grosgrain ribbon · leather strap · braided cord, plus a
 * side trim (bow · feather · buckle). Pure unit-head-frame numbers (1 unit =
 * head radius) consumed by the accessory builders; the geometry is built in
 * the renderer.
 */
export type HatBandStyle = 'none' | 'grosgrain' | 'leather' | 'cord'
export const HAT_BAND_STYLES: HatBandStyle[] = ['none', 'grosgrain', 'leather', 'cord']
export type BandTrim = 'none' | 'bow' | 'feather' | 'buckle'
export const BAND_TRIMS: BandTrim[] = ['none', 'bow', 'feather', 'buckle']

export interface HatBandParams {
  style: HatBandStyle
  trim: BandTrim
  /** Band colour override; unset = the style's classic default. */
  color?: number
}
export const DEFAULT_HAT_BAND: HatBandParams = { style: 'grosgrain', trim: 'none' }

/** Classic default colour per band style. */
export const BAND_COLORS: Record<Exclude<HatBandStyle, 'none'>, number> = {
  grosgrain: 0x2b2b30, // near-black ribbon
  leather: 0x4a3323, // saddle strap
  cord: 0xb9a06a // waxed natural cord
}

export interface BandProfile {
  /** Ribbon/strap height (unit head frame). */
  height: number
  /** How proud of the crown wall the band stands. */
  standoff: number
  /** Cord-strand radius (cord style only). */
  strandR: number
}

/** The band's cross-section numbers per style. Pure. */
export function bandProfile(style: HatBandStyle): BandProfile | null {
  switch (style) {
    case 'none':
      return null
    case 'grosgrain':
      return { height: 0.24, standoff: 0.03, strandR: 0 }
    case 'leather':
      return { height: 0.14, standoff: 0.04, strandR: 0 }
    case 'cord':
      return { height: 0.2, standoff: 0.05, strandR: 0.045 }
  }
}

/**
 * Braided-cord centreline height at loop position t ∈ [0, 1] for a strand
 * phase (0 or π): a sinusoid whose two phase-shifted strands cross each other
 * around the crown. Closed (y(0) = y(1)); amplitude stays inside the band.
 */
export function braidY(t: number, phase: number, height = bandProfile('cord')!.height): number {
  const waves = 9 // crossings around the crown
  return 0.5 * (height - 2 * bandProfile('cord')!.strandR) * Math.sin(waves * t * Math.PI * 2 + phase)
}

export interface TrimAnchor {
  /** Azimuth from centre-front (radians, + toward the wearer's left side). */
  az: number
  /** Height offset from the band's midline. */
  y: number
  /** Trim scale (unit head frame). */
  scale: number
}

/** Where each trim sits on the band — millinery puts trims at the side-front. Pure. */
export function trimAnchor(trim: BandTrim): TrimAnchor | null {
  switch (trim) {
    case 'none':
      return null
    case 'bow':
      return { az: 1.9, y: 0, scale: 1 }
    case 'feather':
      return { az: 1.7, y: 0.04, scale: 1 }
    case 'buckle':
      return { az: 0, y: 0, scale: 1 } // a buckle reads centre-front
  }
}
