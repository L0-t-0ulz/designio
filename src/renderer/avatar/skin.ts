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

/** A skin material for the studio mannequin (renderer only). */
export function makeSkinMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: SKIN_LOOK.color,
    roughness: SKIN_LOOK.roughness,
    metalness: 0,
    sheen: SKIN_LOOK.sheen,
    sheenRoughness: SKIN_LOOK.sheenRoughness,
    sheenColor: new THREE.Color(SKIN_LOOK.sheenColor),
    emissive: new THREE.Color(SKIN_LOOK.emissive),
    emissiveIntensity: SKIN_LOOK.emissiveIntensity
  })
}
