import type { NecklineStyle, TubeSpec } from '../cloth/Garment'
import type { Measurements } from '../avatar/Mannequin'

export type GarmentType = 'dress' | 'skirt' | 'top' | 'pants'
export type SleeveStyle = 'none' | 'short' | 'long'

export const GARMENT_TYPES: GarmentType[] = ['dress', 'skirt', 'top', 'pants']

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
  ease: 0.03,
  flare: 0.05,
  neckline: 'scoop',
  sleeve: 'short'
}

const RADIAL = 60
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** One tube piece; `rings` scaled to its height for even resolution. */
function piece(
  topY: number,
  bottomY: number,
  radiusTop: number,
  radiusBottom: number,
  centerX = 0,
  radial = RADIAL
): TubeSpec {
  const h = Math.max(0.05, topY - bottomY)
  const rings = Math.max(10, Math.min(60, Math.round(h / 0.022)))
  return { rings, radial, topY, bottomY, radiusTop, radiusBottom, centerX }
}

/**
 * Parametric garment templates → pinned tube pieces sized to the body. Tops and
 * dresses get a shaped **neckline** (straps at the shoulders + a neck dip) and
 * dresses get a **cinched waist**; skirts/pants are waist/hip anchored.
 */
export function buildGarmentSpecs(
  type: GarmentType,
  p: GarmentParams,
  m: Measurements
): TubeSpec[] {
  const { ease, flare, length: L } = p
  const neckline = p.neckline ?? 'scoop'

  switch (type) {
    case 'dress': {
      const topY = m.shoulderY
      const hemY = 0.9 - L * (0.9 - 0.2) // mini → maxi
      return [
        {
          ...piece(topY, hemY, m.chestR + ease, m.hipR + ease + flare),
          neckline,
          shoulderY: m.shoulderY,
          radiusWaist: m.waistR + ease * 0.6,
          waistT: clamp((topY - m.waistY) / (topY - hemY), 0.2, 0.7)
        }
      ]
    }
    case 'skirt': {
      const hemY = Math.max(0.15, m.waistY - (0.18 + L * 0.72))
      return [piece(m.waistY, hemY, m.waistR + ease, m.hipR + ease + flare)]
    }
    case 'top': {
      const topY = m.shoulderY
      const hemY = m.hipY + 0.06 - L * 0.34 // crop → tunic
      return [
        {
          ...piece(topY, hemY, m.chestR + ease, m.hipR * 0.9 + ease + flare * 0.5),
          neckline,
          shoulderY: m.shoulderY
        }
      ]
    }
    case 'pants': {
      const hemY = m.kneeY - L * (m.kneeY - m.ankleY) // shorts → full length
      const rTop = m.thighR + ease
      const rBot = m.thighR * 0.6 + ease * 0.6 + flare * 0.4
      return [
        piece(m.hipY, hemY, rTop, rBot, -m.hipHalfX, 40),
        piece(m.hipY, hemY, rTop, rBot, m.hipHalfX, 40)
      ]
    }
  }
}
