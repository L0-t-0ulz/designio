/**
 * **Perforated / athletic-mesh** cutout — a hex-packed grid of real holes
 * (`alphaTest` cutout, like the lace finish) driven by the *fabric* itself:
 * a fabric with `perforated: true` (athletic mesh · eyelet knits) sees through
 * everywhere it's used, no finish required. Pure `perfAlpha` field is
 * unit-tested; `makePerfAlphaMap` bakes it into a tiling alpha map.
 */
import * as THREE from 'three'

const frac = (x: number): number => x - Math.floor(x)

/**
 * Alpha at (u,v): 0 inside a perforation hole, 1 on the threads between.
 * `holes` = hole rows per tile. Hex packing: odd rows offset half a cell —
 * the athletic-mesh look, and the field tiles seamlessly (u,v period 1).
 */
export function perfAlpha(u: number, v: number, holes = 14): number {
  const row = Math.floor(v * holes)
  const offset = row % 2 === 1 ? 0.5 : 0
  const gx = frac(u * holes + offset) - 0.5
  const gy = frac(v * holes) - 0.5
  return Math.hypot(gx, gy) < 0.33 ? 0 : 1 // ~34% open area
}

let cached: THREE.CanvasTexture | null = null

/** The tiling perforation alpha map (cached — one texture app-wide). */
export function makePerfAlphaMap(size = 256): THREE.CanvasTexture {
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = perfAlpha(x / size, y / size) * 255
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
  tex.repeat.set(6, 8) // finer than lace — sportswear perforation scale
  tex.anisotropy = 4
  cached = tex
  return tex
}
