import * as THREE from 'three'

/**
 * Faux-fur / shearling / fleece **pile** finishes — a fuzzy, matte surface for
 * trims, collars + full coats. Rendered as a dense directional pile **normal map**
 * (strands leaning + a downward comb) plus a high-roughness / soft-sheen recipe, so
 * it reads as fur without extra geometry. The pile field + recipe are pure, so
 * they're unit-tested; the renderer bakes the normal map.
 */
export type FurKind = 'shearling' | 'faux-fur' | 'fleece'
export const FUR_KINDS: FurKind[] = ['shearling', 'faux-fur', 'fleece']

const fract = (x: number): number => x - Math.floor(x)
const hash = (i: number, j: number): number => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453)

/**
 * The pile normal of a fur finish at (u,v) with `cells` strands per axis — each
 * strand tip leans a hashed direction over a shared downward comb; between strands
 * the surface softens toward up. Pure + periodic (wraps per tile) → unit-tested.
 */
export function furNormal(kind: FurKind, u: number, v: number, cells: number): [number, number, number] {
  // wrap the strand cell modulo `cells` so the baked tile is seamless when repeated
  const cu = Math.floor(u * cells) % cells
  const cv = Math.floor(v * cells) % cells
  const fu = fract(u * cells) - 0.5
  const fv = fract(v * cells) - 0.5
  const a = hash(cu, cv) * Math.PI * 2 // strand lean direction
  const lean = 0.35 + 0.5 * hash(cu + 5, cv + 2) // how far it tips
  const curl = kind === 'shearling' ? 0.5 : kind === 'fleece' ? 0.15 : 0.3 // shearling swirls, fleece is short
  const comb = kind === 'fleece' ? -0.25 : -0.45 // pile lies downward (−v); fleece stands more upright
  let nx = Math.cos(a) * lean + fu * curl
  let ny = Math.sin(a) * lean + comb + fv * curl
  let nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  nx /= len
  ny /= len
  nz /= len
  return [nx, ny, nz]
}

export interface FurParams {
  roughness: number
  sheen: number
  sheenRoughness: number
  normalStrength: number
  /** Strands per baked tile + how many times the map repeats across the garment. */
  cells: number
  repeat: number
}

export function furParams(kind: FurKind): FurParams {
  switch (kind) {
    case 'faux-fur':
      // long, soft directional pile with a gentle sheen down the strands
      return { roughness: 0.9, sheen: 0.55, sheenRoughness: 0.5, normalStrength: 1.3, cells: 12, repeat: 3 }
    case 'fleece':
      // short, dense, very matte fuzz
      return { roughness: 0.98, sheen: 0.3, sheenRoughness: 0.65, normalStrength: 0.8, cells: 26, repeat: 6 }
    default:
      // shearling — curly, plush, matte
      return { roughness: 0.96, sheen: 0.4, sheenRoughness: 0.6, normalStrength: 1.1, cells: 18, repeat: 5 }
  }
}

const cache = new Map<FurKind, THREE.CanvasTexture>()

/** Bake a fur finish's pile normal map into a tiling CanvasTexture (renderer). */
export function makeFurNormalMap(kind: FurKind, size = 256): THREE.CanvasTexture {
  const cached = cache.get(kind)
  if (cached) return cached
  const { cells, repeat } = furParams(kind)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = furNormal(kind, x / size, y / size, cells)
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
  cache.set(kind, tex)
  return tex
}
