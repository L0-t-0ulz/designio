import * as THREE from 'three'

/**
 * The default avatar's **skin** look — used by the procedural body (and the GLB
 * fallback when the bundled rig isn't textured). A warm mid skin tone, semi-matte
 * roughness, and a warm **sheen** rim that fakes the soft subsurface glow of skin
 * at grazing angles (plus a whisper of warm emissive for life). Drop a textured
 * photoreal GLB at `assets/mannequin.glb` to override it entirely.
 */
export interface SkinLook {
  color: number
  roughness: number
  sheen: number
  sheenRoughness: number
  /** Warm rim/subsurface sheen colour. */
  sheenColor: number
  /** A faint warm inner glow (subsurface fake). */
  emissive: number
  emissiveIntensity: number
}

export const SKIN_LOOK: SkinLook = {
  color: 0xd8a98c,
  roughness: 0.56,
  sheen: 0.5,
  sheenRoughness: 0.62,
  sheenColor: 0xffd9c0,
  emissive: 0x3a1a10,
  emissiveIntensity: 0.05
}

/** A range of skin tones (fair → deep) for the default avatar's complexion picker. */
export type SkinTone = 'porcelain' | 'fair' | 'light' | 'medium' | 'tan' | 'brown' | 'deep' | 'espresso'
export const SKIN_TONES: SkinTone[] = ['porcelain', 'fair', 'light', 'medium', 'tan', 'brown', 'deep', 'espresso']

/** The base albedo of each tone (the undertone then nudges the hue). */
export const SKIN_TONE_HEX: Record<SkinTone, number> = {
  porcelain: 0xf3ddca,
  fair: 0xeac4a4,
  light: 0xd8a98c, // ≈ the default SKIN_LOOK
  medium: 0xc08d68,
  tan: 0xa87048,
  brown: 0x855636,
  deep: 0x5f3c26,
  espresso: 0x412819
}

/** Complexion undertone — shifts the hue warm (golden) ↔ cool (rosy). */
export type Undertone = 'warm' | 'neutral' | 'cool'
export const UNDERTONES: Undertone[] = ['warm', 'neutral', 'cool']

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

/**
 * The full skin look for a tone + undertone. The undertone nudges hue/saturation
 * (preserving lightness, so a deep tone stays deep) and picks the warm/rosy sheen;
 * the emissive is a dark version of the skin colour (a faint subsurface glow).
 * Pure so the complexion ramp is unit-tested.
 */
export function skinLook(tone: SkinTone, undertone: Undertone = 'warm'): SkinLook {
  const c = new THREE.Color(SKIN_TONE_HEX[tone])
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  // nudge 40% toward the undertone's target hue (warm ≈ golden 0.065, cool ≈ rosy 0.02)
  const targetH = undertone === 'warm' ? 0.065 : undertone === 'cool' ? 0.02 : 0.04
  const h = hsl.h + (targetH - hsl.h) * 0.4
  const s = clamp01(hsl.s * (undertone === 'cool' ? 0.9 : undertone === 'warm' ? 1.08 : 1))
  const color = new THREE.Color().setHSL(h, s, hsl.l)
  const emissive = color.clone().multiplyScalar(0.18) // dark subsurface glow of the same hue
  const sheenColor = undertone === 'cool' ? 0xffd2dc : undertone === 'neutral' ? 0xffe2d2 : 0xffd9c0
  return {
    color: color.getHex(),
    roughness: SKIN_LOOK.roughness,
    sheen: SKIN_LOOK.sheen,
    sheenRoughness: SKIN_LOOK.sheenRoughness,
    sheenColor,
    emissive: emissive.getHex(),
    emissiveIntensity: SKIN_LOOK.emissiveIntensity
  }
}

/** A skin material for the studio mannequin (renderer only). */
export function makeSkinMaterial(look: SkinLook = SKIN_LOOK): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({ metalness: 0 })
  applySkinLook(mat, look)
  return mat
}

/** Update a skin material's complexion in place (the shared body + GLB material). */
export function applySkinLook(mat: THREE.MeshPhysicalMaterial, look: SkinLook): void {
  mat.color.set(look.color)
  mat.roughness = look.roughness
  mat.sheen = look.sheen
  mat.sheenRoughness = look.sheenRoughness
  mat.sheenColor.set(look.sheenColor)
  mat.emissive.set(look.emissive)
  mat.emissiveIntensity = look.emissiveIntensity
  mat.needsUpdate = true
}
