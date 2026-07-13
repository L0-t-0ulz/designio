import * as THREE from 'three'

/**
 * **Pilling & fuzz** — aged-knit bobbles: little rounded pills scattered where the
 * fabric has rubbed, denser as the aging amount rises, plus a matte fuzz lift.
 * A hashed cell-scatter (no RNG — deterministic, tiles seamlessly): each cell owns
 * one potential pill; the amount decides which exist and how fat they sit. Pure
 * `pillHeight`/`pillNormal` are unit-tested; the stack bakes the tiling normal map
 * and lifts the roughness so an aged knit reads fuzzy, not glossy.
 */

const fract = (x: number): number => x - Math.floor(x)
const hash = (cx: number, cy: number, k: number): number => fract(Math.sin(cx * 127.1 + cy * 311.7 + k * 74.7) * 43758.5453)

const CELLS = 12

/** Pill height at (u,v) for an aging `amount` 0…1 — 0 flat, 1 heavily pilled. */
export function pillHeight(u: number, v: number, amount: number): number {
  const a = Math.max(0, Math.min(1, amount))
  if (a <= 0) return 0
  let h = 0
  const gu = u * CELLS
  const gv = v * CELLS
  const cu = Math.floor(gu)
  const cv = Math.floor(gv)
  // check the 3×3 neighbourhood (a pill can spill over its cell edge)
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ((cu + dx) % CELLS + CELLS) % CELLS // wrap → seamless tile
      const cy = ((cv + dy) % CELLS + CELLS) % CELLS
      if (hash(cx, cy, 0) > a) continue // this cell's pill only exists past its threshold
      const px = cu + dx + 0.25 + 0.5 * hash(cx, cy, 1) // pill centre inside its cell
      const py = cv + dy + 0.25 + 0.5 * hash(cx, cy, 2)
      const r = 0.16 + 0.2 * hash(cx, cy, 3) // pill radius in cell units
      const d = Math.hypot(gu - px, gv - py)
      if (d < r) h = Math.max(h, Math.cos((d / r) * Math.PI * 0.5)) // rounded bobble
    }
  }
  return h
}

/** Height-field normal (the quilt convention). */
export function pillNormal(u: number, v: number, amount: number, strength = 0.9): [number, number, number] {
  const e = 0.4 / CELLS
  const nx = (pillHeight(u - e, v, amount) - pillHeight(u + e, v, amount)) * strength
  const ny = (pillHeight(u, v - e, amount) - pillHeight(u, v + e, amount)) * strength
  const l = Math.hypot(nx, ny, 1)
  return [nx / l, ny / l, 1 / l]
}

const cache = new Map<number, THREE.CanvasTexture>()

/** Tiling pill normal map for an aging amount (cached per quantised step). */
export function makePillNormalMap(amount: number, size = 256): THREE.CanvasTexture {
  const key = Math.round(Math.max(0, Math.min(1, amount)) * 10) // 11 steps is plenty
  const cached = cache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = pillNormal(x / size, y / size, key / 10)
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
  tex.repeat.set(6, 6)
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}
