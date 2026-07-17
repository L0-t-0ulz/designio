import * as THREE from 'three'

/**
 * Sparkle finishes for eveningwear — a **sequin/bead scatter** or **metallic
 * foil**. Each is a faceted normal map (so hundreds of tiny facets catch the
 * environment at different angles → glints) plus a metallic/roughness recipe.
 * The facet math is pure (unit-tested); the renderer bakes it into a tiling
 * normal map.
 */
export type SparkleKind = 'sequins' | 'beading' | 'foil' | 'glitter'
export const SPARKLE_KINDS: SparkleKind[] = ['sequins', 'beading', 'foil', 'glitter']

const fract = (x: number): number => x - Math.floor(x)
/** Deterministic hash of a cell → [0,1) (so a sequin's tilt is stable per frame). */
const hash = (i: number, j: number): number => fract(Math.sin(i * 127.1 + j * 311.7) * 43758.5453)

/**
 * The surface normal of a sparkle finish at (u,v) in tile space, with `cells`
 * facets per axis. Sequins = flat discs each tilted a random (hashed) way; beads
 * = little hemispheres; foil = a soft low-frequency crinkle. Gaps between facets
 * read flat (the up-normal). Pure + periodic, so it tiles and is unit-tested.
 */
export function sparkleNormal(kind: SparkleKind, u: number, v: number, cells: number): [number, number, number] {
  let nx: number
  let ny: number
  let nz: number
  if (kind === 'foil') {
    // crinkled metal: gradient of a sum of *integer-harmonic* sines (soft, large
    // facets) — integer frequencies keep it periodic so the tile has no seam.
    const TAU = Math.PI * 2
    const e = 0.5 / cells
    const f = Math.max(2, Math.round(cells * 0.3))
    const h = (x: number, y: number): number =>
      Math.sin(TAU * f * x) * 0.5 + Math.cos(TAU * (f - 1) * y) * 0.5 + Math.sin(TAU * (f - 1) * (x + y)) * 0.4
    nx = (h(u - e, v) - h(u + e, v)) * 1.6
    ny = (h(u, v - e) - h(u, v + e)) * 1.6
    nz = 1
  } else {
    const cu = Math.floor(u * cells)
    const cv = Math.floor(v * cells)
    const fu = fract(u * cells) - 0.5
    const fv = fract(v * cells) - 0.5
    const r = Math.hypot(fu, fv)
    if (r > 0.46) {
      nx = 0
      ny = 0
      nz = 1 // gap between facets — flat
    } else if (kind === 'beading') {
      // a glossy hemisphere: normal points outward from the bead centre
      nx = fu * 2.2
      ny = fv * 2.2
      nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny))
    } else {
      // sequin / glitter: a flat disc tilted a hashed direction + amount. Glitter
      // tilts harder + more randomly (tiny flecks throwing light every which way)
      // and packs many more facets per tile (see sparkleParams.cells).
      const a = hash(cu, cv) * Math.PI * 2
      const tiltBase = kind === 'glitter' ? 0.5 : 0.3
      const tiltVar = kind === 'glitter' ? 0.85 : 0.55
      const tilt = tiltBase + tiltVar * hash(cu + 7, cv + 3)
      nx = Math.cos(a) * tilt
      ny = Math.sin(a) * tilt
      nz = 1
    }
  }
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

/** The metallic/roughness recipe for a sparkle finish (pure → unit-tested). */
export interface SparkleParams {
  metalness: number
  roughness: number
  envMapIntensity: number
  anisotropy: number
  clearcoat: number
  clearcoatRoughness: number
  normalStrength: number
  /** Facets per baked tile + how many times the map repeats across the garment. */
  cells: number
  repeat: number
}

export function sparkleParams(kind: SparkleKind): SparkleParams {
  switch (kind) {
    case 'foil':
      // mirror-bright metal with a directional (anisotropic) streak
      return { metalness: 1, roughness: 0.17, envMapIntensity: 1.6, anisotropy: 0.6, clearcoat: 0, clearcoatRoughness: 0, normalStrength: 0.7, cells: 10, repeat: 3 }
    case 'beading':
      // glassy beads — a clearcoat over a slightly metallic base
      return { metalness: 0.35, roughness: 0.14, envMapIntensity: 1.35, anisotropy: 0, clearcoat: 1, clearcoatRoughness: 0.12, normalStrength: 1, cells: 22, repeat: 5 }
    case 'glitter':
      // dense micro-glitter — a fine scatter of tiny metallic flecks, each glinting
      // independently (many more, smaller facets than the sequin discs)
      return { metalness: 1, roughness: 0.2, envMapIntensity: 1.6, anisotropy: 0.1, clearcoat: 0.15, clearcoatRoughness: 0.3, normalStrength: 1, cells: 40, repeat: 6 }
    default:
      // sequins — many small metallic discs that glint independently
      return { metalness: 0.9, roughness: 0.24, envMapIntensity: 1.5, anisotropy: 0.15, clearcoat: 0.2, clearcoatRoughness: 0.25, normalStrength: 1, cells: 16, repeat: 4 }
  }
}

const cache = new Map<string, THREE.CanvasTexture>()

/** Bake a sparkle finish's faceted normal map into a tiling CanvasTexture (renderer). */
export function makeSparkleNormalMap(kind: SparkleKind, size = 256): THREE.CanvasTexture {
  const cached = cache.get(kind)
  if (cached) return cached
  const { cells, repeat } = sparkleParams(kind)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = sparkleNormal(kind, x / size, y / size, cells)
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
