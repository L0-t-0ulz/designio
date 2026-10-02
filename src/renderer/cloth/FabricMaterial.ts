import * as THREE from 'three'
import { type Fabric, sheenRecipeFromFabric, anisotropyAngleForFabric, envIntensityForFabric, specularIntensityForFabric } from '../fabric/FabricLibrary'
import { makeWeaveNormalMap, makeWeaveRoughnessMap, makeWeaveAoMap, toksvigRoughness, yarnDetailMix } from '../fabric/weaveTexture'
import { makePerfAlphaMap } from '../fabric/perforate'
import { isVelvet, VELVET_FLOOR } from '../fabric/velvet'
import { makeFurNormalMap, furParams } from '../fabric/fur'

interface ClothUniforms {
  uVelvet: { value: number }
  uVelvetFloor: { value: number }
  uYarnAo: { value: THREE.Texture }
  uYarnAoMix: { value: number }
}

let whiteYarn: THREE.DataTexture | null = null
function whiteYarnAo(): THREE.DataTexture {
  if (!whiteYarn) {
    whiteYarn = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
    whiteYarn.colorSpace = THREE.NoColorSpace
    whiteYarn.wrapS = THREE.RepeatWrapping
    whiteYarn.wrapT = THREE.RepeatWrapping
    whiteYarn.needsUpdate = true
  }
  return whiteYarn
}

function clothUniforms(mat: THREE.MeshPhysicalMaterial): ClothUniforms | undefined {
  return mat.userData.cloth as ClothUniforms | undefined
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
  // the grazing rim + sheen bright. Gated by `uVelvet` (0 = an exact ×1 identity).
  // The same compile multiplies yarn-valley shadow (`uYarnAo`) onto the dye. A
  // coarser octave of that map is what reads at garment distance; the fine octave
  // lines up with the weave bump for close-ups.
  const cloth: ClothUniforms = {
    uVelvet: { value: 0 },
    uVelvetFloor: { value: VELVET_FLOOR },
    uYarnAo: { value: whiteYarnAo() },
    uYarnAoMix: { value: 0 }
  }
  mat.userData.cloth = cloth
  mat.userData.velvet = cloth // velvet lobe reads the same uniforms
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uVelvet = cloth.uVelvet
    shader.uniforms.uVelvetFloor = cloth.uVelvetFloor
    shader.uniforms.uYarnAo = cloth.uYarnAo
    shader.uniforms.uYarnAoMix = cloth.uYarnAoMix
    shader.fragmentShader = ('uniform float uVelvet;\nuniform float uVelvetFloor;\nuniform sampler2D uYarnAo;\nuniform float uYarnAoMix;\n' + shader.fragmentShader).replace(
      '#include <lights_physical_fragment>',
      `#ifdef USE_NORMALMAP
      float yarnFine = texture2D(uYarnAo, vNormalMapUv).r;
      float yarnCoarse = texture2D(uYarnAo, vNormalMapUv * 0.35).r;
      float yarn = mix(yarnCoarse, yarnFine, 0.25);
      diffuseColor.rgb *= mix(1.0, yarn, uYarnAoMix);
      #endif
      float vNdotV = abs(dot(normal, normalize(vViewPosition)));
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
  mat.specularIntensity = specularIntensityForFabric(fabric) // kill the plastic ping on matte cloth
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
  // Yarn valleys shadow the dye. Sampled with the normal-map UV (already repeated),
  // so this map stays at repeat 1 and lines up with the weave bump.
  const aoMap = makeWeaveAoMap(fabric.weave)
  const cloth = clothUniforms(mat)
  if (cloth) {
    cloth.uYarnAo.value = aoMap
    cloth.uYarnAoMix.value = yarnDetailMix(fabric.roughness, !!(fabric.nap && fabric.family === 'knit'))
  }

  // Napped KNITS (fleece) read as a soft, dense fuzz — not the crisp diagonal net the
  // shared 'knit' weave gives. Swap in the soft fleece pile normal + a very matte,
  // faintly-sheened surface so the base fabric reads fuzzy (the ?fur=fleece finish can
  // still layer a stronger pile on top). Napped WOVENS (velvet/suede/corduroy) keep their
  // own weave — this path is knits only, so it doesn't touch any golden-scene fabric.
  if (fabric.nap && fabric.family === 'knit') {
    const fp = furParams('fleece')
    const furMap = makeFurNormalMap('fleece')
    furMap.repeat.set(fp.repeat, fp.repeat)
    mat.normalMap = furMap
    mat.normalScale.set(fp.normalStrength, fp.normalStrength)
    mat.roughnessMap = null // uniform matte fuzz, no yarn-crown gloss variation
    mat.roughness = fp.roughness
    mat.sheen = fp.sheen
    mat.sheenRoughness = fp.sheenRoughness
    if (cloth) cloth.uYarnAoMix.value = 0 // fuzz, not a thread grid
  }

  // Toggle the velvet lobe on only for true napped velvet/velour (live uniform, no recompile).
  if (cloth) cloth.uVelvet.value = isVelvet(fabric) ? 1 : 0

  mat.needsUpdate = true
}

/** Scale the yarn-valley shadow (0 = off, when a finish owns the surface). */
export function setYarnDetail(mat: THREE.MeshPhysicalMaterial, mix: number): void {
  const cloth = clothUniforms(mat)
  if (cloth) cloth.uYarnAoMix.value = Math.max(0, Math.min(1, mix))
}
