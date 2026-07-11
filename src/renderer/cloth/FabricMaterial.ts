import * as THREE from 'three'
import { type Fabric, sheenRecipeFromFabric, anisotropyAngleForFabric, envIntensityForFabric } from '../fabric/FabricLibrary'
import { makeWeaveNormalMap, makeWeaveRoughnessMap, toksvigRoughness } from '../fabric/weaveTexture'

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
  // Toksvig specular-AA: a stronger weave normal lifts the base roughness so the
  // micro-detail reads as roughness, not a shimmering highlight, at distance.
  mat.roughness = toksvigRoughness(fabric.roughness, fabric.normalStrength)
  // Per-family cloth-sheen recipe — silk glows, wovens mute, velvet lusters.
  const sh = sheenRecipeFromFabric(fabric)
  mat.sheen = sh.sheen
  mat.sheenRoughness = sh.sheenRoughness
  mat.sheenColor = new THREE.Color(fabric.color).offsetHSL(0, -sh.tintSat, sh.tintLift)
  mat.anisotropy = fabric.anisotropy
  mat.anisotropyRotation = anisotropyAngleForFabric(fabric) // streak the highlight along the warp
  mat.envMapIntensity = envIntensityForFabric(fabric) // smooth silks catch the room; matte cotton doesn't
  mat.transmission = fabric.transmission
  mat.thickness = fabric.transmission > 0 ? 0.5 : 0

  const repeat = Math.max(1, Math.round(fabric.weaveScale / 16))
  const normalMap = makeWeaveNormalMap(fabric.weave)
  normalMap.repeat.set(repeat, repeat)
  mat.normalMap = normalMap
  mat.normalScale.set(fabric.normalStrength, fabric.normalStrength)
  // Procedural roughness map — yarn crowns glossier, valleys matte — so the surface
  // has micro-variation instead of one flat plastic roughness (tiles with the weave).
  const roughnessMap = makeWeaveRoughnessMap(fabric.weave)
  roughnessMap.repeat.set(repeat, repeat)
  mat.roughnessMap = roughnessMap

  mat.needsUpdate = true
}
