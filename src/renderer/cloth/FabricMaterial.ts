import * as THREE from 'three'
import { type Fabric, sheenRecipeFromFabric, anisotropyAngleForFabric, envIntensityForFabric } from '../fabric/FabricLibrary'
import { makeWeaveNormalMap, makeWeaveRoughnessMap, toksvigRoughness } from '../fabric/weaveTexture'
import { makePerfAlphaMap } from '../fabric/perforate'
import { isVelvet, VELVET_FLOOR } from '../fabric/velvet'

interface VelvetUniforms {
  uVelvet: { value: number }
  uVelvetFloor: { value: number }
}

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
  // Velvet retroreflective term: darken the diffuse facing the camera (|N·V|→1), leaving
  // the grazing rim + sheen bright — the velvet look. Gated by `uVelvet` (0 = `mix(...,0)`
  // = an exact ×1.0 identity), so every non-velvet fabric renders bit-for-bit as before.
  const velvet: VelvetUniforms = { uVelvet: { value: 0 }, uVelvetFloor: { value: VELVET_FLOOR } }
  mat.userData.velvet = velvet
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uVelvet = velvet.uVelvet
    shader.uniforms.uVelvetFloor = velvet.uVelvetFloor
    shader.fragmentShader = ('uniform float uVelvet;\nuniform float uVelvetFloor;\n' + shader.fragmentShader).replace(
      '#include <lights_physical_fragment>',
      `float vNdotV = abs(dot(normal, normalize(vViewPosition)));
      float velvetFac = 1.0 - (1.0 - uVelvetFloor) * vNdotV * vNdotV; // mirrors velvetFacingFactor
      diffuseColor.rgb *= mix(1.0, velvetFac, uVelvet);
      #include <lights_physical_fragment>`
    )
  }
  applyFabric(mat, fabric)
  return mat
}

/** Update an existing material in place to match `fabric` (look only). */
export function applyFabric(mat: THREE.MeshPhysicalMaterial, fabric: Fabric): void {
  mat.color.set(fabric.color)
  mat.metalness = fabric.metalness ?? 0 // lamé / foil / sequin-base cloth reads as metal
  // Clearcoat lacquer — patent / coated / wet-look cloth gets a glossy top layer; 0 for
  // everything else is three's default, so no other fabric changes a pixel.
  mat.clearcoat = fabric.clearcoat ?? 0
  mat.clearcoatRoughness = fabric.clearcoat ? 0.12 : 0
  // perforated cloth (athletic mesh) — real see-through holes, per material so a
  // mesh *part* (sleeves/back panel) cuts out while the rest of the garment stays solid
  mat.alphaMap = fabric.perforated ? makePerfAlphaMap() : null
  mat.alphaTest = fabric.perforated ? 0.5 : 0
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

  // Toggle the velvet lobe on only for true napped velvet/velour (live uniform, no recompile).
  const velvet = mat.userData.velvet as VelvetUniforms | undefined
  if (velvet) velvet.uVelvet.value = isVelvet(fabric) ? 1 : 0

  mat.needsUpdate = true
}
