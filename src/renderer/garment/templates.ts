import type { TubeSpec } from '../cloth/Garment'
import type { Measurements } from '../avatar/Mannequin'

export type GarmentType = 'dress' | 'skirt' | 'top' | 'pants'

export const GARMENT_TYPES: GarmentType[] = ['dress', 'skirt', 'top', 'pants']

export interface GarmentParams {
  /** Overall length, 0 (short) … 1 (long). */
  length: number
  /** Looseness added to the body radius, in metres. */
  ease: number
  /** Extra radius at the hem (A-line flare), in metres. */
  flare: number
}

export const DEFAULT_PARAMS: GarmentParams = { length: 0.6, ease: 0.03, flare: 0.05 }

const RADIAL = 60

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
  const rings = Math.max(10, Math.min(56, Math.round(h / 0.022)))
  return { rings, radial, topY, bottomY, radiusTop, radiusBottom, centerX }
}

/**
 * Parametric garment templates. Each returns one or more pinned tube pieces
 * (the top ring is anchored) sized to the body measurements + ease. Pants return
 * two leg tubes. Reused by `GarmentController` which builds solvers per piece.
 */
export function buildGarmentSpecs(
  type: GarmentType,
  p: GarmentParams,
  m: Measurements
): TubeSpec[] {
  const { ease, flare, length: L } = p

  switch (type) {
    case 'dress': {
      const hemY = 0.9 - L * (0.9 - 0.2) // mini → maxi
      return [piece(m.chestY, hemY, m.chestR + ease, m.hipR + ease + flare)]
    }
    case 'skirt': {
      const hemY = Math.max(0.15, m.waistY - (0.18 + L * 0.72))
      return [piece(m.waistY, hemY, m.waistR + ease, m.hipR + ease + flare)]
    }
    case 'top': {
      const hemY = m.hipY + 0.06 - L * 0.34 // crop → tunic
      return [piece(m.chestY, hemY, m.chestR + ease, m.hipR * 0.9 + ease + flare * 0.5)]
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
