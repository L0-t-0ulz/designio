import type { GarmentDefinition } from './schema'

/**
 * The garment catalog (data). Each entry composes parametric pieces; the factory
 * turns them into simulated cloth. The original dress/skirt/top/pants are
 * expressed here with the same construction the hardcoded templates used.
 */
export const GARMENTS: GarmentDefinition[] = [
  {
    id: 'dress',
    name: 'Dress',
    category: 'dress',
    pieces: [
      {
        kind: 'bodyTube',
        topAnchor: 'shoulder',
        hemDropHi: 0.55,
        hemDropLo: 1.25,
        topR: 'chest',
        botR: 'hip',
        cinchWaist: true,
        neckline: true
      },
      { kind: 'sleeves' }
    ],
    supports: { neckline: true, sleeve: true, length: true, ease: true, flare: true },
    defaults: { length: 0.6, ease: 0.03, flare: 0.05, neckline: 'scoop', sleeve: 'short' }
  },
  {
    id: 'skirt',
    name: 'Skirt',
    category: 'bottom',
    pieces: [
      {
        kind: 'bodyTube',
        topAnchor: 'waist',
        hemDropHi: 0.18,
        hemDropLo: 0.9,
        topR: 'waist',
        botR: 'hip'
      }
    ],
    supports: { length: true, ease: true, flare: true },
    defaults: { length: 0.6, ease: 0.03, flare: 0.05 }
  },
  {
    id: 'top',
    name: 'Top',
    category: 'top',
    pieces: [
      {
        kind: 'bodyTube',
        topAnchor: 'shoulder',
        hemDropHi: 0.44,
        hemDropLo: 0.78,
        topR: 'chest',
        botR: 'hip90',
        flareScale: 0.5,
        neckline: true
      },
      { kind: 'sleeves' }
    ],
    supports: { neckline: true, sleeve: true, length: true, ease: true, flare: true },
    defaults: { length: 0.6, ease: 0.03, flare: 0.05, neckline: 'scoop', sleeve: 'short' }
  },
  {
    id: 'pants',
    name: 'Pants',
    category: 'bottom',
    pieces: [{ kind: 'legTubes' }],
    supports: { length: true, ease: true, flare: true },
    defaults: { length: 0.6, ease: 0.03, flare: 0.05 }
  }
]

const BY_ID = new Map(GARMENTS.map((g) => [g.id, g]))

export function getGarment(id: string): GarmentDefinition {
  return BY_ID.get(id) ?? GARMENTS[0]
}
