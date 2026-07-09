import * as THREE from 'three'

/**
 * Sheer **lace / broderie** finishes — an alpha-cutout you can see through, with a
 * scalloped edge. Each pattern is a periodic alpha field (`0` = open hole, `1` =
 * opaque thread) baked into a tiling alpha map; the material then cuts the holes
 * with `alphaTest` (real see-through, no transparency sorting). The alpha field is
 * pure so it's unit-tested.
 */
export type LacePattern = 'chantilly' | 'geometric' | 'fishnet'
export const LACE_PATTERNS: LacePattern[] = ['chantilly', 'geometric', 'fishnet']

const frac = (x: number): number => x - Math.floor(x)

/**
 * Lace opacity at (u,v) in tile space with `cells` motifs per axis — `0` is an open
 * hole (sheer), `1` is opaque thread. Pure + periodic (wraps every tile).
 */
export function laceAlpha(pattern: LacePattern, u: number, v: number, cells = 4): number {
  if (pattern === 'fishnet') {
    // a diagonal diamond net — thread along the two diagonal line sets, holes between
    const line = (x: number): number => (Math.min(frac(x), 1 - frac(x)) < 0.13 ? 1 : 0)
    return Math.max(line((u + v) * cells), line((u - v) * cells))
  }
  const gx = frac(u * cells) - 0.5
  const gy = frac(v * cells) - 0.5
  const r = Math.hypot(gx, gy)
  if (pattern === 'geometric') {
    // a lattice of rings + centre dots (a crochet/guipure look)
    return Math.abs(r - 0.34) < 0.09 || r < 0.07 ? 1 : 0
  }
  // chantilly — a six-petal flower per cell with an open centre, joined by grid threads
  const ang = Math.atan2(gy, gx)
  const petalR = 0.34 * (0.55 + 0.45 * Math.cos(ang * 6))
  const flower = r < petalR && r > 0.1 ? 1 : 0
  const thread = Math.min(frac(u * cells), 1 - frac(u * cells)) < 0.04 || Math.min(frac(v * cells), 1 - frac(v * cells)) < 0.04 ? 1 : 0
  return Math.max(flower, thread)
}

/**
 * A scalloped lower-edge profile — the crest height `0→1` at horizontal position
 * `u` for `count` scallops (0 at each cusp, 1 at each scallop centre). Pure.
 */
export function scallopValue(u: number, count = 6): number {
  return Math.sin(Math.PI * frac(u * count))
}

const cache = new Map<LacePattern, THREE.CanvasTexture>()

/** Bake a lace pattern into a tiling alpha map (grayscale; green channel = opacity)
 *  with a scalloped opaque border along the tile's lower edge. */
export function makeLaceAlphaMap(pattern: LacePattern, size = 256): THREE.CanvasTexture {
  const cached = cache.get(pattern)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      let a = laceAlpha(pattern, u, v)
      // a scalloped solid hem band along the bottom edge of the tile
      if (v > 1 - scallopValue(u) * 0.14) a = 1
      const val = a * 255
      const i = (y * size + x) * 4
      img.data[i] = val
      img.data[i + 1] = val
      img.data[i + 2] = val
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(4, 5)
  tex.anisotropy = 4
  cache.set(pattern, tex)
  return tex
}
