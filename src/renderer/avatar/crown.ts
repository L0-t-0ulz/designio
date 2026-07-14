/**
 * The **crown shape library** — blocked-felt crease styles for the structured-hat
 * accessories (the fedora block): teardrop · centre-dent · diamond · telescope
 * (pork-pie). Each style is a pure **plan-disc depth field** (x = right,
 * z = forward, 1 unit = the crown radius): how far the felt is pressed straight
 * down at that point of the crown top. The accessory builder displaces the crown
 * dome's vertices by it; the fields fade to zero before the crown wall so the
 * block's silhouette stays clean.
 */
export type CrownStyle = 'dome' | 'teardrop' | 'centre-dent' | 'diamond' | 'telescope'
export const CROWN_STYLES: CrownStyle[] = ['dome', 'teardrop', 'centre-dent', 'diamond', 'telescope']
export const CROWN_LABELS: Record<CrownStyle, string> = {
  dome: 'Dome',
  teardrop: 'Teardrop',
  'centre-dent': 'C-dent',
  diamond: 'Diamond',
  telescope: 'Telescope'
}
/** The classic fedora crease. */
export const DEFAULT_CROWN: CrownStyle = 'teardrop'

const smooth = (t: number): number => {
  const s = Math.max(0, Math.min(1, t))
  return s * s * (3 - 2 * s)
}

/**
 * Crease depth (head-radius units, ≥ 0) pressed into the crown top at plan
 * point (x, z). Pure; zero outside the unit disc and at the crown wall.
 */
export function crownDrop(style: CrownStyle, x: number, z: number): number {
  const r = Math.hypot(x, z)
  if (r >= 1) return 0
  switch (style) {
    case 'dome':
      return 0
    case 'centre-dent': {
      // one lengthwise gutter down the middle, running front↔back,
      // fading out before it reaches the wall
      const gutter = smooth(1 - Math.abs(x) / 0.4)
      const fade = smooth((0.92 - r) / 0.3)
      return 0.26 * gutter * fade
    }
    case 'teardrop': {
      // an oval bowl, wider at the BACK (−z) — the classic fedora teardrop
      const w = 0.5 - 0.16 * z
      const q = (x / w) ** 2 + (z / 0.74) ** 2
      return 0.3 * smooth(1 - q)
    }
    case 'diamond': {
      const q = Math.abs(x) / 0.56 + Math.abs(z) / 0.8
      return 0.3 * smooth(1 - q)
    }
    case 'telescope': {
      // the pork-pie: a ring gutter near the edge — the centre stays popped
      return 0.32 * smooth(1 - Math.abs(r - 0.6) / 0.26)
    }
  }
}
