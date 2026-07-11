import * as THREE from 'three'

/**
 * Strain-driven **micro-wrinkles**: a procedural crease normal perturbation applied
 * in the fabric shader, scaled per-vertex by how much the cloth is bunching, so
 * close-ups show crisp micro-folds where the cloth compresses — without any extra
 * geometry. The CPU computes a per-particle wrinkle amount from `XPBDSolver.strain`
 * (pure + unit-tested) and writes it to an `aStrain` attribute; the shader draws the
 * creases and, from the same signal, **darkens the fold valleys** (`cavityFactor`) so
 * the bunched cloth self-shadows and the folds read deep.
 */

/** Wrinkle intensity 0…1 from a particle's signed strain — cloth creases mostly
 *  under **compression** (negative strain), a little under any deformation. Pure. */
export function wrinkleAmount(strain: number): number {
  const compress = Math.max(0, -strain) * 12 // bunching = strong wrinkles
  const any = Math.abs(strain) * 2.5
  return Math.max(0, Math.min(1, compress + any))
}

/**
 * **Fold-valley (cavity) darkening**: bunched cloth self-shadows down in the crease
 * valleys, so scale the diffuse down where the wrinkle amount is high. Distinct from
 * the screen-space GTAO (which reads geometric occlusion) — this reads fabric
 * *compression*, so a flat-but-bunched panel still darkens. A multiply in [1−k, 1],
 * monotonically decreasing in the wrinkle amount. Pure — mirrored in the shader. */
const CAVITY_STRENGTH = 0.28
export function cavityFactor(strainW: number, strength = CAVITY_STRENGTH): number {
  const s = strainW < 0 ? 0 : strainW > 1 ? 1 : strainW
  return 1 - strength * s
}

const VERT_HEAD = 'attribute float aStrain;\nvarying float vStrainW;\nvarying vec3 vWPosW;'
const VERT_BODY = 'vStrainW = aStrain;\nvWPosW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
const FRAG_HEAD = `varying float vStrainW;
varying vec3 vWPosW;
float dioWrinkle(vec2 p){
  return sin(p.x + sin(p.y * 0.6) * 2.0) * 0.5
       + sin(p.y * 1.3 + sin(p.x * 0.5) * 2.0) * 0.4
       + sin((p.x + p.y) * 0.9) * 0.3;
}`
const FRAG_PERTURB = `
  if (vStrainW > 0.01) {
    vec2 wp = vec2(vWPosW.x * 2.2 + vWPosW.z * 1.3, vWPosW.y * 2.6) * 46.0;
    float h = dioWrinkle(wp) + dioWrinkle(wp * 2.7) * 0.4; // a coarse + a finer octave
    vec3 dPx = dFdx(vWPosW);
    vec3 dPy = dFdy(vWPosW);
    float hx = dFdx(h);
    float hy = dFdy(h);
    vec3 r1 = cross(dPy, normal);
    vec3 r2 = cross(normal, dPx);
    float det = dot(dPx, r1);
    vec3 grad = hx * r1 + hy * r2;
    normal = normalize(normal - sign(det) * vStrainW * 1.1 * grad);
  }`
// Darken the diffuse in the compressed crease valleys — mirrors `cavityFactor`.
const FRAG_CAVITY = '\n  diffuseColor.rgb *= (1.0 - ' + CAVITY_STRENGTH.toFixed(2) + ' * clamp(vStrainW, 0.0, 1.0));'

/** Install the strain-driven wrinkle perturbation on a fabric material. Idempotent. */
export function installWrinkle(mat: THREE.MeshPhysicalMaterial): void {
  if ((mat.userData as { wrinkle?: boolean }).wrinkle) return
  ;(mat.userData as { wrinkle?: boolean }).wrinkle = true
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BODY)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD)
      .replace('#include <color_fragment>', '#include <color_fragment>' + FRAG_CAVITY)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + FRAG_PERTURB)
  }
  mat.needsUpdate = true
}

/** Remove the wrinkle perturbation from a material. */
export function uninstallWrinkle(mat: THREE.MeshPhysicalMaterial): void {
  if (!(mat.userData as { wrinkle?: boolean }).wrinkle) return
  ;(mat.userData as { wrinkle?: boolean }).wrinkle = false
  mat.onBeforeCompile = () => {}
  mat.needsUpdate = true
}
