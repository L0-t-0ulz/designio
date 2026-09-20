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
  /** Toe base + middle-finger base — the only bones that say which way a foot or a
   *  hand POINTS. A hand is not collinear with its forearm and a foot toes out, so
   *  without these an extremity accessory can only guess, and guesses show. */
  lToe?: THREE.Object3D
  lMid?: THREE.Object3D
  lMidTip?: THREE.Object3D
  rUpLeg?: THREE.Object3D
  rLeg?: THREE.Object3D
  rFoot?: THREE.Object3D
  rToe?: THREE.Object3D
  rMid?: THREE.Object3D
  rMidTip?: THREE.Object3D
}

export interface GlbBody {
  model: THREE.Object3D
  /** Scale to ~1.75 m * height, build-wide, feet on floor, centred. */
  fit: (height: number, build: number) => void
  /** Rig bones for driving the cloth colliders + body anchors (empty for an unrigged GLB). */
  bones: GlbBones
  /** Advance the rig by `dt` s — the walk clip (in place) when `walking`, else idle. */
  update: (dt: number, walking: boolean) => void
  /** Freeze a real clip frame as a static pose (`phase` 0…1 of the clip's duration). */
  freezePose: (clip: 'idle' | 'walk', phase: number) => void
}

/**
 * Measured GLB head geometry (bind pose, world space at load): the true skull
 * height, lateral half-width, and the nose tip offset from the head joint —
 * so the head/face colliders match the ACTUAL head instead of guessed
 * headR-multiples. `bindQuatInv` lets per-frame fits rotate the stored nose
 * offset with the animated head bone.
 */
export interface GlbHead {
  /** Skull height above the head joint (m). */
  skullH: number
  /** Max lateral (|x|) half-width of the head (m). */
  lateralR: number
  /** Nose-tip offset from the head joint (bind pose, world axes). */
  nose: THREE.Vector3
  /** Inverse of the head bone's bind world rotation (to re-aim the nose per frame). */
  bindQuatInv: THREE.Quaternion
}

/** Sample the skin above the head joint (every 3rd vertex) for the real head shape. Pure-ish (no scene writes). */
export function measureGlbHead(model: THREE.Object3D, head: THREE.Object3D): GlbHead | null {
  const hp = new THREE.Vector3()
  head.updateWorldMatrix(true, false)
  head.getWorldPosition(hp)
  const v = new THREE.Vector3()
  let top = hp.y
  let lateral = 0
  const nose = new THREE.Vector3()
  let noseD = 0
  model.updateWorldMatrix(true, true)
  model.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh
    if (!mesh.isMesh) return
    if (mesh.isSkinnedMesh) mesh.skeleton.update() // boneMatrices only refresh on render — force them fresh
    const posAttr = mesh.geometry.getAttribute('position')
    if (!posAttr) return
    for (let i = 0; i < posAttr.count; i += 3) {
      // skinned meshes: bind-space geometry ≠ world (the Mixamo unit trap) — run
      // the vertex through the live skeleton, then the mesh's world matrix
      if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, v.fromBufferAttribute(posAttr, i))
      else v.fromBufferAttribute(posAttr, i)
      v.applyMatrix4(mesh.matrixWorld)
      if (v.y < hp.y - 0.01) continue
      if (v.y > top) top = v.y
      const dx = v.x - hp.x
      const dz = v.z - hp.z
      if (Math.abs(dx) > lateral) lateral = Math.abs(dx)
      // the nose: the farthest-forward point in the lower half of the head
      const d = Math.hypot(dx, dz)
      if (dz > 0 && d > noseD && v.y < hp.y + 0.1) {
        noseD = d
        nose.set(dx, v.y - hp.y, dz)
      }
    }
  })
  if (top <= hp.y + 0.02 || noseD === 0) return null
  return {
    skullH: top - hp.y,
    lateralR: Math.max(0.07, Math.min(0.14, lateral)),
    nose,
    bindQuatInv: head.getWorldQuaternion(new THREE.Quaternion()).invert()
  }
}

/**
 * Classify a bone by name (strips a `mixorig:`-style prefix; side-agnostic segments
 * are centred).
 *
 * **The order of this table is load-bearing.** Specific segments are matched before
 * general ones — `ForeArm` before `Arm`, `UpLeg` before `Leg`, the finger and toe
 * tips before the hand and the foot — which is what lets the general patterns be the
 * bare word.
 *
 * They have to be the bare word. An earlier version guarded them as
 * `(^|[^a-z])arm` and `(^|[^a-z])leg` to keep `ForeArm` and `UpLeg` out, and that
 * guard cannot match a Mixamo rig at all: `mixamorigLeftArm` lowercases to
 * `…leftarm`, where the character before `arm` is the `t` of `Left`. So `lArm`,
 * `rArm`, `lLeg` and `rLeg` were never found; `fitCollidersToGlb` skips a capsule
 * whose bones are missing, so the upper arms, the shoulder line and **both legs**
 * silently kept their procedural defaults while the avatar moved. Sleeves collapsed
 * off the shoulder, and the shin colliders sat centimetres from the rendered legs.
 */
const BONE_SEGMENTS: [RegExp, string][] = [
  [/middle(4|_04)|middle(3|_03)end|middleend/, 'MidTip'],
  [/middle1|middle_01/, 'Mid'],
  [/toebase|toe/, 'Toe'],
  [/forearm|lowerarm/, 'Fore'],
  [/upperarm|arm/, 'Arm'],
  [/shoulder|clavicle/, 'Shoulder'],
  [/hand|wrist/, 'Hand'],
  [/upleg|upperleg|thigh/, 'UpLeg'],
  [/calf|shin|lowerleg|leg/, 'Leg'],
  [/foot|ankle/, 'Foot'],
  [/hips|pelvis/, 'hips'],
  [/spine2|upperchest|chest/, 'chest'],
  [/neck/, 'neck'],
  [/head/, 'head']
]

export function boneKey(name: string): keyof GlbBones | undefined {
  const n = name.toLowerCase().replace(/^.*:/, '')
  const seg = BONE_SEGMENTS.find(([re]) => re.test(n))?.[1] ?? ''
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

      // Freeze a real clip frame as a static lookbook pose — solo the clip, seek to
      // `phase` of its duration, sample once (no time advance), keep the walk in place.
      const freezePose = (clip: 'idle' | 'walk', phase: number): void => {
        const target = clip === 'walk' && walkAction ? walkAction : idleAction
        if (!target) return
        for (const a of [idleAction, walkAction]) {
          if (!a) continue
          a.enabled = a === target
          a.setEffectiveWeight(a === target ? 1 : 0)
        }
        target.play()
        active = target
        const dur = target.getClip().duration || 1
        target.time = Math.max(0, Math.min(dur, phase * dur))
        mixer.update(0)
        if (target === walkAction && bones.hips) {
          bones.hips.position.x = hipsBindX
          bones.hips.position.z = hipsBindZ
        }
        model.updateMatrixWorld(true)
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
      onReady({ model, fit, bones, update, freezePose })
    },
    undefined,
    (err) => onError?.(err)
  )
}
