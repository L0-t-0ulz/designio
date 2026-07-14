/**
 * **3D puff cap embroidery** — a raised puff-embroidered mark on the cap's
 * front panel, as a pure height field over the mark's unit window
 * (u lateral, v vertical, both ∈ [−1, 1]): four classic monogram-style marks
 * (dot · bar · peak · ring) with the soft rounded edges of real puff foam.
 * The accessory builder drapes a patch grid over the dome front and lofts it
 * by this field along the sphere normal.
 */
export type PuffShape = 'none' | 'dot' | 'bar' | 'peak' | 'ring'
export const PUFF_SHAPES: PuffShape[] = ['none', 'dot', 'bar', 'peak', 'ring']

export interface PuffLogoParams {
  shape: PuffShape
  /** Thread colour (embroidery is usually contrast). */
  color: number
}
export const DEFAULT_PUFF_LOGO: PuffLogoParams = { shape: 'none', color: 0xf2efe6 }

const smooth = (t: number): number => {
  const s = Math.max(0, Math.min(1, t))
  return s * s * (3 - 2 * s)
}

/**
 * Puff loft (0…1) at window point (u, v). Pure; zero at the window border so
 * the patch always lands back on the dome.
 */
export function puffHeight(shape: PuffShape, u: number, v: number): number {
  if (Math.abs(u) >= 1 || Math.abs(v) >= 1) return 0
  const r = Math.hypot(u, v)
  switch (shape) {
    case 'none':
      return 0
    case 'dot':
      return smooth((0.55 - r) / 0.25)
    case 'bar':
      return smooth((0.55 - Math.abs(u)) / 0.2) * smooth((0.28 - Math.abs(v)) / 0.15)
    case 'peak': {
      // a chevron / mountain mark rising to its apex at centre
      const spine = 0.35 - 0.9 * Math.abs(u)
      return smooth((0.18 - Math.abs(v - spine)) / 0.12) * smooth((0.75 - Math.abs(u)) / 0.15)
    }
    case 'ring':
      return smooth((0.16 - Math.abs(r - 0.45)) / 0.12)
  }
}
