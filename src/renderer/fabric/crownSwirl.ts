import * as THREE from 'three'

/**
 * **Crown decrease swirl** — the spiral of decreases a hand-knitter works at the top
 * of a beanie/hat crown, where paired decreases every few stitches gather the tube to
 * a point and leave `arms` spiral ridges radiating from the apex. A pure procedural
 * relief field (like the other fabric finishes) — a triangle-wave ridge along each
 * spiral arm, fading out from the crown — baked into a normal map for the knit crown.
 * The field + normal are unit-tested; `makeCrownSwirlNormalMap` bakes the texture.
 */

const TWIST = 2.4 // how tightly the decrease lines spiral

/** The swirl relief `0→1` at (u,v) with the crown apex at the top-centre (0.5, 0). Pure. */
export function crownSwirlHeight(u: number, v: number, arms = 6): number {
  const dx = u - 0.5
  const r = Math.hypot(dx, v)
  if (r < 1e-4) return 1 // the gathered apex
  const theta = Math.atan2(v, dx)
  const spiral = (arms * theta) / (2 * Math.PI) + r * TWIST * arms
  const f = spiral - Math.floor(spiral) // phase 0…1
  const ridge = 1 - Math.abs(f - 0.5) * 2 // triangle wave, ridge crest at f = 0.5
  const fade = Math.max(0, 1 - r * 1.6) // strong at the crown, gone by the band
  return Math.max(0, ridge) * fade
}

/** Surface normal of the swirl relief via finite differences. Pure. */
export function crownSwirlNormal(u: number, v: number, arms: number, strength: number): [number, number, number] {
  const e = 1 / 256
  const hx = crownSwirlHeight(u + e, v, arms) - crownSwirlHeight(u - e, v, arms)
  const hy = crownSwirlHeight(u, v + e, arms) - crownSwirlHeight(u, v - e, arms)
  const nx = -hx * strength
  const ny = -hy * strength
  const nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

const cache = new Map<number, THREE.CanvasTexture>()

/** Bake the crown swirl into a tangent-space normal map for the knit crown. */
export function makeCrownSwirlNormalMap(arms = 6, size = 256): THREE.CanvasTexture {
  const cached = cache.get(arms)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = crownSwirlNormal(x / size, y / size, arms, 2.2)
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
  cache.set(arms, tex)
  return tex
}
