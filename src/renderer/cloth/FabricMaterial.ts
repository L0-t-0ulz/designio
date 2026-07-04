import * as THREE from 'three'
import type { Fabric } from '../fabric/FabricLibrary'
import { makeWeaveNormalMap } from '../fabric/weaveTexture'

/**
 * A physically-based fabric material driven by a `Fabric`: sheen for the soft
 * cloth glow, a procedural weave normal map for woven micro-detail, anisotropy
 * for satin/silk directional highlights, and transmission for sheer fabrics.
 */
export function createFabricMaterial(fabric: Fabric): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    metalness: 0,
    side: THREE.DoubleSide,
    flatShading: false,
    envMapIntensity: 1.1
  })
  applyFabric(mat, fabric)
  return mat
}

/** Update an existing material in place to match `fabric` (look only). */
export function applyFabric(mat: THREE.MeshPhysicalMaterial, fabric: Fabric): void {
  mat.color.set(fabric.color)
  mat.roughness = fabric.roughness
  mat.sheen = fabric.sheen
  mat.sheenRoughness = fabric.sheenRoughness
  mat.sheenColor = new THREE.Color(fabric.color).offsetHSL(0, -0.05, 0.12)
  mat.anisotropy = fabric.anisotropy
  mat.transmission = fabric.transmission
  mat.thickness = fabric.transmission > 0 ? 0.5 : 0

  const normalMap = makeWeaveNormalMap(fabric.weave)
  const repeat = Math.max(1, Math.round(fabric.weaveScale / 16))
  normalMap.repeat.set(repeat, repeat)
  mat.normalMap = normalMap
  mat.normalScale.set(fabric.normalStrength, fabric.normalStrength)

  mat.needsUpdate = true
}
