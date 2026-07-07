import * as THREE from 'three'

/**
 * Quilting finishes — padded panels that **loft** (puff) between stitch lines, for
 * puffers and quilted jackets. `channel` = parallel tubes, `box` = a grid of square
 * pillows, `diamond` = a diagonal cross-hatch of diamond pillows. The puff is a pure
 * height field (unit-tested); the renderer bakes its normal into a tiling map so the
 * pillows catch the light and the stitch lines read as grooves.
 */
export type QuiltPattern = 'channel' | 'diamond' | 'box'
export const QUILT_PATTERNS: QuiltPattern[] = ['channel', 'diamond', 'box']

const fract = (x: number): number => x - Math.floor(x)
/** One pillow across a cell: 0 at the stitch lines (t=0,1), full at the centre.
 *  The `^0.7` fills the top so it reads as a plump quilt puff, not a thin ridge. */
const pillow = (t: number): number => Math.pow(Math.sin(Math.PI * fract(t)), 0.7)

/**
 * Quilt loft height at (u,v) in tile space with `cells` puffs per axis — `1` at a
 * pillow centre, `0` along a stitch line. Pure + periodic (tiles).
 */
export function quiltHeight(pattern: QuiltPattern, u: number, v: number, cells: number): number {
  switch (pattern) {
    case 'channel':
      return pillow(u * cells) // tubes run along v; puff only across u
    case 'diamond': {
      // two diagonal stitch sets → diamond pillows
      return pillow((u + v) * cells) * pillow((u - v) * cells)
    }
    default: // box — a grid of square pillows
      return pillow(u * cells) * pillow(v * cells)
  }
}

/** Unit surface normal of the quilt loft via central differences (like a weave). */
export function quiltNormal(pattern: QuiltPattern, u: number, v: number, cells: number, strength: number): [number, number, number] {
  const e = 0.4 / cells
  const nx = (quiltHeight(pattern, u - e, v, cells) - quiltHeight(pattern, u + e, v, cells)) * strength
  const ny = (quiltHeight(pattern, u, v - e, cells) - quiltHeight(pattern, u, v + e, cells)) * strength
  const nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

/** Per-pattern baking + look tuning (pure → unit-tested). */
export interface QuiltParams {
  cells: number
  repeat: number
  normalStrength: number
  /** A quilted puffer surface reads a touch matte. */
  roughness: number
}

export function quiltParams(pattern: QuiltPattern): QuiltParams {
  switch (pattern) {
    case 'channel':
      return { cells: 8, repeat: 2, normalStrength: 3, roughness: 0.62 }
    case 'diamond':
      return { cells: 7, repeat: 2, normalStrength: 2.6, roughness: 0.6 }
    default: // box
      return { cells: 7, repeat: 2, normalStrength: 2.8, roughness: 0.62 }
  }
}

const cache = new Map<QuiltPattern, THREE.CanvasTexture>()

/** Bake a quilt pattern's loft into a tiling normal map (renderer only). */
export function makeQuiltNormalMap(pattern: QuiltPattern, size = 256): THREE.CanvasTexture {
  const cached = cache.get(pattern)
  if (cached) return cached
  const { cells, repeat, normalStrength } = quiltParams(pattern)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = quiltNormal(pattern, x / size, y / size, cells, normalStrength)
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 4
  cache.set(pattern, tex)
  return tex
}
