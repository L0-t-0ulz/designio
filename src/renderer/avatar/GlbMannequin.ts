import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MANNEQUIN_URL = new URL('../assets/mannequin.glb', import.meta.url).href

export interface GlbBody {
  model: THREE.Object3D
  /** Scale to ~1.75 m * height / build-wide, feet on floor, centred. */
  fit: (height: number, build: number) => void
}

/**
 * Loads the bundled CC0 human GLB with a neutral mannequin material. The capsule
 * skeleton (Mannequin.ts) stays the cloth collider; this is the visual body only.
 */
export function loadGlbBody(
  material: THREE.Material,
  onReady: (body: GlbBody) => void,
  onError?: (err: unknown) => void
): void {
  new GLTFLoader().load(
    MANNEQUIN_URL,
    (gltf) => {
      const model = gltf.scene
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) {
          m.material = material
          m.castShadow = true
          m.receiveShadow = true
          m.frustumCulled = false
        }
      })

      // Intrinsic (scale = 1) bounds → normalise to 1.75 m, feet on floor, centred.
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const min = box.min.clone()
      const center = box.getCenter(new THREE.Vector3())
      const base = 1.75 / (size.y || 1)

      const fit = (height: number, build: number): void => {
        model.scale.set(base * build, base * height, base * build)
        model.position.set(-center.x * base * build, -min.y * base * height, -center.z * base * build)
      }
      fit(1, 1)
      onReady({ model, fit })
    },
    undefined,
    (err) => onError?.(err)
  )
}
