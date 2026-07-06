import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MANNEQUIN_URL = new URL('../assets/mannequin.glb', import.meta.url).href

export interface GlbBody {
  model: THREE.Object3D
  /** Scale to ~1.75 m * height, build-wide, feet on floor, centred. */
  fit: (height: number, build: number) => void
}

/**
 * Loads the bundled human GLB and prepares it as the visual body. The capsule
 * skeleton (Mannequin.ts) stays the cloth collider; this is the visual only.
 *
 * - A **textured** GLB (a real photoreal skin) keeps its own materials; a bare
 *   rig (an untextured mannequin) is painted with the neutral studio material —
 *   so dropping in a proper skinned `.glb` renders photoreal with no code change.
 * - If the rig ships an idle/stand clip we sample one frame so it stands
 *   arms-down (garments fit) instead of the wide T-pose bind.
 */
export function loadGlbBody(
  fallbackMaterial: THREE.Material,
  onReady: (body: GlbBody) => void,
  onError?: (err: unknown) => void
): void {
  new GLTFLoader().load(
    MANNEQUIN_URL,
    (gltf) => {
      const model = gltf.scene
      model.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        const mat = m.material as THREE.MeshStandardMaterial | undefined
        // Photoreal skin (has a base-colour texture) → keep it; bare rig → neutral mannequin.
        if (!mat || !mat.map) m.material = fallbackMaterial
        m.castShadow = true
        m.receiveShadow = true
        m.frustumCulled = false
      })

      // Stand arms-down if the rig has an idle/stand clip — the T-pose bind clips garments.
      const idle = gltf.animations.find((a) => /idle|stand|pose/i.test(a.name)) ?? gltf.animations[0]
      if (idle) {
        const mixer = new THREE.AnimationMixer(model)
        mixer.clipAction(idle).play()
        mixer.update(0.001) // sample one frame → a static natural stance, then leave it
        model.updateMatrixWorld(true)
      }

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
