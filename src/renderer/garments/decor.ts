/**
 * Non-simulated garment decoration — currently **patch pockets**. Pure placement
 * math (unit-tested): where the pockets sit for a garment (a chest pocket on tops
 * & dresses, two hip pockets on skirts & trousers). The stack turns these into
 * flat patch meshes on the garment front; the 2D pattern gets a pocket panel.
 */
import type { Measurements } from '../avatar/Mannequin'
import type { GarmentDefinition } from './schema'

export interface PocketPlacement {
  /** Front-of-garment position (metres). */
  x: number
  y: number
  z: number
  /** Patch size (metres). */
  w: number
  h: number
}

/** Where patch pockets sit for a garment (empty if it has no torso/legs to hang them on). */
export function pocketPlacements(def: GarmentDefinition, m: Measurements): PocketPlacement[] {
  const hasLegs = def.pieces.some((p) => p.kind === 'legTubes')
  const bodyTubes = def.pieces.filter((p) => p.kind === 'bodyTube') as Extract<GarmentDefinition['pieces'][number], { kind: 'bodyTube' }>[]
  const shoulderTop = bodyTubes.some((p) => p.topAnchor === 'shoulder')
  const waistTop = bodyTubes.some((p) => p.topAnchor === 'waist')

  // Trousers / skirts → two front hip pockets.
  if (hasLegs || waistTop) {
    const z = m.hipR * 0.9 + 0.025
    const x = m.hipHalfX * 0.5
    const y = m.hipY + 0.05
    return [
      { x: -x, y, z, w: 0.12, h: 0.13 },
      { x, y, z, w: 0.12, h: 0.13 }
    ]
  }
  // Tops / dresses → a single left chest patch pocket.
  if (shoulderTop) {
    return [{ x: -m.chestR * 0.55, y: m.chestY - 0.02, z: m.chestR + 0.03, w: 0.1, h: 0.11 }]
  }
  return []
}
