/**
 * **Facial hair** — where it grows, which is not "the lower half of the face".
 *
 * A beard has a boundary and the boundary is the style. The one that matters most
 * is the **cheek line**: the upper edge of a full beard runs from the sideburn at
 * the ear down toward the corner of the mouth, and the cheek above it is bare.
 * Fill the whole lower face instead and it reads as fur rather than as a beard.
 *
 * The other boundaries are just as specific. A **moustache** is the philtrum and
 * the upper lip, between the base of the nose and the lip line, no wider than the
 * mouth. A **goatee** is the chin patch, joined to the moustache at the corners.
 * **Stubble** is the full beard's region at a fraction of its length — the same
 * map, worn short.
 *
 * Coordinates are face-local: `x` across (−1 at one ear, +1 at the other) and `y`
 * up (0 at the bottom of the chin, 1 at the sideburn). Pure + unit-tested.
 */

export type BeardStyle = 'none' | 'stubble' | 'moustache' | 'goatee' | 'full'
export const BEARD_STYLES: BeardStyle[] = ['none', 'stubble', 'moustache', 'goatee', 'full']
export const BEARD_LABELS: Record<BeardStyle, string> = {
  none: 'Clean shaven',
  stubble: 'Stubble',
  moustache: 'Moustache',
  goatee: 'Goatee',
  full: 'Full beard'
}

/** Hair length in mm, which is what separates stubble from a beard on one map. */
export const BEARD_LENGTH_MM: Record<BeardStyle, number> = {
  none: 0,
  stubble: 1.5,
  moustache: 7,
  goatee: 9,
  full: 14
}

/** Height of the lip line and of the nose base, in face-local `y`. */
export const LIP_Y = 0.3
export const NOSE_BASE_Y = 0.46
/** Half-width of the mouth — a moustache is no wider than it. */
export const MOUTH_HALF = 0.34
/** Where the chin patch reaches up to. */
export const CHIN_TOP_Y = 0.26

/**
 * The **cheek line**: the height of a full beard's upper edge at `x`.
 *
 * It starts high at the sideburn and falls toward the corner of the mouth, which
 * is what gives a beard its shape. A straight horizontal cut-off across the
 * cheeks is the tell-tale of a beard that has been drawn rather than grown.
 */
export const SIDEBURN_Y = 0.94
export const CHEEK_LINE_AT_MOUTH = 0.5
export function cheekLineY(x: number): number {
  const ax = Math.min(1, Math.abs(x))
  // curved, not a straight chamfer: the line sags toward the mouth
  const t = 1 - ax
  return CHEEK_LINE_AT_MOUTH + (SIDEBURN_Y - CHEEK_LINE_AT_MOUTH) * (1 - t * t)
}

/** The jaw's own outline: how far out the face reaches at height `y`. */
export function jawHalfWidth(y: number): number {
  const u = Math.min(1, Math.max(0, y))
  // narrow at the chin, widening up to the jaw angle below the ear
  return 0.35 + 0.65 * Math.sqrt(u)
}

/**
 * How much hair grows at a face-local point, 0…1.
 *
 * Soft at the edges rather than a hard cut, because hair thins out at a beard's
 * boundary instead of stopping at a line — a hard edge is the other way a drawn
 * beard gives itself away.
 */
export function beardCoverage(style: BeardStyle, x: number, y: number): number {
  if (style === 'none') return 0
  const ax = Math.abs(x)
  if (y < 0 || y > 1 || ax > jawHalfWidth(y)) return 0
  const soft = (v: number, edge = 0.09): number => Math.min(1, Math.max(0, v / edge))

  const moustache = () => {
    // the philtrum and the upper lip, no wider than the mouth
    if (y < LIP_Y || y > NOSE_BASE_Y) return 0
    return soft(MOUTH_HALF - ax) * soft(Math.min(y - LIP_Y, NOSE_BASE_Y - y), 0.05)
  }
  const chin = () => {
    // the chin patch, a little wider than the mouth at its base
    if (y > CHIN_TOP_Y) return 0
    return soft(MOUTH_HALF * 1.15 - ax) * soft(CHIN_TOP_Y - y, 0.07)
  }

  switch (style) {
    case 'moustache':
      return moustache()
    case 'goatee': {
      // the chin patch joined to the moustache down the sides of the mouth
      const link = ax > MOUTH_HALF * 0.55 && ax < MOUTH_HALF * 1.2 && y >= CHIN_TOP_Y && y <= NOSE_BASE_Y ? soft(MOUTH_HALF * 1.2 - ax) : 0
      return Math.max(moustache(), chin(), link)
    }
    case 'stubble':
    case 'full': {
      // everything below the cheek line, and the cheek above it is bare
      const below = soft(cheekLineY(x) - y, 0.12)
      // the lips themselves are not hairy: a shallow gap at the mouth line
      const lips = ax < MOUTH_HALF * 0.9 && Math.abs(y - (LIP_Y + 0.03)) < 0.045 ? 0.25 : 1
      return below * lips * soft(jawHalfWidth(y) - ax)
    }
    default:
      return 0
  }
}

/** Hair length in mm for a style — the same map worn short is stubble. */
export function beardLengthMm(style: BeardStyle): number {
  return BEARD_LENGTH_MM[style]
}

/**
 * Beard colour from the hair colour: facial hair reads a touch warmer and lighter
 * than scalp hair on the same head, which is why a fixed dark patch looks stuck on.
 */
export function beardColour(hair: number): number {
  const r = (hair >> 16) & 0xff
  const g = (hair >> 8) & 0xff
  const b = hair & 0xff
  const c = (v: number): number => Math.min(255, Math.max(0, Math.round(v)))
  return (c(r * 1.12 + 6) << 16) | (c(g * 1.05 + 4) << 8) | c(b * 0.98 + 2)
}
