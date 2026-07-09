import * as THREE from 'three'

/** Dip-dye / ombré gradient direction across the garment. */
export type OmbreDirection = 'top-down' | 'bottom-up' | 'radial'
export const OMBRE_DIRECTIONS: OmbreDirection[] = ['top-down', 'bottom-up', 'radial']

/**
 * The blend factor `0→1` (base colour → dipped tone) at a normalized canvas
 * position `(u, v)`. Pure + unit-tested; the renderer bakes it into the albedo.
 * `top-down` fades base→dip from top edge to hem, `bottom-up` the reverse,
 * `radial` base at the centre → dip at the edges.
 */
export function ombreT(direction: OmbreDirection, u: number, v: number): number {
  switch (direction) {
    case 'top-down':
      return v
    case 'bottom-up':
      return 1 - v
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

/** Paint a dip-dye / ombré gradient (base → dipped tone) across the albedo canvas. */
export function paintOmbre(ctx: CanvasRenderingContext2D, size: number, base: number, direction: OmbreDirection): void {
  const b = '#' + new THREE.Color(base).getHexString()
  const d = '#' + ombreDip(base).getHexString()
  let grad: CanvasGradient
  if (direction === 'radial') {
    grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, b) // base at the centre
    grad.addColorStop(1, d) // dip at the edges
  } else {
    const topDown = direction === 'top-down'
    grad = ctx.createLinearGradient(0, 0, 0, size)
    grad.addColorStop(0, topDown ? b : d)
    grad.addColorStop(1, topDown ? d : b)
  }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
}
