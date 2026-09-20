import * as THREE from 'three'
import type { Capsule } from './colliders'
import type { ExtremityFrame, ExtremityFrames } from './extremities'
import { BodyMesh, type BodyPart } from './BodyMesh'
import { loadGlbBody, measureGlbHead, type GlbBody, type GlbHead } from './GlbMannequin'
import { makeSkinMaterial, applySkinLook, type SkinLook } from './skin'
import { getPose, type PoseName } from './poses'
import { applyPostureToColliders, bendPoint, postureAngles, type PostureName } from './posture'
import { WALK_STYLES, type WalkStyle, type WalkStyleName } from './walkStyles'
import { headFrame } from './face'
import { bellySpec } from './maternity'
import { BodyCollider } from '../cloth/BodyCollider'

/** Key body measurements (metres) garments are fitted to (scale with body size). */
export interface Measurements {
  chestR: number
  waistR: number
  hipR: number
  thighR: number
  /** Head + neck radii (for headwear specs + fit). */
  headR: number
  neckR: number
  /** The real skull top (m) — measured off the GLB skin on load; procedural = neckY + 2.7·headR.
   *  Crown headwear hangs from here, so it lands on the ACTUAL head of either body. */
  crownY: number
  /** The skull base (the head joint / ear line) — with crownY it gives the true head
   *  span, so face landmarks (eye/mouth lines) scale to the real head of either body. */
  headBaseY: number
  neckY: number
  shoulderY: number
  chestY: number
  waistY: number
  hipY: number
  kneeY: number
  ankleY: number
  hipHalfX: number
  shoulderHalfX: number
}

/** Two slim, elongated "runway model" figures — a female and a male. */
export type BodyType = 'female' | 'male'

/** Per-type proportions (radii + widths + limb girths), size 1.0. */
interface Proportions {
  chestR: number
  waistR: number
  hipR: number
  thighR: number
  shoulderHalfX: number
  hipHalfX: number
  upperArmR: number
  foreArmR: number
  headR: number
  neckR: number
}

// Reference widths the skeleton bone X-positions were authored at (baseDefs).
const REF_SHOULDER = 0.2
const REF_HIP = 0.11

// Slim, model-like figures: female = narrow shoulders, nipped waist, soft hips;
// male = broad shoulders, straighter waist, narrow hips. Both lean.
const PROPORTIONS: Record<BodyType, Proportions> = {
  female: {
    chestR: 0.132, waistR: 0.097, hipR: 0.162, thighR: 0.081,
    shoulderHalfX: 0.151, hipHalfX: 0.116, upperArmR: 0.041, foreArmR: 0.032,
    headR: 0.095, neckR: 0.05
  },
  male: {
    chestR: 0.155, waistR: 0.119, hipR: 0.143, thighR: 0.094,
    shoulderHalfX: 0.201, hipHalfX: 0.099, upperArmR: 0.052, foreArmR: 0.041,
    headR: 0.101, neckR: 0.057
  }
}

/** Vertical landmarks (shared; the height slider scales these). */
const LANDMARKS = {
  neckY: 1.5, shoulderY: 1.45, chestY: 1.34, waistY: 1.07, hipY: 0.95, kneeY: 0.49, ankleY: 0.09
}

function measurementsFor(type: BodyType): Measurements {
  const p = PROPORTIONS[type]
  return {
    chestR: p.chestR, waistR: p.waistR, hipR: p.hipR, thighR: p.thighR,
    headR: p.headR, neckR: p.neckR, crownY: LANDMARKS.neckY + p.headR * 2.7, headBaseY: LANDMARKS.neckY + p.headR * 0.7,
    hipHalfX: p.hipHalfX, shoulderHalfX: p.shoulderHalfX, ...LANDMARKS
  }
}

/** Base (size 1.0) measurements — the female model by default. */
export const MEASUREMENTS: Measurements = measurementsFor('female')

/**
 * bodyType picks the figure (female/male). height scales Y; build scales overall
 * girth; bust/waist/hips are per-region multipliers on top of build, so the body
 * can be *shaped* (hourglass, pear, …), not just uniformly scaled.
 */
export interface BodyParams {
  bodyType: BodyType
  height: number
  build: number
  bust: number
  waist: number
  hips: number
  /** Maternity — trimester 0…3 (absent/0 = none; the bump stays buried in the torso). */
  belly?: number
}
export const DEFAULT_BODY: BodyParams = {
  bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1
}

export type AnimationMode = 'static' | 'idle' | 'walk' | 'turn'

/** World-space frames garments pin to so they follow the moving body (torso = tops, hip = bottoms,
 *  armL/armR = sleeve shoulders, handL/handR = sleeve cuffs; armL/handL are the −x side, R the +x). */
export interface BodyAnchors {
  /** Head frame (crown + head basis) — headwear pins follow this; turns/nods with the body. */
  head: THREE.Matrix4
  torso: THREE.Matrix4
  hip: THREE.Matrix4
  armL: THREE.Matrix4
  armR: THREE.Matrix4
  foreL: THREE.Matrix4
  foreR: THREE.Matrix4
  /** true when the limbs actually animate (GLB) — sleeves then also elbow-pin to the forearms. */
  rigged: boolean
}

/**
 * The **head anchor** frame (world) — the crown position + the orthonormal head basis
 * (right/up/forward), as a rigid `Matrix4` that headwear pins follow. Pure; works for the
 * procedural body and the GLB rig alike (the head capsule is fit to the GLB head bone), so
 * it turns and nods with the animated head.
 */
export function headAnchor(colliders: Capsule[], out: THREE.Matrix4 = new THREE.Matrix4()): THREE.Matrix4 {
  const hf = headFrame(colliders)
  return out.makeBasis(hf.right, hf.up, hf.forward).setPosition(hf.crown)
}

export interface Mannequin {
  group: THREE.Group
  colliders: Capsule[]
  /** Hand/foot joint + pointing direction, from the rig's tip bones (empty when unrigged). */
  extremities: () => ExtremityFrames
  measurements: Measurements
  /** Mesh-accurate body collision surface (valid while the body is static). */
  bodyCollider: BodyCollider
  update: (t: number, mode: AnimationMode, speed: number) => void
  /** Resize in place; mutates colliders + measurements so garments can refit. */
  resize: (body: Partial<BodyParams>) => void
  /** true = realistic GLB, false = procedural metaball body. */
  setBodyMode: (realistic: boolean) => void
  /** Ghost mannequin — hide the body visuals (colliders stay live) for product shots. */
  setGhost: (on: boolean) => void
  /** Set the static lookbook pose (applied while the animation mode is `static`). */
  setPose: (name: PoseName) => void
  /** Set the posture carriage (athletic · slouch · swayback) — layered on any pose. */
  setPosture: (name: PostureName) => void
  /** Set the walk style (commercial · editorial · sport) — stride, arms, cadence. */
  setWalkStyle: (name: WalkStyleName) => void
  /** Set the avatar's complexion (skin tone + undertone) — the shared body/GLB material. */
  setSkinTone: (look: SkinLook) => void
  /** Current body anchors — garments pin to these so they follow the animated body. */
  anchors: () => BodyAnchors
  /** Called when the body swaps (async GLB load / toggle) — re-drape garments onto it. */
  setOnBodyChange: (cb: () => void) => void
}

type Part = 'root' | 'armL' | 'armR' | 'legL' | 'legR'
/** Which body-width the bone's X follows (so shoulder/hip width shapes the frame). */
type WidthKey = 'shoulder' | 'hip' | 'center'

interface Bone {
  baseA: THREE.Vector3
  baseB: THREE.Vector3
  baseRadius: number
  part: Part
  widthKey: WidthKey
  restA: THREE.Vector3
  restB: THREE.Vector3
  radius: number
  collider: Capsule
}

const X = new THREE.Vector3(1, 0, 0)

/**
 * A procedural, poseable AND resizable humanoid. Metaballs give a smooth,
 * connected body; capsules along the same skeleton are the cloth colliders.
 */
export function buildMannequin(bodyInit: Partial<BodyParams> = {}): Mannequin {
  const body: BodyParams = { ...DEFAULT_BODY, ...bodyInit }

  const baseDefs: { a: [number, number, number]; b: [number, number, number]; radius: number; part: Part; w: WidthKey }[] = [
    { a: [0, 1.61, 0], b: [0, 1.66, 0], radius: 0.1, part: 'root', w: 'center' },
    { a: [0, 1.46, 0], b: [0, 1.55, 0], radius: 0.048, part: 'root', w: 'center' },
    { a: [0, 1.0, 0], b: [0, 1.42, 0], radius: 0.15, part: 'root', w: 'center' },
    { a: [-0.15, 1.43, 0], b: [0.15, 1.43, 0], radius: 0.05, part: 'root', w: 'shoulder' },
    { a: [-0.14, 0.98, 0], b: [0.14, 0.98, 0], radius: 0.14, part: 'root', w: 'hip' },
    { a: [-0.19, 1.43, 0], b: [-0.31, 1.1, 0.02], radius: 0.05, part: 'armL', w: 'shoulder' },
    { a: [-0.31, 1.1, 0.02], b: [-0.4, 0.82, 0.05], radius: 0.042, part: 'armL', w: 'shoulder' },
    { a: [-0.1, 0.98, 0], b: [-0.12, 0.52, 0.01], radius: 0.088, part: 'legL', w: 'hip' },
    { a: [-0.12, 0.52, 0.01], b: [-0.12, 0.08, 0.03], radius: 0.06, part: 'legL', w: 'hip' }
  ]
  const mirrored = baseDefs.slice(5).map((d) => ({
    a: [-d.a[0], d.a[1], d.a[2]] as [number, number, number],
    b: [-d.b[0], d.b[1], d.b[2]] as [number, number, number],
    radius: d.radius,
    part: (d.part === 'armL' ? 'armR' : 'legR') as Part,
    w: d.w
  }))

  const group = new THREE.Group()
  group.name = 'mannequin'
  // Warm skin material for the studio mannequin — reads as photoreal-ish skin
  // (a textured GLB at assets/mannequin.glb overrides it). See `avatar/skin.ts`.
  const material = makeSkinMaterial()

  const bones: Bone[] = []
  const colliders: Capsule[] = []
  for (const d of [...baseDefs, ...mirrored]) {
    const collider: Capsule = { a: new THREE.Vector3(), b: new THREE.Vector3(), radius: 0 }
    colliders.push(collider)
    bones.push({
      baseA: new THREE.Vector3(...d.a),
      baseB: new THREE.Vector3(...d.b),
      baseRadius: d.radius,
      part: d.part,
      widthKey: d.w,
      restA: new THREE.Vector3(),
      restB: new THREE.Vector3(),
      radius: 0,
      collider
    })
  }

  // Maternity belly — one extra capsule appended AFTER the 13 skeleton capsules
  // (all fixed indices stay valid). It is simultaneously the cloth collider and
  // the visual metaball (same object), so drape and eye can never disagree; at
  // belly=0 it sits buried inside the torso and the default figure is unchanged.
  const bellyBone: Bone = {
    baseA: new THREE.Vector3(),
    baseB: new THREE.Vector3(),
    baseRadius: 0,
    part: 'root',
    widthKey: 'center',
    restA: new THREE.Vector3(),
    restB: new THREE.Vector3(),
    radius: 0,
    collider: { a: new THREE.Vector3(), b: new THREE.Vector3(), radius: 0 }
  }
  bones.push(bellyBone)
  colliders.push(bellyBone.collider)

  // GLB face — one more appended capsule (index 14): the visual face (brow →
  // chin, the nose) protrudes past the skull capsule, and GLB mode is capsule-
  // only (no mesh BVH), so face-hugging headwear sank straight through it.
  // Positioned by fitCollidersToGlb; radius 0 (inert) on the procedural body.
  const faceCollider: Capsule = { a: new THREE.Vector3(), b: new THREE.Vector3(), radius: 0 }
  colliders.push(faceCollider)

  const measurements: Measurements = { ...MEASUREMENTS }
  const bodyMesh = new BodyMesh(material)
  group.add(bodyMesh.object)

  // Mesh-accurate cloth collision surface. Rebuilt from the metaball body when
  // it's static (the design case); invalidated during animation / GLB mode, where
  // cloth falls back to the bone capsules.
  const bodyCollider = new BodyCollider()
  const syncBodyBVH = (animating: boolean): void => {
    if (!useGlb && !animating) bodyCollider.buildFromMarchingCubes(bodyMesh.object)
    else bodyCollider.invalidate()
  }

  // Default = the bundled GLB body (a real avatar; drop a photoreal skin into
  // assets/mannequin.glb to swap it). It loads async, so the procedural matte body
  // shows until it arrives, then swaps in; a load failure keeps the procedural body
  // (graceful fallback). `?body=mesh` or the Avatar toggle forces the procedural one.
  // `wantGlb` remembers the intent even if the async load hasn't finished yet.
  let useGlb = false
  let wantGlb = true
  let glb: GlbBody | null = null
  let onBodyChange: (() => void) | null = null // notified when the body swaps (GLB ↔ procedural)
  let glbHead: GlbHead | null = null // measured skull/nose (bind pose) — aims the head/face colliders
  loadGlbBody(
    material,
    (b) => {
      glb = b
      group.add(b.model)
      b.fit(body.height, body.build)
      if (b.bones.head) glbHead = measureGlbHead(b.model, b.bones.head) // the REAL skull/nose, off the skin
      applyBodyMode() // fits colliders + crownY, then rebuilds garments onto them
    },
    () => {
      wantGlb = false
      useGlb = false
      bodyMesh.object.visible = true
    }
  )

  const pivot: Record<Part, THREE.Vector3> = {
    root: new THREE.Vector3(),
    armL: new THREE.Vector3(),
    armR: new THREE.Vector3(),
    legL: new THREE.Vector3(),
    legR: new THREE.Vector3()
  }

  // Anatomy radii per collider index (a = start, b = end of each segment). The
  // narrow torso-bottom (waist) + wider hips blend into a natural waist.
  const P = (): Proportions => PROPORTIONS[body.bodyType]
  // Pelvis/seat radius — ONE source of truth, consumed by BOTH the metaball mesh
  // (partSpec below) and the hip collider (applyBody). Keeps the rear slim + near-flat
  // and garments hanging straight over it. Hip *width* comes from the segment span, not
  // this radius, so slimming it flattens depth (the rear) far more than width.
  const SEAT = 0.52
  const seatRadius = (): number => measurements.hipR * SEAT
  const partSpec: { rA: () => number; rB: () => number; cap?: BodyPart['cap'] }[] = [
    { rA: () => P().headR * body.build, rB: () => P().headR * body.build, cap: 'head' },
    { rA: () => P().neckR * body.build, rB: () => (P().neckR + 0.014) * body.build }, // neck (widens to jaw/shoulders)
    { rA: () => measurements.waistR, rB: () => measurements.chestR * 0.88 }, // torso (waist→upper-chest; bust adds fullness)
    { rA: () => 0.05 * body.build, rB: () => 0.05 * body.build }, // shoulders (slim — trapezius/deltoid round it)
    { rA: () => seatRadius(), rB: () => seatRadius() }, // hips/seat (single-source; slim rear)
    { rA: () => P().upperArmR * body.build, rB: () => (P().upperArmR - 0.008) * body.build }, // upper arm
    { rA: () => (P().upperArmR - 0.008) * body.build, rB: () => P().foreArmR * body.build, cap: 'hand' }, // forearm
    { rA: () => measurements.thighR, rB: () => measurements.thighR * 0.68 }, // thigh
    { rA: () => measurements.thighR * 0.68, rB: () => 0.048 * body.build, cap: 'foot' } // shin
  ]
  // mirror arms + legs, then the belly (visual radius = its collider radius),
  // then the GLB face blob — collider-only, no visual metaball (radius 0 here)
  const fullSpec = [...partSpec, ...partSpec.slice(5), { rA: () => bellyBone.radius, rB: () => bellyBone.radius }, { rA: () => 0, rB: () => 0 }]
  const parts: BodyPart[] = colliders.map((c, i) => ({
    a: c.a,
    b: c.b,
    radiusA: 0,
    radiusB: 0,
    cap: fullSpec[i].cap
  }))
  const buildParts = (): BodyPart[] => {
    for (let i = 0; i < parts.length; i++) {
      parts[i].radiusA = fullSpec[i].rA()
      parts[i].radiusB = fullSpec[i].rB()
    }
    return parts
  }

  // Extra *visual-only* shaping metaballs (never colliders): bust/pecs, deltoids,
  // chest & upper-back depth, knees — the difference between a plain tube and a
  // believable human figure. When the body is static the collision BVH is rebuilt
  // from this richer surface, so garments drape over the real shape.
  const shape: BodyPart[] = Array.from({ length: 10 }, () => ({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    radiusA: 0,
    radiusB: 0
  }))
  const setSeg = (
    i: number,
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    r: number
  ): void => {
    shape[i].a.set(ax, ay, az)
    shape[i].b.set(bx, by, bz)
    shape[i].radiusA = r
    shape[i].radiusB = r
  }
  const buildShape = (): BodyPart[] => {
    const m = measurements
    const female = body.bodyType === 'female'
    const cR = m.chestR
    const cY = m.chestY
    const sY = m.shoulderY
    const kY = m.kneeY
    const tR = m.thighR
    const sHX = m.shoulderHalfX
    const bl = body.build
    // bust (female) / pecs (male)
    if (female) {
      const r = cR * 0.5 * body.bust
      const x = cR * 0.5
      setSeg(0, -x, cY + 0.02, cR * 0.12, -x, cY - 0.05, cR * 0.52, r)
      setSeg(1, x, cY + 0.02, cR * 0.12, x, cY - 0.05, cR * 0.52, r)
    } else {
      const r = cR * 0.46 * body.bust
      const x = cR * 0.62
      setSeg(0, -x, cY + 0.06, cR * 0.02, -x, cY, cR * 0.26, r)
      setSeg(1, x, cY + 0.06, cR * 0.02, x, cY, cR * 0.26, r)
    }
    // deltoids — round the shoulder caps into the arms (bigger, rounder, softer)
    const dR = P().upperArmR * bl * 1.7
    const dx = sHX * 0.82
    setSeg(2, -dx, sY - 0.01, 0, -dx * 1.02, sY - 0.08, 0, dR)
    setSeg(3, dx, sY - 0.01, 0, dx * 1.02, sY - 0.08, 0, dR)
    // chest-front + upper-back depth (so the torso reads as a body, not a cylinder)
    setSeg(4, 0, cY + 0.03, cR * 0.05, 0, cY - 0.1, cR * 0.32, cR * (female ? 0.5 : 0.56))
    setSeg(5, 0, sY - 0.03, -cR * 0.1, 0, cY - 0.02, -cR * 0.42, cR * 0.44)
    // knees
    const kx = 0.12 * bl
    const kR = tR * 0.66
    setSeg(6, -kx, kY + 0.06, tR * 0.1, -kx, kY - 0.04, tR * 0.34, kR)
    setSeg(7, kx, kY + 0.06, tR * 0.1, kx, kY - 0.04, tR * 0.34, kR)
    // trapezius — a smooth slope from the neck base out to the shoulders (kills the
    // square notch between neck and shoulder that made the figure look boxy)
    const trR = P().neckR * bl * 0.95
    setSeg(8, -0.03, sY + 0.05, -0.01, -dx * 0.92, sY - 0.02, -0.01, trR)
    setSeg(9, 0.03, sY + 0.05, -0.01, dx * 0.92, sY - 0.02, -0.01, trR)
    return shape
  }

  // Collider-bound parts + visual shaping parts, referenced once (both are mutated
  // in place each rebuild, so this array stays valid without per-frame allocation).
  const allParts: BodyPart[] = [...parts, ...shape]
  const posturePivot = new THREE.Vector3()
  const buildAll = (): BodyPart[] => {
    buildParts()
    buildShape()
    // the visual shaping balls (bust · deltoids · chest/back depth) ride the carriage:
    // bend everything above the waist by the posture, matching the bent colliders.
    const pa = postureAngles(posture)
    if (pa.spine !== 0) {
      posturePivot.set(0, measurements.waistY, 0)
      for (const seg of shape) {
        if (Math.min(seg.a.y, seg.b.y) <= measurements.waistY) continue // knees etc.
        bendPoint(seg.a, posturePivot, pa.spine)
        bendPoint(seg.b, posturePivot, pa.spine)
      }
    }
    return allParts
  }

  /** Recompute rest bones + measurements + pivots from the current body size. */
  function applyBody(): void {
    const h = body.height
    const b = body.build
    const p = PROPORTIONS[body.bodyType]
    measurements.chestR = p.chestR * b * body.bust
    measurements.waistR = p.waistR * b * body.waist
    measurements.hipR = p.hipR * b * body.hips
    measurements.thighR = p.thighR * b * body.hips
    measurements.headR = p.headR * b
    measurements.neckR = p.neckR * b
    measurements.hipHalfX = p.hipHalfX * b * body.hips
    measurements.shoulderHalfX = p.shoulderHalfX * b
    measurements.neckY = LANDMARKS.neckY * h
    measurements.crownY = LANDMARKS.neckY * h + measurements.headR * 2.7 // ≈ the visual crown
    measurements.headBaseY = LANDMARKS.neckY * h + measurements.headR * 0.7 // ≈ the ear line
    measurements.shoulderY = LANDMARKS.shoulderY * h
    measurements.chestY = LANDMARKS.chestY * h
    measurements.waistY = LANDMARKS.waistY * h
    measurements.hipY = LANDMARKS.hipY * h
    measurements.kneeY = LANDMARKS.kneeY * h
    measurements.ankleY = LANDMARKS.ankleY * h

    pivot.armL.set(-measurements.shoulderHalfX, measurements.shoulderY, 0)
    pivot.armR.set(measurements.shoulderHalfX, measurements.shoulderY, 0)
    pivot.legL.set(-measurements.hipHalfX, measurements.hipY, 0)
    pivot.legR.set(measurements.hipHalfX, measurements.hipY, 0)

    // Shoulder/hip width scale the frame (broad-shouldered male vs narrow female).
    const shoulderR = p.shoulderHalfX / REF_SHOULDER
    const hipR = p.hipHalfX / REF_HIP
    for (const bone of bones) {
      const wr = bone.widthKey === 'shoulder' ? shoulderR : bone.widthKey === 'hip' ? hipR : 1
      bone.restA.set(bone.baseA.x * b * wr, bone.baseA.y * h, bone.baseA.z * b)
      bone.restB.set(bone.baseB.x * b * wr, bone.baseB.y * h, bone.baseB.z * b)
      bone.radius = bone.baseRadius * b
      bone.collider.radius = bone.radius
    }
    // Pelvis collider = the mesh seat radius (single source), so cloth collides against
    // the *visible* slim rear, not a fat invisible capsule. bones[4] is the hip segment.
    bones[4].radius = bones[4].collider.radius = seatRadius()
    // Maternity bump — rest capsule from the pure spec (overwrites the generic
    // bones-loop rest above). Best shown on the procedural body; in GLB mode the
    // capsule still shapes the drape at its rest spot (the rig walks in place).
    const belly = bellySpec(body.belly ?? 0, measurements)
    bellyBone.restA.set(belly.a[0], belly.a[1], belly.a[2])
    bellyBone.restB.set(belly.b[0], belly.b[1], belly.b[2])
    bellyBone.radius = bellyBone.collider.radius = belly.radius
  }

  const a = new THREE.Vector3()
  const bv = new THREE.Vector3()
  const curAngle: Record<Part, number> = { root: 0, armL: 0, armR: 0, legL: 0, legR: 0 }
  let lastKey = ''

  const applyPose = (angle: Record<Part, number>): void => {
    for (const bone of bones) {
      a.copy(bone.restA)
      bv.copy(bone.restB)
      const ang = angle[bone.part]
      if (ang !== 0) {
        const p = pivot[bone.part]
        a.sub(p).applyAxisAngle(X, ang).add(p)
        bv.sub(p).applyAxisAngle(X, ang).add(p)
      }
      bone.collider.a.copy(a)
      bone.collider.b.copy(bv)
    }
    // carriage: bend the upper chain into the current posture (layered on the pose)
    applyPostureToColliders(colliders, measurements.waistY, postureAngles(posture))
  }

  // Drive the cloth capsules from the GLB rig so garments follow the animated body.
  // Capsule order (baseDefs): 0 head, 1 neck, 2 torso, 3 shoulder line, 4 hip line,
  // 5/6 left arm, 7/8 left leg, 9/10 right arm, 11/12 right leg.
  const wp = new THREE.Vector3()
  const wp2 = new THREE.Vector3()
  const setCap = (i: number, ba?: THREE.Object3D, bb?: THREE.Object3D): void => {
    if (!ba || !bb) return
    ba.getWorldPosition(wp)
    bb.getWorldPosition(wp2)
    colliders[i].a.copy(wp)
    colliders[i].b.copy(wp2)
  }
  const fitCollidersToGlb = (): void => {
    if (!glb) return
    const b = glb.bones
    setCap(2, b.hips, b.chest) // torso
    setCap(1, b.chest, b.neck)
    // The head BONE is a joint at the skull BASE — a neck→head capsule is really
    // the neck, leaving the whole skull uncollidable (headwear slid off the phantom
    // head, hats floated). Span the head capsule from the head joint UP the neck→
    // head axis over the skull; its radius still reaches down across the jaw.
    if (b.neck && b.head) {
      b.neck.getWorldPosition(wp)
      b.head.getWorldPosition(wp2)
      // the skull capsule: the #309 proportions (visually validated on the GLB) —
      // the bind-pose mesh measurement under-reports the posed crown, so the
      // measured head drives only the FACE blob below
      const r = colliders[0].radius
      wp.subVectors(wp2, wp).normalize() // the skull's up axis
      colliders[0].a.copy(wp2)
      colliders[0].b.copy(wp2).addScaledVector(wp, 1.15 * r)
      measurements.crownY = colliders[0].b.y + r // the skull top — crown headwear hangs from here
      measurements.headBaseY = wp2.y // the head joint = the skull base / ear line
      // the face blob — aimed at the MEASURED nose tip, rotated with the live head
      // bone, sized so its surface touches the nose (cloth rests on the real face)
      if (glbHead) {
        b.head.getWorldQuaternion(faceQuat).multiply(glbHead.bindQuatInv)
        faceScratch.copy(glbHead.nose).applyQuaternion(faceQuat) // nose offset, current pose
        const noseOut = Math.hypot(faceScratch.x, faceScratch.z)
        const fr = Math.max(0.02, 0.5 * noseOut)
        const ox = (faceScratch.x / (noseOut || 1)) * (noseOut - fr)
        const oz = (faceScratch.z / (noseOut || 1)) * (noseOut - fr)
        faceCollider.radius = fr
        faceCollider.a.set(wp2.x + ox, wp2.y + (glbHead.skullH || r) * 0.55, wp2.z + oz)
        faceCollider.b.set(wp2.x + ox, wp2.y - 0.25 * r, wp2.z + oz)
      } else {
        faceCollider.radius = 0.42 * r
        faceCollider.a.copy(wp2).addScaledVector(wp, 0.62 * r)
        faceCollider.a.z += 0.62 * r
        faceCollider.b.copy(wp2).addScaledVector(wp, -0.28 * r)
        faceCollider.b.z += 0.55 * r
      }
    }
    // Match the procedural left capsules (−x) to whichever GLB side is on −x. This
    // has to be settled BEFORE the shoulder and hip lines are set, not after: those
    // two are the only capsules whose a→b direction is read as a body axis, so
    // taking their ends from the rig's own Left/Right naming flips the whole frame
    // on a rig whose `Left` is on +x. `headFrame` derives `right` from the shoulder
    // line and `forward` from `right`, so a flipped shoulder line puts the face, the
    // cap bills and everything worn on the chest round the back.
    let negS: 'l' | 'r' = 'l'
    if (b.lArm && b.rArm) {
      b.lArm.getWorldPosition(wp)
      b.rArm.getWorldPosition(wp2)
      negS = wp.x <= wp2.x ? 'l' : 'r'
    }
    const posS: 'l' | 'r' = negS === 'l' ? 'r' : 'l'
    const bn = (s: 'l' | 'r', seg: string): THREE.Object3D | undefined => b[(s + seg) as keyof typeof b]
    setCap(3, bn(negS, 'Arm'), bn(posS, 'Arm')) // shoulder line: a on −x, b on +x
    setCap(4, bn(negS, 'UpLeg'), bn(posS, 'UpLeg')) // hip line, same convention
    setCap(5, bn(negS, 'Arm'), bn(negS, 'Fore'))
    setCap(6, bn(negS, 'Fore'), bn(negS, 'Hand'))
    setCap(7, bn(negS, 'UpLeg'), bn(negS, 'Leg'))
    setCap(8, bn(negS, 'Leg'), bn(negS, 'Foot'))
    setCap(9, bn(posS, 'Arm'), bn(posS, 'Fore'))
    setCap(10, bn(posS, 'Fore'), bn(posS, 'Hand'))
    setCap(11, bn(posS, 'UpLeg'), bn(posS, 'Leg'))
    setCap(12, bn(posS, 'Leg'), bn(posS, 'Foot'))
  }

  // Body anchors garments pin to. GLB → chest/hips bones (move with the animation);
  // procedural → static frames at the chest/hip landmarks (the torso doesn't animate).
  const anchorScratch = new THREE.Vector3()
  const faceQuat = new THREE.Quaternion()
  const faceScratch = new THREE.Vector3()
  const headMat = new THREE.Matrix4()
  const torsoMat = new THREE.Matrix4()
  const hipMat = new THREE.Matrix4()
  const armLMat = new THREE.Matrix4()
  const armRMat = new THREE.Matrix4()
  const foreLMat = new THREE.Matrix4()
  const foreRMat = new THREE.Matrix4()
  const anchors = (): BodyAnchors => {
    // Head anchor from the live head frame — same for both paths (colliders track the body/rig).
    headAnchor(colliders, headMat)
    if (useGlb && glb?.bones.hips) {
      const chest = glb.bones.chest ?? glb.bones.neck ?? glb.bones.hips
      chest.updateWorldMatrix(true, false)
      glb.bones.hips.updateWorldMatrix(true, false)
      torsoMat.copy(chest.matrixWorld)
      hipMat.copy(glb.bones.hips.matrixWorld)
      const la = glb.bones.lArm
      const ra = glb.bones.rArm
      const setSide = (mat: THREE.Matrix4, other: THREE.Matrix4, neg?: THREE.Object3D, pos?: THREE.Object3D, laIsNeg = true): void => {
        if (neg && pos) {
          neg.updateWorldMatrix(true, false)
          pos.updateWorldMatrix(true, false)
          mat.copy((laIsNeg ? neg : pos).matrixWorld)
          other.copy((laIsNeg ? pos : neg).matrixWorld)
        } else {
          mat.copy(torsoMat)
          other.copy(torsoMat)
        }
      }
      const laIsNeg = !la || !ra || la.matrixWorld.elements[12] <= ra.matrixWorld.elements[12] // −x arm → armL
      setSide(armLMat, armRMat, la, ra, laIsNeg)
      setSide(foreLMat, foreRMat, glb.bones.lFore, glb.bones.rFore, laIsNeg)
      return { head: headMat, torso: torsoMat, hip: hipMat, armL: armLMat, armR: armRMat, foreL: foreLMat, foreR: foreRMat, rigged: true }
    }
    // static frames at the body landmarks, bent into the current posture so
    // pinned garments ride the carriage (identity when posture = neutral)
    const pa = postureAngles(posture)
    posturePivot.set(0, measurements.waistY, 0)
    anchorScratch.set(0, measurements.chestY, 0)
    if (pa.spine !== 0) bendPoint(anchorScratch, posturePivot, pa.spine)
    torsoMat.makeTranslation(anchorScratch.x, anchorScratch.y, anchorScratch.z)
    hipMat.makeTranslation(0, measurements.hipY, 0)
    anchorScratch.set(-measurements.shoulderHalfX, measurements.shoulderY, 0)
    if (pa.spine !== 0) bendPoint(anchorScratch, posturePivot, pa.spine)
    armLMat.makeTranslation(anchorScratch.x, anchorScratch.y, anchorScratch.z)
    anchorScratch.set(measurements.shoulderHalfX, measurements.shoulderY, 0)
    if (pa.spine !== 0) bendPoint(anchorScratch, posturePivot, pa.spine)
    armRMat.makeTranslation(anchorScratch.x, anchorScratch.y, anchorScratch.z)
    foreLMat.copy(armLMat)
    foreRMat.copy(armRMat)
    return { head: headMat, torso: torsoMat, hip: hipMat, armL: armLMat, armR: armRMat, foreL: foreLMat, foreR: foreRMat, rigged: false }
  }

  // Static lookbook pose (held while the animation mode is `static`).
  let currentPose: PoseName = 'stand'
  let posedKey = '' // guards the procedural rebuild so a held pose doesn't rebuild per frame
  const applyProcPose = (force: boolean): void => {
    const pose = getPose(currentPose)
    curAngle.legL = pose.proc.legL
    curAngle.legR = pose.proc.legR
    curAngle.armL = pose.proc.armL
    curAngle.armR = pose.proc.armR
    const key = `pose:${currentPose}`
    if (!force && key === posedKey) return
    posedKey = key
    lastKey = ''
    applyPose(curAngle)
    bodyMesh.rebuild(buildAll())
    syncBodyBVH(false)
  }
  // Walk style — how the walk reads (stride/arms/cadence + GLB playback rate).
  let walkStyle: WalkStyle = WALK_STYLES[0]
  const setWalkStyle = (name: WalkStyleName): void => {
    walkStyle = WALK_STYLES.find((w) => w.name === name) ?? WALK_STYLES[0]
  }

  // Posture carriage — layered on top of whatever pose/clip is active.
  let posture: PostureName = 'neutral'
  const applyGlbPosture = (): void => {
    if (!glb) return
    const pa = postureAngles(posture)
    if (pa.spine === 0 && pa.neck === 0) return
    // additive on the freshly sampled clip frame; world matrices refresh for the capsule fit
    if (glb.bones.chest) glb.bones.chest.rotation.x += pa.spine
    if (glb.bones.neck) glb.bones.neck.rotation.x += pa.neck
    glb.model.updateMatrixWorld(true)
  }
  const setPosture = (name: PostureName): void => {
    posture = name
    if (useGlb && glb) {
      posedKey = '' // force the static pose to re-sample + re-apply the new carriage
      applyCurrentPose(true)
    } else {
      applyPose(curAngle)
      bodyMesh.rebuild(buildAll())
      syncBodyBVH(false)
    }
    onBodyChange?.() // garments re-drape onto the new carriage
  }

  const applyCurrentPose = (force: boolean): void => {
    if (useGlb && glb) {
      const pose = getPose(currentPose)
      glb.freezePose(pose.glb.clip, pose.glb.phase)
      applyGlbPosture()
      fitCollidersToGlb()
    } else {
      applyProcPose(force)
    }
  }

  let lastT = 0
  const update = (t: number, mode: AnimationMode, speed: number): void => {
    const dt = Math.min(0.05, Math.max(0, t - lastT))
    lastT = t
    if (mode === 'static') {
      applyCurrentPose(false) // hold the current lookbook pose
      return
    }
    posedKey = '' // a moving mode → the next static re-applies the pose
    if (useGlb && glb) {
      // Play the rig's idle/walk clip (idle frozen when static) then snap the cloth
      // capsules onto its bones; garments follow via their body anchors (see anchors()).
      const animating = mode === 'idle' || mode === 'walk'
      // Ease the walk to half speed so the stride (and the cloth that hangs off it) reads
      // graceful rather than frantic, and the sim keeps up; idle plays at full rate.
      const rate = mode === 'walk' ? 0.5 * walkStyle.rate : 1
      glb.update(animating ? dt * speed * rate : 0, mode === 'walk')
      applyGlbPosture()
      fitCollidersToGlb()
      return
    }
    let legAmp = 0
    let armAmp = 0
    let freq = 0
    if (mode === 'walk') {
      legAmp = walkStyle.legAmp
      armAmp = walkStyle.armAmp
      freq = walkStyle.freq
    } else if (mode === 'idle') {
      legAmp = 0.05
      armAmp = 0.06
      freq = 0.9
    }
    const s = Math.sin(t * speed * freq)
    curAngle.legL = legAmp * s
    curAngle.legR = -legAmp * s
    curAngle.armL = -armAmp * s
    curAngle.armR = armAmp * s
    const key = `${curAngle.legL.toFixed(4)},${curAngle.armL.toFixed(4)}`
    if (key === lastKey) return
    lastKey = key
    applyPose(curAngle)
    bodyMesh.rebuild(buildAll())
    syncBodyBVH(true) // animating → capsules; rebuilding the BVH per frame is too costly
  }

  const resize = (next: Partial<BodyParams>): void => {
    Object.assign(body, next)
    applyBody()
    applyPose(curAngle)
    bodyMesh.rebuild(buildAll())
    syncBodyBVH(false) // static after a resize → rebuild the collision surface
    glb?.fit(body.height, body.build)
  }

  /** Set the static lookbook pose + re-settle garments (applied while mode = static). */
  const setPose = (name: PoseName): void => {
    currentPose = name
    applyCurrentPose(true)
    onBodyChange?.() // garments re-drape onto the new pose
  }

  /** Apply the current GLB/metaball choice (used by the toggle AND the async loader). */
  function applyBodyMode(): void {
    useGlb = wantGlb && glb != null
    if (useGlb) {
      curAngle.legL = curAngle.legR = curAngle.armL = curAngle.armR = 0
      applyPose(curAngle)
      lastKey = ''
    } else {
      bodyMesh.rebuild(buildAll())
    }
    applyVisibility()
    syncBodyBVH(false) // GLB → invalidate (no metaball surface); metaball → rebuild
    if (useGlb) fitCollidersToGlb() // colliders + crownY must be real before garments rebuild on them
    else faceCollider.radius = 0 // the procedural head IS its capsule + mesh — no face blob
    onBodyChange?.() // the body swapped (e.g. async GLB load) → garments re-drape + re-pin to it
  }
  /** Switch between the realistic GLB (static) and the animatable metaball body. */
  const setBodyMode = (realistic: boolean): void => {
    wantGlb = realistic
    applyBodyMode()
  }

  // Ghost mannequin — the e-commerce product shot: body visuals hidden, the cloth
  // colliders/anchors stay fully live so the garment keeps holding its worn shape.
  let ghost = false
  function applyVisibility(): void {
    if (glb) glb.model.visible = useGlb && !ghost
    bodyMesh.object.visible = !useGlb && !ghost
  }
  const setGhost = (on: boolean): void => {
    ghost = on
    applyVisibility()
  }

  applyBody()
  applyPose(curAngle)
  bodyMesh.rebuild(buildAll())
  syncBodyBVH(false) // initial static body → build the collision surface
  lastKey = '0.0000,0.0000'

  /**
   * **Extremity frames** — where the hands and feet are, and which way they point.
   *
   * Neither is derivable from the limb capsules. A capsule ends at the hand bone,
   * which is the *wrist*, and a hand is not collinear with its forearm; a foot toes
   * out from the shank rather than continuing it. Anything worn on an extremity —
   * a shoe, a sock, a glove — needs the real direction, and the rig has it in the
   * toe-base and middle-finger bones.
   *
   * Empty on the procedural body, where the caller falls back to the limb axis.
   */
  const extScratch = [new THREE.Vector3(), new THREE.Vector3()]
  const extremities = (): ExtremityFrames => {
    if (!glb) return {}
    const b = glb.bones
    let negS: 'l' | 'r' = 'l'
    if (b.lArm && b.rArm) {
      b.lArm.getWorldPosition(extScratch[0])
      b.rArm.getWorldPosition(extScratch[1])
      negS = extScratch[0].x <= extScratch[1].x ? 'l' : 'r'
    }
    const posS: 'l' | 'r' = negS === 'l' ? 'r' : 'l'
    const pair = (from?: THREE.Object3D, to?: THREE.Object3D, tipBone?: THREE.Object3D): ExtremityFrame | undefined => {
      if (!from || !to) return undefined
      const at = from.getWorldPosition(new THREE.Vector3())
      const toward = to.getWorldPosition(new THREE.Vector3())
      const dir = toward.clone().sub(at)
      if (dir.lengthSq() < 1e-10) return undefined
      return { at, dir: dir.normalize(), tip: tipBone?.getWorldPosition(new THREE.Vector3()) }
    }
    const bn = (s: 'l' | 'r', seg: string): THREE.Object3D | undefined => b[(s + seg) as keyof typeof b]
    return {
      handL: pair(bn(negS, 'Hand'), bn(negS, 'Mid'), bn(negS, 'MidTip')),
      handR: pair(bn(posS, 'Hand'), bn(posS, 'Mid'), bn(posS, 'MidTip')),
      footL: pair(bn(negS, 'Foot'), bn(negS, 'Toe')),
      footR: pair(bn(posS, 'Foot'), bn(posS, 'Toe'))
    }
  }

  return {
    group,
    colliders,
    extremities,
    measurements,
    bodyCollider,
    update,
    resize,
    setBodyMode,
    setGhost,
    setPose,
    setPosture,
    setWalkStyle,
    setSkinTone: (look) => applySkinLook(material, look),
    anchors,
    setOnBodyChange: (cb) => (onBodyChange = cb)
  }
}
