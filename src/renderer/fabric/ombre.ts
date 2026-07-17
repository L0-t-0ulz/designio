import * as THREE from 'three'
import { bayerDither } from './dither'

/** Dip-dye / ombré gradient direction across the garment. */
export type OmbreDirection = 'top-down' | 'bottom-up' | 'radial' | 'diagonal'
export const OMBRE_DIRECTIONS: OmbreDirection[] = ['top-down', 'bottom-up', 'radial', 'diagonal']

/**
 * The blend factor `0→1` (base colour → dipped tone) at a normalized canvas
 * position `(u, v)`. Pure + unit-tested; the renderer bakes it into the albedo.
 * `top-down` fades base→dip from top edge to hem, `bottom-up` the reverse,
 * `radial` base at the centre → dip at the edges, `diagonal` base at the
 * top-left corner → dip at the bottom-right (a 45° sweep across the panel).
 */
export function ombreT(direction: OmbreDirection, u: number, v: number): number {
  switch (direction) {
    case 'top-down':
      return v
    case 'bottom-up':
      return 1 - v
    case 'diagonal':
      return (u + v) / 2
    default: {
      const dx = u - 0.5
      const dy = v - 0.5
      return Math.min(1, Math.hypot(dx, dy) * 2)
    }
  }
}

/** The "dipped" tone for a base colour — deeper + a touch more saturated. Pure so
 *  it's unit-tested; derived from the base so the ombré tracks a recolour. */
export function ombreDip(base: number): THREE.Color {
  const c = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, Math.min(1, hsl.s + 0.06), Math.max(0.03, hsl.l - 0.3))
}

/** sRGB byte triple `[r,g,b]` (0–255) of a colour, matching CSS/canvas space. */
function srgbBytes(c: THREE.Color): [number, number, number] {
  const h = c.getHexString()
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/**
 * Paint a dip-dye / ombré gradient (base → dipped tone) across the albedo canvas —
 * baked **per-pixel** through the unit-tested `ombreT` field (so the 3D bake matches
 * the tested blend), with **ordered dithering** so the smooth ramp doesn't 8-bit band
 * (stair-step contours). Lerps in sRGB bytes to match the old canvas-gradient look.
 */
export function paintOmbre(ctx: CanvasRenderingContext2D, size: number, base: number, direction: OmbreDirection): void {
  const [br, bg, bb] = srgbBytes(new THREE.Color(base))
  const [dr, dg, db] = srgbBytes(ombreDip(base))
  const img = ctx.createImageData(size, size)
  const clamp = (n: number): number => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = ombreT(direction, x / size, y / size)
      const dd = bayerDither(x, y)
      const i = (y * size + x) * 4
      img.data[i] = clamp(br + (dr - br) * t + dd)
      img.data[i + 1] = clamp(bg + (dg - bg) * t + dd)
      img.data[i + 2] = clamp(bb + (db - bb) * t + dd)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}
