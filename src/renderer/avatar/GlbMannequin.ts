import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const MANNEQUIN_URL = new URL('../assets/mannequin.glb', import.meta.url).href

/** Standard humanoid bones located in the rig (world-queryable), for collider fit + anchors. */
export interface GlbBones {
  hips?: THREE.Object3D
  chest?: THREE.Object3D
  neck?: THREE.Object3D
  head?: THREE.Object3D
  lShoulder?: THREE.Object3D
  lArm?: THREE.Object3D
  lFore?: THREE.Object3D
  lHand?: THREE.Object3D
  rShoulder?: THREE.Object3D
  rArm?: THREE.Object3D
  rFore?: THREE.Object3D
  rHand?: THREE.Object3D
  lUpLeg?: THREE.Object3D
  lLeg?: THREE.Object3D
  lFoot?: THREE.Object3D
  rUpLeg?: THREE.Object3D
  rLeg?: THREE.Object3D
  rFoot?: THREE.Object3D
}

export interface GlbBody {
  model: THREE.Object3D
  /** Scale to ~1.75 m * height, build-wide, feet on floor, centred. */
  fit: (height: number, build: number) => void
  /** Rig bones for driving the cloth colliders + body anchors (empty for an unrigged GLB). */
  bones: GlbBones
  /** Advance the rig by `dt` s — the walk clip (in place) when `walking`, else idle. */
  update: (dt: number, walking: boolean) => void
}

/** Classify a bone by name (strips a `mixorig:`-style prefix; side-agnostic segments are centred). */
function boneKey(name: string): keyof GlbBones | undefined {
  const n = name.toLowerCase().replace(/^.*:/, '')
  const seg = /forearm|lowerarm/.test(n)
    ? 'Fore'
    : /upperarm|(^|[^a-z])arm/.test(n)
      ? 'Arm'
      : /shoulder|clavicle/.test(n)
        ? 'Shoulder'
        : /hand|wrist/.test(n)
          ? 'Hand'
          : /upleg|upperleg|thigh/.test(n)
            ? 'UpLeg'
            : /calf|shin|lowerleg|(^|[^a-z])leg/.test(n)
              ? 'Leg'
              : /foot|ankle/.test(n)
                ? 'Foot'
                : /hips|pelvis/.test(n)
                  ? 'hips'
                  : /spine2|upperchest|chest/.test(n)
                    ? 'chest'
                    : /neck/.test(n)
                      ? 'neck'
                      : /head/.test(n)
                        ? 'head'
                        : ''
  if (!seg) return undefined
  if (seg === 'hips' || seg === 'chest' || seg === 'neck' || seg === 'head') return seg
  const side = /right|_r\b|\br[_.]|\.r\b/.test(n) ? 'r' : /left|_l\b|\bl[_.]|\.l\b/.test(n) ? 'l' : ''
  return side ? ((side + seg) as keyof GlbBones) : undefined
}

/**
 * Loads the bundled human GLB and prepares it as the visual body + a rig the
 * mannequin drives cloth colliders and garment anchors from.
 *
 * - A **textured** GLB (a real photoreal skin) keeps its own materials; a bare
 *   rig gets the neutral studio material — so a proper skinned `.glb` renders
 *   photoreal with no code change.
 * - Its `idle`/`walk` clips are exposed via `update` (walk is kept **in place**),
 *   and the Mixamo-style bones drive the capsules + anchors so garments follow.
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

      // Map the standard humanoid bones (first match wins → parent before fingers/toes).
      const bones: GlbBones = {}
      model.traverse((o) => {
        const key = boneKey(o.name)
        if (key && !bones[key]) bones[key] = o
      })

      // Clips: idle (default stance) + walk. Sample idle once for the initial static pose.
      const find = (re: RegExp): THREE.AnimationClip | undefined => gltf.animations.find((a) => re.test(a.name))
      const idleClip = find(/idle|stand/i) ?? gltf.animations[0]
      const walkClip = find(/walk|run/i)
      const mixer = new THREE.AnimationMixer(model)
      const idleAction = idleClip ? mixer.clipAction(idleClip) : null
      const walkAction = walkClip ? mixer.clipAction(walkClip) : null
      let active = idleAction
      active?.play()
      mixer.update(0.001) // pose the idle frame so it stands arms-down, not the T-pose bind
      model.updateMatrixWorld(true)

      // Keep the walk **in place**: re-zero the hips' horizontal drift each frame.
      const hipsBindX = bones.hips?.position.x ?? 0
      const hipsBindZ = bones.hips?.position.z ?? 0

      const update = (dt: number, walking: boolean): void => {
        const next = walking && walkAction ? walkAction : idleAction
        if (next && next !== active) {
          active?.fadeOut(0.25)
          next.reset().fadeIn(0.25).play()
          active = next
        }
        if (dt > 0) mixer.update(dt)
        if (walking && bones.hips) {
          bones.hips.position.x = hipsBindX // walk on the spot (keep the vertical bob)
          bones.hips.position.z = hipsBindZ
        }
      }

      // Intrinsic (bind-pose) bounds → normalise to 1.75 m, feet on floor, centred.
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
      onReady({ model, fit, bones, update })
    },
    undefined,
    (err) => onError?.(err)
  )
}
