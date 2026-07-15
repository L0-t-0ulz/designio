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
      // Long, mostly-flat warp floats with a widely spaced binding point. The floats
      // dominate (that's what makes satin smooth + lustrous); the binding dips only
      // shallowly so it reads as a faint, near-flat surface rather than a grid of hard
      // dots. A deep binding dip (the old `weftRidge*0.5` against a 0.9 float) baked a
      // ~1.0-contrast dimple every 5th cell → a visible beaded polka-dot grid at range.
      const bindingPoint = (((cu * 3 + cv * 1) % 5) + 5) % 5 === 0
      return bindingPoint ? 0.74 + 0.08 * weftRidge : 0.95 + 0.05 * warpRidge
    }
    case 'knit': {
      // interlocking loops — smooth waves, offset every other row
      const rowOffset = (cv & 1) === 0 ? 0 : 0.5
      const loop = 0.5 + 0.5 * Math.cos((fract(u * threads + rowOffset) - 0.5) * Math.PI * 2)
      const rib = 0.5 + 0.5 * Math.cos((tv - 0.5) * Math.PI * 2)
      return 0.4 * loop + 0.6 * rib
    }
    case 'rib': {
      // 1×1 rib — deep vertical wales (the classic beanie band): tall warp columns,
      // every other column recessed, weft barely reads
      const wale = (cu & 1) === 0 ? 1 : 0.35
      return wale * (0.3 + 0.7 * warpRidge)
    }
    case 'waffle': {
      // thermal waffle — a square grid of raised walls around deep square cells
      const wall = Math.max(bump(tu) < 0.45 ? 1 : 0, bump(tv) < 0.45 ? 1 : 0)
      return wall === 1 ? 0.9 : 0.15 + 0.2 * (warpRidge + weftRidge) * 0.5
    }
    case 'cable': {
      // cable knit — fat twisted columns every 4 wales that cross over each other
      const col = ((cu % 4) + 4) % 4
      if (col < 2) {
        // the cable pair: a braid — the crossing alternates every 3 rows
        const phase = (Math.floor(vv / 3) & 1) === 0 ? col : 1 - col
        const braid = 0.55 + 0.45 * Math.sin(Math.PI * (tv + phase) * 0.9)
        return 0.5 + 0.5 * braid * warpRidge
      }
      return 0.25 * weftRidge // the recessed purl gutter between cables
    }
    default:
      return 0.5
  }
}

/**
 * Relative roughness at (u, v): yarn **crowns** sit proud and catch a sharper
 * highlight (glossier → lower roughness), thread **valleys** are matte (≈ full
 * roughness). Returned as a multiplier in (0, 1] so it can be baked straight into a
 * `roughnessMap` (which three.js multiplies onto `material.roughness`). Pure.
 */
const ROUGH_CONTRAST = 0.22
export function weaveRoughness(weave: WeaveType, u: number, v: number, threads: number): number {
  return 1 - ROUGH_CONTRAST * weaveHeight(weave, u, v, threads)
}

/**
 * Specular anti-aliasing (Toksvig): lift a fabric's base roughness in proportion to
 * how strong its weave normal map is, so the sub-texel normal variance reads as extra
 * roughness instead of shimmering, aliasing highlights at distance. Monotonic in
 * `normalStrength`, never below the input, clamped ≤ 1. Pure.
 */
export function toksvigRoughness(roughness: number, normalStrength: number): number {
  return Math.min(1, roughness + 0.14 * normalStrength)
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

const roughCache = new Map<string, THREE.CanvasTexture>()

/**
 * Bakes a tiling roughness map for a weave into a CanvasTexture (renderer only) —
 * the crown/valley `weaveRoughness` field, so a flat fabric gains yarn-crown gloss
 * highlights instead of a uniform plastic sheen. Cached per (weave, size, threads).
 */
export function makeWeaveRoughnessMap(weave: WeaveType, size = 256, threads = 16): THREE.CanvasTexture {
  const key = `${weave}:${size}:${threads}`
  const cached = roughCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const r = weaveRoughness(weave, x / size, y / size, threads)
      const c = Math.max(0, Math.min(255, Math.round(r * 255)))
      const i = (y * size + x) * 4
      img.data[i] = c
      img.data[i + 1] = c
      img.data[i + 2] = c
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace // roughness is linear data
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 4
  roughCache.set(key, tex)
  return tex
}
