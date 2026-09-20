/**
 * **Sunglasses frame styles** — the four blocks, as the dimensions opticians spec
 * them in.
 *
 * A frame is written on its own temple as `lens▫bridge` in millimetres, so that is
 * how the styles are given here, and `unitsPerMm` converts to the head frame. Sizing
 * a lens as a fraction of the head is what keeps a frame looking like eyewear on a
 * head of any size — an optician fits by face width, not by a constant.
 */

/** The standard adult face width a frame is drafted for, in mm. */
export const FACE_WIDTH_MM = 150

/**
 * The rendered head's half-breadth in collider radii is 0.87 (`?probeHead=1`), so a
 * head is 1.74 units across. This converts a frame's millimetres into that frame.
 */
export const HEAD_UNITS_ACROSS = 1.74
export const unitsPerMm = HEAD_UNITS_ACROSS / FACE_WIDTH_MM

export type SunglassesStyle = 'wayfarer' | 'aviator' | 'round' | 'cat-eye'
export const SUNGLASSES_STYLES: SunglassesStyle[] = ['wayfarer', 'aviator', 'round', 'cat-eye']

export interface FrameSpec {
  /** Lens width × height, and the bridge between them — the numbers on the temple. */
  lensMm: number
  lensHighMm: number
  bridgeMm: number
  /** Rim section, in mm. Acetate is chunky; a metal frame is wire. */
  rimMm: number
  /** Acetate rims are moulded plastic, metal ones are drawn wire. */
  metal: boolean
  /** How far the outer corner sweeps up, as a fraction of the lens height. */
  upsweep: number
  /** A teardrop lens is wider at the top and drops to a rounded point. */
  teardrop: boolean
  /** The aviator's extra bar across the top of both lenses. */
  browBar: boolean
  /** Lens tint, as a hex colour. */
  tint: number
}

/**
 * The four blocks. The lens sizes are the ones each style is actually made in: a
 * wayfarer is a 52▫18, an aviator is the big 58 mm teardrop, a round frame is a
 * small 47 mm circle, and a cat-eye is wide and shallow with the corners swept up.
 */
export const FRAMES: Record<SunglassesStyle, FrameSpec> = {
  wayfarer: { lensMm: 52, lensHighMm: 42, bridgeMm: 18, rimMm: 5, metal: false, upsweep: 0.12, teardrop: false, browBar: false, tint: 0x121216 },
  aviator: { lensMm: 58, lensHighMm: 52, bridgeMm: 14, rimMm: 1.6, metal: true, upsweep: 0, teardrop: true, browBar: true, tint: 0x3a2a12 },
  round: { lensMm: 47, lensHighMm: 47, bridgeMm: 21, rimMm: 1.8, metal: true, upsweep: 0, teardrop: false, browBar: false, tint: 0x1a1410 },
  'cat-eye': { lensMm: 54, lensHighMm: 42, bridgeMm: 17, rimMm: 6, metal: false, upsweep: 0.55, teardrop: false, browBar: false, tint: 0x18121c }
}

/**
 * Distance from the centre line to a lens centre, in head-frame units: half a bridge
 * plus half a lens.
 */
export function lensOffset(f: FrameSpec): number {
  return ((f.bridgeMm + f.lensMm) / 2) * unitsPerMm
}

/** Overall frame width — what an optician calls the frame's total, lens▫bridge▫lens. */
export function frameWidthMm(f: FrameSpec): number {
  return f.lensMm * 2 + f.bridgeMm
}

/**
 * The outline of one lens, as a closed loop of `n` points in the head frame's x/y,
 * centred on the lens.
 *
 * An ellipse is the base. `upsweep` lifts the outer corner, which is the whole of a
 * cat-eye. `teardrop` widens the top and pulls the bottom to a rounded point, which
 * is the whole of an aviator. `side` is −1 for the avatar's left lens, so the
 * asymmetric shapes mirror rather than both leaning the same way.
 */
export function lensOutline(f: FrameSpec, side: -1 | 1, n = 40): [number, number][] {
  const hw = (f.lensMm / 2) * unitsPerMm
  const hh = (f.lensHighMm / 2) * unitsPerMm
  const out: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2
    let x = Math.cos(th)
    let y = Math.sin(th)
    if (f.teardrop) {
      // wider across the top, tapering to a soft point below
      const down = Math.max(0, -y)
      x *= 1 - 0.45 * down * down
      y = y < 0 ? y * 1.05 : y * 0.92
    }
    if (f.upsweep > 0) {
      // the outer half only: `outer` is 1 at the temple corner, 0 at the bridge
      const outer = Math.max(0, x * side)
      y += f.upsweep * outer * outer * (0.5 + 0.5 * Math.max(0, y))
    }
    out.push([x * hw, y * hh])
  }
  return out
}
