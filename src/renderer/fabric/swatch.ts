import * as THREE from 'three'

/**
 * Turn a **fabric swatch photo** into a seamless, tiling PBR material — a base
 * albedo (edges healed so it repeats without a visible seam), a normal map
 * derived from the photo's luminance (so the weave/pile reads as micro-relief),
 * a roughness estimate, and an average tint colour.
 *
 * The pixel math lives in pure functions here (unit-tested in Node); the
 * renderer-only `buildSwatchTextures` bakes them into `CanvasTexture`s.
 */

/** Perceptual luminance of an 8-bit RGB pixel, 0…255. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Average colour of an RGBA buffer as a packed 0xRRGGBB number. */
export function averageColor(data: Uint8ClampedArray | number[]): number {
  let r = 0
  let g = 0
  let b = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const R = Math.round(r / n) & 0xff
  const G = Math.round(g / n) & 0xff
  const B = Math.round(b / n) & 0xff
  return (R << 16) | (G << 8) | B
}

/**
 * Cross-fade strength for the pixel `k` columns in from an edge, over a border
 * band of width `band`: `0.5` right at the edge (a 50/50 mix with the opposite
 * edge → the two boundaries meet) fading to `0` (untouched original) at the
 * inner end of the band.
 */
export function edgeBlendAlpha(k: number, band: number): number {
  if (band <= 0) return 0
  return 0.5 * Math.max(0, 1 - k / band)
}

/**
 * Heal an image so it tiles without a seam. Within a border band, mirror-blend
 * the left/right (then top/bottom) columns so each boundary pair meets at their
 * average — at the very edge the mix is 50/50, so the repeat boundary is exactly
 * continuous, fading back to the untouched original a band-width in. The interior
 * keeps its detail. Returns a fresh RGBA buffer.
 */
export function makeSeamless(data: Uint8ClampedArray | number[], w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < out.length; i++) out[i] = data[i]

  const bandX = Math.max(1, Math.floor(w / 4))
  for (let y = 0; y < h; y++) {
    for (let k = 0; k < bandX; k++) {
      const a = edgeBlendAlpha(k, bandX)
      const li = (y * w + k) * 4
      const ri = (y * w + (w - 1 - k)) * 4
      for (let c = 0; c < 3; c++) {
        const L = data[li + c]
        const R = data[ri + c]
        out[li + c] = L * (1 - a) + R * a
        out[ri + c] = R * (1 - a) + L * a
      }
    }
  }

  const bandY = Math.max(1, Math.floor(h / 4))
  const mid = new Uint8ClampedArray(out) // blend the top/bottom of the horizontally-healed buffer
  for (let x = 0; x < w; x++) {
    for (let k = 0; k < bandY; k++) {
      const a = edgeBlendAlpha(k, bandY)
      const ti = (k * w + x) * 4
      const bi = ((h - 1 - k) * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const T = mid[ti + c]
        const B = mid[bi + c]
        out[ti + c] = T * (1 - a) + B * a
        out[bi + c] = B * (1 - a) + T * a
      }
    }
  }
  return out
}

/**
 * Derive a tangent-space normal map from a luminance height field (values 0…1),
 * via central differences with wrap-around (so the normal map tiles too). A flat
 * field → the neutral up-normal (128,128,255). Returns an RGBA buffer.
 */
export function normalFromLuma(lum: Float32Array | number[], w: number, h: number, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h * 4)
  const at = (x: number, y: number): number => lum[(((y % h) + h) % h) * w + (((x % w) + w) % w)]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength
      let nx = -dx
      let ny = -dy
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      const i = (y * w + x) * 4
      out[i] = (nx * 0.5 + 0.5) * 255
      out[i + 1] = (ny * 0.5 + 0.5) * 255
      out[i + 2] = (nz / len * 0.5 + 0.5) * 255
      out[i + 3] = 255
    }
  }
  return out
}

/**
 * A defensible roughness estimate from a swatch: most cloth is matte (rough),
 * and only bright/smooth fabrics (satin, silk) read shinier — so roughness
 * falls monotonically as mean brightness rises. Clamped to a sane cloth band.
 */
export function estimateRoughness(data: Uint8ClampedArray | number[]): number {
  let sum = 0
  const n = data.length / 4
  for (let i = 0; i < data.length; i += 4) sum += luminance(data[i], data[i + 1], data[i + 2])
  const mean = sum / n / 255 // 0…1
  return Math.max(0.45, Math.min(0.92, 0.85 - 0.35 * mean))
}

/** The baked, ready-to-apply textures + scalars for a fabric-swatch material. */
export interface SwatchTextures {
  albedo: THREE.CanvasTexture
  normal: THREE.CanvasTexture
  roughness: number
  baseColor: number
  tiles: number
}

/** Dispose a swatch's GPU textures (call on replace / clear / layer delete). */
export function disposeSwatch(s: SwatchTextures | null): void {
  if (!s) return
  s.albedo.dispose()
  s.normal.dispose()
}

type SwatchSource = HTMLImageElement | HTMLCanvasElement

/**
 * Bake a fabric swatch photo (or canvas) into a seamless tiling PBR material —
 * renderer only. Draws the source square (cover), heals the seam, derives the
 * normal map from luminance, estimates roughness, and averages the tint.
 */
export function buildSwatchTextures(source: SwatchSource, size = 512, tiles = 6, normalStrength = 2.5): SwatchTextures {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  // cover-fit the source into the square tile
  const sw = 'naturalWidth' in source ? source.naturalWidth || source.width : source.width
  const sh = 'naturalHeight' in source ? source.naturalHeight || source.height : source.height
  const scale = Math.max(size / sw, size / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, (size - dw) / 2, (size - dh) / 2, dw, dh)

  const raw = ctx.getImageData(0, 0, size, size).data
  const seamless = makeSeamless(raw, size, size)

  // albedo
  const albedoCanvas = document.createElement('canvas')
  albedoCanvas.width = albedoCanvas.height = size
  const actx = albedoCanvas.getContext('2d')!
  const aimg = actx.createImageData(size, size)
  aimg.data.set(seamless)
  actx.putImageData(aimg, 0, 0)

  // normal from luminance
  const lum = new Float32Array(size * size)
  for (let p = 0; p < size * size; p++) lum[p] = luminance(seamless[p * 4], seamless[p * 4 + 1], seamless[p * 4 + 2]) / 255
  const nrm = normalFromLuma(lum, size, size, normalStrength)
  const normalCanvas = document.createElement('canvas')
  normalCanvas.width = normalCanvas.height = size
  const nctx = normalCanvas.getContext('2d')!
  const nimg = nctx.createImageData(size, size)
  nimg.data.set(nrm)
  nctx.putImageData(nimg, 0, 0)

  const albedo = new THREE.CanvasTexture(albedoCanvas)
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping
  albedo.repeat.set(tiles, tiles)
  albedo.anisotropy = 4

  const normal = new THREE.CanvasTexture(normalCanvas)
  normal.colorSpace = THREE.NoColorSpace
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping
  normal.repeat.set(tiles, tiles)
  normal.anisotropy = 4

  return { albedo, normal, roughness: estimateRoughness(seamless), baseColor: averageColor(seamless), tiles }
}

/**
 * A procedural fabric swatch canvas (renderer only) — a coloured, noisy diagonal
 * twill. Used by the `?swatch=demo` deep-link so the whole photo→PBR pipeline is
 * exercisable (and snapshot-able) without a file dialog.
 */
export function demoSwatchCanvas(size = 256): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // indigo denim base + diagonal twill ridges + fibre noise
      const twill = 0.5 + 0.5 * Math.sin((x + y) * 0.9)
      const noise = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
      const shade = 0.55 + 0.3 * twill + 0.15 * (noise - Math.floor(noise))
      const i = (y * size + x) * 4
      img.data[i] = 40 * shade
      img.data[i + 1] = 62 * shade
      img.data[i + 2] = 120 * shade
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}
