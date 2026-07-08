/**
 * A named **textile colour library** so a design's colour maps to a real
 * production reference (a code + name a factory can match), the way a studio
 * spec'd colour would cite a Pantone TPX/TCX chip.
 *
 * These are a **curated open reference palette** (hand-picked fashion colours with
 * a `TR-` "textile reference" code) — not the proprietary Pantone colour data.
 * `nearestNamedColor` maps *any* picked colour to its closest library reference,
 * so the tech pack always shows a production-matchable name.
 */
export interface NamedColor {
  /** Production reference code (curated `TR-####`). */
  code: string
  name: string
  hex: number
}

export const NAMED_COLORS: NamedColor[] = [
  // neutrals
  { code: 'TR-1000', name: 'Bright White', hex: 0xf6f6f2 },
  { code: 'TR-1010', name: 'Cloud Cream', hex: 0xece7db },
  { code: 'TR-1020', name: 'Oat Beige', hex: 0xd8ccb4 },
  { code: 'TR-1030', name: 'Sand Taupe', hex: 0xbead8f },
  { code: 'TR-1040', name: 'Silver Grey', hex: 0xb8bcbf },
  { code: 'TR-1050', name: 'Ash Grey', hex: 0x8a8f94 },
  { code: 'TR-1060', name: 'Slate Grey', hex: 0x565c63 },
  { code: 'TR-1070', name: 'Charcoal', hex: 0x33373c },
  { code: 'TR-1080', name: 'Jet Black', hex: 0x181a1d },
  // reds
  { code: 'TR-2000', name: 'Chili Red', hex: 0xc0392b },
  { code: 'TR-2010', name: 'Crimson', hex: 0xa01c2e },
  { code: 'TR-2020', name: 'Brick Red', hex: 0x8f3b2e },
  { code: 'TR-2030', name: 'Wine', hex: 0x5e2233 },
  { code: 'TR-2040', name: 'Coral', hex: 0xf07a5a },
  { code: 'TR-2050', name: 'Terracotta', hex: 0xc86a4a },
  // pinks
  { code: 'TR-2500', name: 'Blush Pink', hex: 0xf3c6c6 },
  { code: 'TR-2510', name: 'Rose', hex: 0xd76a86 },
  { code: 'TR-2520', name: 'Magenta', hex: 0xb23a76 },
  { code: 'TR-2530', name: 'Mauve', hex: 0x9c7a94 },
  // oranges / yellows
  { code: 'TR-3000', name: 'Tangerine', hex: 0xe8791f },
  { code: 'TR-3010', name: 'Amber', hex: 0xd9982b },
  { code: 'TR-3020', name: 'Mustard', hex: 0xc9a227 },
  { code: 'TR-3030', name: 'Golden Yellow', hex: 0xf0c674 },
  { code: 'TR-3040', name: 'Lemon', hex: 0xe6df6b },
  { code: 'TR-3050', name: 'Camel', hex: 0xb08d57 },
  // greens
  { code: 'TR-4000', name: 'Lime', hex: 0x9bbf3c },
  { code: 'TR-4010', name: 'Olive', hex: 0x6f7239 },
  { code: 'TR-4020', name: 'Fern Green', hex: 0x4e7a45 },
  { code: 'TR-4030', name: 'Emerald', hex: 0x2f8f6a },
  { code: 'TR-4040', name: 'Forest Green', hex: 0x27503a },
  { code: 'TR-4050', name: 'Sage', hex: 0xa7b39a },
  // teals / cyans
  { code: 'TR-5000', name: 'Teal', hex: 0x2a8f92 },
  { code: 'TR-5010', name: 'Aqua', hex: 0x5bc0c4 },
  { code: 'TR-5020', name: 'Petrol Blue', hex: 0x27596b },
  // blues
  { code: 'TR-6000', name: 'Sky Blue', hex: 0x86b8e0 },
  { code: 'TR-6010', name: 'Cornflower', hex: 0x5b78d6 },
  { code: 'TR-6020', name: 'Cobalt', hex: 0x2f57b0 },
  { code: 'TR-6030', name: 'Classic Navy', hex: 0x25324f },
  { code: 'TR-6040', name: 'Denim Blue', hex: 0x3d5a80 },
  { code: 'TR-6050', name: 'Indigo', hex: 0x2b2c53 },
  // purples
  { code: 'TR-7000', name: 'Lavender', hex: 0xb9a7d6 },
  { code: 'TR-7010', name: 'Violet', hex: 0x7b5bd6 },
  { code: 'TR-7020', name: 'Royal Purple', hex: 0x54327f },
  { code: 'TR-7030', name: 'Plum', hex: 0x59304f },
  // browns
  { code: 'TR-8000', name: 'Tan', hex: 0xb98b5e },
  { code: 'TR-8010', name: 'Chocolate', hex: 0x5a3a2a },
  { code: 'TR-8020', name: 'Espresso', hex: 0x3a2a22 }
]

const r = (hex: number): number => (hex >> 16) & 0xff
const g = (hex: number): number => (hex >> 8) & 0xff
const b = (hex: number): number => hex & 0xff

/**
 * Perceptual-ish colour distance ("redmean") between two packed RGB colours —
 * cheap, no colour-space conversion, and closer to human perception than plain
 * RGB Euclidean. Pure.
 */
export function colorDistance(a: number, c: number): number {
  const rmean = (r(a) + r(c)) / 2
  const dr = r(a) - r(c)
  const dg = g(a) - g(c)
  const db = b(a) - b(c)
  return Math.sqrt((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db)
}

/** The library reference closest to a colour (any picked hue → a production name). */
export function nearestNamedColor(hex: number): NamedColor {
  let best = NAMED_COLORS[0]
  let bestD = Infinity
  for (const nc of NAMED_COLORS) {
    const d = colorDistance(hex, nc.hex)
    if (d < bestD) {
      bestD = d
      best = nc
    }
  }
  return best
}

/** "TR-6030 Classic Navy" — the production reference label for a colour. */
export function colorRefLabel(hex: number): string {
  const nc = nearestNamedColor(hex)
  return `${nc.code} ${nc.name}`
}

/** Whether a colour is an exact library reference (picked from the library, not the wheel). */
export function isExactNamedColor(hex: number): boolean {
  return NAMED_COLORS.some((nc) => nc.hex === hex)
}
