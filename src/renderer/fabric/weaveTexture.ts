import * as THREE from 'three'
import type { WeaveType } from './FabricLibrary'

/**
 * Procedural weave micro-surface. The height field is a pure function so it can
 * be unit-tested in Node; `makeWeaveNormalMap` bakes it into a tiling normal map
 * for the renderer. No external texture assets required.
 */

const fract = (x: number): number => x - Math.floor(x)
/** Rounded thread bump across its width, 0 at edges → 1 at centre. */
const bump = (t: number): number => Math.sin(Math.PI * t)

/**
 * Weave height at (u, v) in [0,1) tile space with `threads` repeats.
 * Higher = thread sitting on top.
 */
export function weaveHeight(weave: WeaveType, u: number, v: number, threads: number): number {
  const uu = u * threads
  const vv = v * threads
  const cu = Math.floor(uu)
  const cv = Math.floor(vv)
  const tu = fract(uu)
  const tv = fract(vv)
  const warpRidge = bump(tu) // vertical thread
  const weftRidge = bump(tv) // horizontal thread

  switch (weave) {
    case 'plain': {
      // over-under checkerboard
      const warpOnTop = ((cu + cv) & 1) === 0
      return warpOnTop ? warpRidge : weftRidge
    }
    case 'twill': {
      // diagonal float (denim-like): warp floats over 3, stepped each row
      const warpOnTop = (((cu + cv * 2) % 3) + 3) % 3 !== 0
      return warpOnTop ? 0.35 + 0.65 * warpRidge : weftRidge * 0.7
    }
    case 'satin': {
      // long, mostly-flat floats with a widely spaced binding point
      const bindingPoint = (((cu * 3 + cv * 1) % 5) + 5) % 5 === 0
      return bindingPoint ? weftRidge * 0.5 : 0.9 + 0.1 * warpRidge
    }
    case 'knit': {
      // interlocking loops — smooth waves, offset every other row
      const rowOffset = (cv & 1) === 0 ? 0 : 0.5
      const loop = 0.5 + 0.5 * Math.cos((fract(u * threads + rowOffset) - 0.5) * Math.PI * 2)
      const rib = 0.5 + 0.5 * Math.cos((tv - 0.5) * Math.PI * 2)
      return 0.4 * loop + 0.6 * rib
    }
    default:
      return 0.5
  }
}

/** Unit surface normal from the height field via central differences. */
export function weaveNormal(
  weave: WeaveType,
  u: number,
  v: number,
  threads: number,
  strength: number
): [number, number, number] {
  const e = 0.5 / threads
  const hl = weaveHeight(weave, u - e, v, threads)
  const hr = weaveHeight(weave, u + e, v, threads)
  const hd = weaveHeight(weave, u, v - e, threads)
  const hu = weaveHeight(weave, u, v + e, threads)
  const nx = (hl - hr) * strength
  const ny = (hd - hu) * strength
  const nz = 1
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

const cache = new Map<string, THREE.CanvasTexture>()

/**
 * Bakes a tiling normal map for a weave into a CanvasTexture (renderer only).
 * Cached per (weave, strength, size).
 */
export function makeWeaveNormalMap(
  weave: WeaveType,
  strength = 3,
  size = 256,
  threads = 16
): THREE.CanvasTexture {
  const key = `${weave}:${strength}:${size}:${threads}`
  const cached = cache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [nx, ny, nz] = weaveNormal(weave, x / size, y / size, threads, strength)
      const i = (y * size + x) * 4
      img.data[i] = (nx * 0.5 + 0.5) * 255
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace // normal maps are linear data
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}
