import type { GarmentCategory, GarmentDefinition } from './schema'

// Shared piece recipes (keep definitions terse + consistent).
const upperTube = {
  kind: 'bodyTube' as const,
  topAnchor: 'shoulder' as const,
  hemDropHi: 0.44,
  hemDropLo: 0.78,
  topR: 'chest' as const,
  botR: 'hip90' as const,
  flareScale: 0.5,
  neckline: true
}
const dressTube = {
  kind: 'bodyTube' as const,
  topAnchor: 'shoulder' as const,
  hemDropHi: 0.55,
  hemDropLo: 1.25,
  topR: 'chest' as const,
  botR: 'hip' as const,
  cinchWaist: true,
  neckline: true
}
const skirtTube = {
  kind: 'bodyTube' as const,
  topAnchor: 'waist' as const,
  hemDropHi: 0.18,
  hemDropLo: 0.9,
  topR: 'waist' as const,
  botR: 'hip' as const
}
// A long outer layer (blazer/coat) hanging from the shoulders past the hip.
const coatTube = {
  kind: 'bodyTube' as const,
  topAnchor: 'shoulder' as const,
  hemDropHi: 0.5,
  hemDropLo: 1.2,
  topR: 'chest' as const,
  botR: 'hip' as const,
  flareScale: 0.7,
  neckline: true
}
const upperCaps = { neckline: true, sleeve: true, length: true, ease: true, flare: true, collar: true, cuff: true, pleats: true, dart: true, pocket: true, hem: true, closure: true, lined: true, interfaced: true, facing: true, drawstring: true, ruffles: true, boning: true, ribbing: true, yoke: true, princess: true }
// Sleeveless tops/dresses (no `sleeves` piece) — everything the body tube can render but sleeve/cuff.
const sleevelessCaps = { ...upperCaps, sleeve: false, cuff: false }
// Strapless (tube top) — also drop the neckline + collar (there's no shoulder edge to shape).
const straplessCaps = { ...sleevelessCaps, neckline: false, collar: false }
// Tailored trousers also press a crease + carry a break (skirts/leggings don't).
const trousersCaps = { crease: true, trouserBreak: true }
const lowerCaps = { length: true, ease: true, flare: true, pleats: true, dart: true, pocket: true, hem: true, waistband: true, drawstring: true, ruffles: true, closure: true, lined: true, interfaced: true }

/**
 * The garment catalog (data). Each entry composes parametric pieces; the factory
 * turns them into simulated cloth. Breadth comes from data + composition, not
 * bespoke mesh code — adding a garment is a new object here.
 */
export const GARMENTS: GarmentDefinition[] = [
  // ---- tops ----
  {
    id: 'top',
    name: 'T-shirt',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.6, ease: 0.015, flare: 0.05, neckline: 'scoop', sleeve: 'short' }
  },
  {
    id: 'tank',
    name: 'Tank top',
    category: 'top',
    icon: 'top',
    pieces: [upperTube],
    supports: sleevelessCaps,
    defaults: { length: 0.5, ease: 0.01, flare: 0.04, neckline: 'scoop', sleeve: 'none' }
  },
  {
    id: 'crop-top',
    name: 'Crop top',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.16, ease: 0.012, flare: 0.02, neckline: 'scoop', sleeve: 'short' }
  },
  {
    id: 'long-sleeve',
    name: 'Long-sleeve',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.62, ease: 0.02, flare: 0.04, neckline: 'crew', sleeve: 'long' }
  },
  {
    id: 'polo',
    name: 'Polo shirt',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    // knit collared tee: a shirt collar + a short button placket.
    defaults: { length: 0.6, ease: 0.025, flare: 0.03, neckline: 'crew', sleeve: 'short', collar: true, collarStyle: 'shirt', closure: true },
    defaultFabric: 'oxford'
  },
  {
    id: 'tube-top',
    name: 'Tube top',
    category: 'top',
    icon: 'top',
    pieces: [upperTube],
    supports: straplessCaps,
    defaults: { length: 0.22, ease: 0.008, flare: 0.02, neckline: 'strapless', sleeve: 'none' }
  },
  {
    id: 'sports-bra',
    name: 'Sports bra',
    category: 'top',
    icon: 'top',
    // a shoulder-hung band ending at the underbust (chest90) — cropped bra → longline by length
    pieces: [{ kind: 'bodyTube', topAnchor: 'shoulder', hemDropHi: 0.3, hemDropLo: 0.42, topR: 'chest', botR: 'chest90', flareScale: 0.15, neckline: true }],
    supports: { neckline: true, length: true, ease: true, dart: true, hem: true, ribbing: true, lined: true },
    // compression fit: negative ease on a high-stretch knit squeezes the body; ribbing = the elastic band.
    defaults: { length: 0.25, ease: -0.006, flare: 0, neckline: 'scoop', sleeve: 'none', ribbing: true },
    defaultFabric: 'spandex'
  },
  {
    id: 'tunic',
    name: 'Tunic',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.88, ease: 0.03, flare: 0.09, neckline: 'v', sleeve: 'long' }
  },
  {
    id: 'blouse',
    name: 'Blouse',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.66, ease: 0.03, flare: 0.12, neckline: 'v', sleeve: 'long', sleeveShape: 'bishop', closure: true },
    defaultFabric: 'silk-charmeuse'
  },
  {
    id: 'hoodie',
    name: 'Hoodie',
    category: 'top',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    hood: true,
    closureStyle: 'zip',
    // relaxed zip-up pullover: a real draped hood + a front zip + a kangaroo patch pocket.
    defaults: { length: 0.7, ease: 0.06, flare: 0.06, neckline: 'crew', sleeve: 'long', pocket: true, closure: true, drawstring: true, ribbing: true },
    defaultFabric: 'french-terry'
  },

  // ---- bottoms ----
  {
    id: 'skirt',
    name: 'A-line skirt',
    category: 'bottom',
    icon: 'skirt',
    pieces: [skirtTube],
    supports: lowerCaps,
    defaults: { length: 0.6, ease: 0.015, flare: 0.05 }
  },
  {
    id: 'pencil-skirt',
    name: 'Pencil skirt',
    category: 'bottom',
    icon: 'skirt',
    pieces: [skirtTube],
    supports: lowerCaps,
    defaults: { length: 0.55, ease: 0.01, flare: 0 }
  },
  {
    id: 'maxi-skirt',
    name: 'Maxi skirt',
    category: 'bottom',
    icon: 'skirt',
    pieces: [skirtTube],
    supports: lowerCaps,
    defaults: { length: 0.95, ease: 0.02, flare: 0.12, pleats: true, pleatStyle: 'knife' }
  },
  {
    id: 'pants',
    name: 'Trousers',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: { ...lowerCaps, ...trousersCaps },
    // classic tailored default: a pressed crease + a slight break at the ankle
    defaults: { length: 0.6, ease: 0.015, flare: 0.05, crease: true, trouserBreak: true }
  },
  {
    id: 'shorts',
    name: 'Shorts',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: lowerCaps,
    defaults: { length: 0.1, ease: 0.02, flare: 0.03 }
  },
  {
    id: 'wide-leg',
    name: 'Wide-leg',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: { ...lowerCaps, ...trousersCaps },
    defaults: { length: 0.98, ease: 0.03, flare: 0.18, waistband: true, drawstring: true }
  },
  {
    id: 'cargo',
    name: 'Cargo pants',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: { ...lowerCaps, ...trousersCaps },
    defaults: { length: 0.62, ease: 0.045, flare: 0.06, pocket: true, pocketStyle: 'bellows', waistband: true },
    defaultFabric: 'chino-twill'
  },
  {
    id: 'slim-pants',
    name: 'Slim trousers',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: { ...lowerCaps, ...trousersCaps },
    // tapered straight leg — low ease + no flare narrows to the ankle.
    defaults: { length: 1.0, ease: 0.008, flare: 0, hem: true }
  },
  {
    id: 'joggers',
    name: 'Joggers',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: { ...lowerCaps, ribbing: true },
    // tapered sweatpant: drawstring waistband + a ribbed knit ankle cuff.
    defaults: { length: 0.97, ease: 0.045, flare: 0, waistband: true, drawstring: true, ribbing: true },
    defaultFabric: 'french-terry'
  },
  {
    id: 'leggings',
    name: 'Leggings',
    category: 'bottom',
    icon: 'pants',
    pieces: [{ kind: 'legTubes' }],
    supports: lowerCaps,
    // second-skin stretch — zero ease hugs the leg to the ankle.
    defaults: { length: 1.0, ease: 0, flare: 0 },
    defaultFabric: 'spandex'
  },
  {
    id: 'high-waist-leggings',
    name: 'High-waist leggings',
    category: 'bottom',
    icon: 'pants',
    pieces: [
      // a fixed high-rise panel: waist → past the hip, overlapping the leg-tube tops
      { kind: 'bodyTube', topAnchor: 'waist', hemDropHi: 0.22, hemDropLo: 0.22, topR: 'waist', botR: 'hip' },
      { kind: 'legTubes' }
    ],
    supports: lowerCaps,
    // second-skin compression; the waistband detail reads as the wide elastic rise.
    defaults: { length: 1.0, ease: -0.004, flare: 0, waistband: true },
    defaultFabric: 'spandex'
  },

  // ---- dresses ----
  {
    id: 'dress',
    name: 'Dress',
    category: 'dress',
    icon: 'dress',
    pieces: [dressTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.6, ease: 0.015, flare: 0.05, neckline: 'scoop', sleeve: 'short' }
  },
  {
    id: 'sheath',
    name: 'Sheath dress',
    category: 'dress',
    icon: 'dress',
    pieces: [dressTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.55, ease: 0.008, flare: 0.01, neckline: 'crew', sleeve: 'short', princess: true }
  },
  {
    id: 'slip-dress',
    name: 'Slip dress',
    category: 'dress',
    icon: 'dress',
    pieces: [dressTube],
    supports: sleevelessCaps,
    defaults: { length: 0.72, ease: 0.012, flare: 0.05, neckline: 'strapless', sleeve: 'none' },
    defaultFabric: 'silk-charmeuse'
  },
  {
    id: 'gown',
    name: 'Gown',
    category: 'dress',
    icon: 'dress',
    pieces: [dressTube],
    supports: sleevelessCaps,
    defaults: { length: 0.98, ease: 0.02, flare: 0.2, neckline: 'strapless', sleeve: 'none', boning: true },
    defaultFabric: 'satin'
  },

  // ---- one-pieces ----
  {
    id: 'jumpsuit',
    name: 'Jumpsuit',
    category: 'onepiece',
    icon: 'pants',
    pieces: [
      {
        kind: 'bodyTube',
        topAnchor: 'shoulder',
        // the torso extends past the hip so it overlaps the leg-tube tops (no bare crotch gap)
        hemDropHi: 0.58,
        hemDropLo: 0.58,
        topR: 'chest',
        botR: 'hip',
        neckline: true
      },
      { kind: 'legTubes' },
      { kind: 'sleeves' }
    ],
    supports: upperCaps,
    defaults: { length: 0.92, ease: 0.02, flare: 0.05, neckline: 'scoop', sleeve: 'none' }
  },
  {
    id: 'swimsuit',
    name: 'Swimsuit',
    category: 'onepiece',
    icon: 'top',
    // a snug one-piece: shoulder → just past the hip (fixed — no length to trail), hourglass-cinched
    pieces: [{ kind: 'bodyTube', topAnchor: 'shoulder', hemDropHi: 0.6, hemDropLo: 0.6, topR: 'chest', botR: 'hip90', cinchWaist: true, neckline: true }],
    supports: { neckline: true, ease: true, dart: true, lined: true, boning: true },
    // compression fit on a swim knit; scoop back-compatible neckline.
    defaults: { length: 0.5, ease: -0.006, flare: 0, neckline: 'scoop', sleeve: 'none' },
    defaultFabric: 'spandex'
  },

  // ---- outerwear ----
  {
    id: 'blazer',
    name: 'Blazer',
    category: 'outerwear',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    // structured: notch lapels + a button front + welt breast/hip pockets.
    defaults: { length: 0.68, ease: 0.05, flare: 0.05, neckline: 'v', sleeve: 'long', collar: true, collarStyle: 'notch', pocket: true, pocketStyle: 'welt', closure: true, lined: true, interfaced: true },
    defaultFabric: 'wool-flannel'
  },
  {
    id: 'coat',
    name: 'Coat',
    category: 'outerwear',
    icon: 'dress',
    pieces: [coatTube, { kind: 'sleeves' }],
    supports: upperCaps,
    defaults: { length: 0.85, ease: 0.06, flare: 0.08, neckline: 'v', sleeve: 'long', collar: true, collarStyle: 'notch', pocket: true, pocketStyle: 'flap', closure: true, lined: true, interfaced: true },
    defaultFabric: 'wool-flannel'
  },
  {
    id: 'cardigan',
    name: 'Cardigan',
    category: 'outerwear',
    icon: 'top',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    // open-front knit: a button front, ribbed hem/cuffs + patch pockets.
    defaults: { length: 0.74, ease: 0.06, flare: 0.05, neckline: 'v', sleeve: 'long', closure: true, ribbing: true, pocket: true, pocketStyle: 'patch' },
    defaultFabric: 'cable-knit'
  },
  {
    id: 'bomber',
    name: 'Bomber jacket',
    category: 'outerwear',
    icon: 'top',
    closureStyle: 'zip',
    pieces: [upperTube, { kind: 'sleeves' }],
    supports: upperCaps,
    // cropped zip jacket with a ribbed hem + cuffs and welt pockets.
    defaults: { length: 0.34, ease: 0.07, flare: 0.03, neckline: 'crew', sleeve: 'long', closure: true, ribbing: true, pocket: true, pocketStyle: 'welt' },
    defaultFabric: 'leather'
  },
  // ---- headwear / neckwear (cloth-sim, via the headTube piece) ----
  {
    id: 'snood',
    name: 'Snood',
    category: 'outerwear',
    icon: 'top',
    // a knit tube around the neck that drapes onto the shoulders (a cowl)
    pieces: [{ kind: 'headTube', anchor: 'neck', dropHi: 0.14, dropLo: 0.34, topScale: 1.6, botScale: 2.8 }],
    supports: { length: true, ease: true, flare: true },
    defaults: { length: 0.55, ease: 0.02, flare: 0.03 },
    defaultFabric: 'cable-knit'
  },
  {
    id: 'beanie',
    name: 'Beanie',
    category: 'outerwear',
    icon: 'top',
    // a knit cap over the crown, gathered at the top — pins to the head, so it turns/nods with it
    pieces: [{ kind: 'headTube', anchor: 'crown', dropHi: 0.26, dropLo: 0.32, topScale: 0.13, botScale: 1.28 }],
    supports: { length: true, ease: true, flare: true }, // flare widens the brim (headTube rBot)
    defaults: { length: 0.5, ease: 0.005, flare: 0 },
    defaultFabric: 'rib-knit'
  },
  {
    id: 'scarf',
    name: 'Scarf',
    category: 'outerwear',
    icon: 'top',
    // a wide knit panel draped once around the neck with the two ends hanging down the front
    pieces: [{ kind: 'scarfPanel', width: 0.28, wrapEase: 0.05, tailHi: 0.42, tailLo: 0.85 }],
    supports: { length: true, ease: true },
    defaults: { length: 0.6, ease: 0.01 },
    defaultFabric: 'cable-knit'
  }
]

const BY_ID = new Map(GARMENTS.map((g) => [g.id, g]))

export function getGarment(id: string): GarmentDefinition {
  return BY_ID.get(id) ?? GARMENTS[0]
}

export const GARMENT_IDS = GARMENTS.map((g) => g.id)

/** Categories that actually have garments, in display order + labels. */
export const GARMENT_CATEGORIES: { id: GarmentCategory; label: string }[] = (
  [
    ['top', 'Tops'],
    ['bottom', 'Bottoms'],
    ['dress', 'Dresses'],
    ['onepiece', 'One-pieces'],
    ['outerwear', 'Outerwear']
  ] as [GarmentCategory, string][]
).filter(([id]) => GARMENTS.some((g) => g.category === id)).map(([id, label]) => ({ id, label }))

export function garmentsByCategory(cat: GarmentCategory): GarmentDefinition[] {
  return GARMENTS.filter((g) => g.category === cat)
}
