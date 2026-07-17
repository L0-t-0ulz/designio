import * as THREE from 'three'

/**
 * Colour-shifting eveningwear finishes — thin-film **iridescence** (soap-bubble /
 * hologram / oil-slick / pearlescent nacre), beyond the sequin/foil sparkle. Each
 * maps to a `MeshPhysicalMaterial` recipe (iridescence + a metallic/gloss base);
 * the recipe is pure so it's unit-tested and the stack just applies it in `applyLook`.
 */
export type IridescentKind = 'iridescent' | 'holographic' | 'oil-slick' | 'pearlescent'
export const IRIDESCENT_KINDS: IridescentKind[] = ['iridescent', 'holographic', 'oil-slick', 'pearlescent']

export interface IridescentParams {
  iridescence: number
  iridescenceIOR: number
  /** Thin-film thickness range (nm) — wider = more colour bands across the surface. */
  thicknessRange: [number, number]
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  envMapIntensity: number
}

export function iridescentParams(kind: IridescentKind): IridescentParams {
  switch (kind) {
    case 'holographic':
      // bright, strong colour shift over a semi-metallic base (hologram foil)
      return { iridescence: 1, iridescenceIOR: 1.5, thicknessRange: [200, 900], metalness: 0.6, roughness: 0.12, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 1.5 }
    case 'oil-slick':
      // dark, saturated oil-on-water swirl (metallic-ombré feel)
      return { iridescence: 1, iridescenceIOR: 1.8, thicknessRange: [300, 1200], metalness: 0.9, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.3 }
    case 'pearlescent':
      // soft mother-of-pearl nacre — a pale, gentle colour shift under a glossy
      // clearcoat over a near-white low-metal base (satin pearl, not a hard hologram)
      return { iridescence: 0.5, iridescenceIOR: 1.4, thicknessRange: [120, 420], metalness: 0.15, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 1.3 }
    default:
      // subtle soap-bubble sheen sitting on the fabric
      return { iridescence: 0.7, iridescenceIOR: 1.3, thicknessRange: [100, 500], metalness: 0.2, roughness: 0.3, clearcoat: 0.2, clearcoatRoughness: 0.25, envMapIntensity: 1.2 }
  }
}

/**
 * Thin-film **thickness** at (u, v) in [0,1] — a smooth swirling field so the
 * thickness (and thus the interference colour) *varies across the surface* instead
 * of being a single flat value, giving the flowing oil-on-water / hologram bands.
 * A pure sum of phase-coupled sines (deterministic — no `Math.random`); the swirl
 * frequency rises for the busier finishes. The stack bakes it into a thickness map
 * that three.js reads (green channel) to lerp the `thicknessRange`.
 */
export function iridescentThickness(kind: IridescentKind, u: number, v: number): number {
  const f = kind === 'oil-slick' ? 7 : kind === 'holographic' ? 5.5 : kind === 'pearlescent' ? 3 : 4
  const a = Math.sin((u * f + Math.sin(v * f * 0.7) * 2) * Math.PI)
  const b = Math.sin((v * f * 1.3 + Math.sin(u * f * 0.5) * 2) * Math.PI)
  const c = Math.sin((u + v) * f * 0.9 * Math.PI)
  return 0.5 + 0.5 * (a * 0.4 + b * 0.35 + c * 0.25) // [0,1]
}

const thicknessCache = new Map<IridescentKind, THREE.CanvasTexture>()

/** Bake the `iridescentThickness` swirl into a tiling grayscale map (renderer only). */
export function makeIridescenceThicknessMap(kind: IridescentKind, size = 256): THREE.CanvasTexture {
  const cached = thicknessCache.get(kind)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = iridescentThickness(kind, x / size, y / size)
      const c = Math.max(0, Math.min(255, Math.round(t * 255)))
      const i = (y * size + x) * 4
      img.data[i] = c
      img.data[i + 1] = c
      img.data[i + 2] = c
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)
  thicknessCache.set(kind, tex)
  return tex
}
