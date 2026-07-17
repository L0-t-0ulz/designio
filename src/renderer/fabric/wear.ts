import * as THREE from 'three'

/**
 * Distressed / washed / faded finishes — a procedural **wear map** baked into the
 * albedo that bleaches the base colour toward a lighter, desaturated tone: an
 * overall vintage `faded`, blotchy `acid-wash`, streaky `distressed` abrasion, an
 * `adaptive` wear concentrated at the hem + seams, a soft cloudy all-over
 * `stone-wash` (denim tumbled with pumice), or a smooth even `enzyme-wash`
 * (bio-polished, the most uniform softening). The wear field is pure value-noise
 * (deterministic — no `Math.random`) so it tiles/samples identically each bake
 * and is unit-tested.
 */
export type WearKind = 'faded' | 'acid-wash' | 'distressed' | 'adaptive' | 'stone-wash' | 'enzyme-wash'
export const WEAR_KINDS: WearKind[] = ['faded', 'acid-wash', 'distressed', 'adaptive', 'stone-wash', 'enzyme-wash']

const fract = (x: number): number => x - Math.floor(x)
const hash = (i: number, j: number): number => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453)

/** Smooth bilinear value-noise at `freq` cells across the unit square → [0,1]. */
function vnoise(u: number, v: number, freq: number): number {
  const x = u * freq
  const y = v * freq
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const sx = xf * xf * (3 - 2 * xf)
  const sy = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  const top = a + (b - a) * sx
  const bot = c + (d - c) * sx
  return top + (bot - top) * sy
}

/**
 * The wear/bleach amount `0→1` at (u,v) — `0` keeps the base colour, `1` fully
 * bleaches it. Pure + unit-tested; the renderer bakes it over the albedo.
 */
export function wearValue(kind: WearKind, u: number, v: number): number {
  switch (kind) {
    case 'acid-wash': {
      // blotchy high-contrast wash — thresholded low-frequency clumps
      const n = vnoise(u, v, 5) * 0.7 + vnoise(u + 3.1, v + 1.7, 11) * 0.3
      return Math.min(1, Math.max(0, (n - 0.4) * 2.4))
    }
    case 'distressed': {
      // streaky vertical abrasion — high-freq in u, stretched in v, only the peaks
      const n = vnoise(u, v * 0.25, 26)
      return n > 0.62 ? Math.min(1, (n - 0.62) * 3.4) : 0
    }
    case 'adaptive': {
      // wear where a garment actually wears: concentrated at the hem (bottom) + the
      // vertical edges (side seams), over a light all-over abrasion
      const hem = Math.pow(Math.max(0, (v - 0.55) / 0.45), 1.6) // ramps up over the bottom ~45%
      const edge = Math.pow(Math.max(0, Math.abs(u - 0.5) * 2 - 0.72) / 0.28, 2) // near u=0 / u=1
      const abrasion = vnoise(u, v * 0.5, 18)
      return Math.min(1, (hem + edge) * (0.55 + abrasion * 0.5) + abrasion * 0.12)
    }
    case 'stone-wash': {
      // soft cloudy all-over abrasion — medium-freq mottling, wears everywhere
      // (min > 0) but gentler + more textured than the high-contrast acid-wash
      const n = vnoise(u, v, 8) * 0.55 + vnoise(u + 4.7, v + 2.9, 17) * 0.45
      return Math.min(1, 0.15 + n * 0.55)
    }
    case 'enzyme-wash': {
      // enzyme (bio-polish) wash — enzymes eat the surface fuzz evenly, so it's the
      // smoothest, most uniform all-over softening: a single low-freq octave, tight
      // range (wears everywhere, barely varies — no clumps, streaks or mottle)
      const n = vnoise(u, v, 2)
      return 0.3 + n * 0.18
    }
    default: {
      // faded: soft, broad vintage lightening (two smooth octaves, gentle)
      const n = vnoise(u, v, 3) * 0.6 + vnoise(u + 5.2, v + 2.3, 7) * 0.4
      return 0.2 + n * 0.4 // never fully saturated, never fully white
    }
  }
}

/** The bleached tone a base colour wears toward — lighter + desaturated. Pure. */
export function wearTone(base: number): THREE.Color {
  const c = new THREE.Color(base)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(hsl.h, hsl.s * 0.45, Math.min(0.92, hsl.l + 0.32))
}

/** Paint the wear finish over the albedo — lerp base→bleached tone by the wear
 *  field. Baked at low res + scaled up (smooth) so it's cheap on redraw. */
export function paintWear(ctx: CanvasRenderingContext2D, size: number, base: number, kind: WearKind): void {
  const N = 256
  const off = document.createElement('canvas')
  off.width = off.height = N
  const octx = off.getContext('2d')!
  const img = octx.createImageData(N, N)
  const b = new THREE.Color(base)
  const t = wearTone(base)
  const mix = new THREE.Color()
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const w = wearValue(kind, x / N, y / N)
      mix.copy(b).lerp(t, w)
      const i = (y * N + x) * 4
      img.data[i] = mix.r * 255
      img.data[i + 1] = mix.g * 255
      img.data[i + 2] = mix.b * 255
      img.data[i + 3] = 255
    }
  }
  octx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(off, 0, 0, size, size)
}
