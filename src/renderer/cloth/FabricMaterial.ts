import * as THREE from 'three'

/**
 * A physically-based fabric material. Sheen gives the soft retro-reflective
 * glow characteristic of cloth; double-sided so we see the inside of folds.
 */
export function createFabricMaterial(color: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.78,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(color).offsetHSL(0, -0.08, 0.08),
    envMapIntensity: 1.1,
    side: THREE.DoubleSide,
    flatShading: false
  })
}
