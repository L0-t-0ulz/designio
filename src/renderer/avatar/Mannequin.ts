import * as THREE from 'three'
import type { Capsule } from './colliders'
import { BodyMesh, type BodyPart } from './BodyMesh'
import { loadGlbBody, type GlbBody } from './GlbMannequin'
import { BodyCollider } from '../cloth/BodyCollider'

/** Key body measurements (metres) garments are fitted to (scale with body size). */
export interface Measurements {
  chestR: number
  waistR: number
  hipR: number
  thighR: number
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
}
export const DEFAULT_BODY: BodyParams = {
  bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1
}

export type AnimationMode = 'static' | 'idle' | 'walk' | 'turn'

/** World-space frames garments pin to so they follow the moving body (torso = tops, hip = bottoms,
 *  armL/armR = sleeves; armL is the −x arm, armR the +x). */
export interface BodyAnchors {
  torso: THREE.Matrix4
  hip: THREE.Matrix4
  armL: THREE.Matrix4
  armR: THREE.Matrix4
}

export interface Mannequin {
  group: THREE.Group
  colliders: Capsule[]
  measurements: Measurements
  /** Mesh-accurate body collision surface (valid while the body is static). */
  bodyCollider: BodyCollider
  update: (t: number, mode: AnimationMode, speed: number) => void
  /** Resize in place; mutates colliders + measurements so garments can refit. */
  resize: (body: Partial<BodyParams>) => void
  /** true = realistic GLB, false = procedural metaball body. */
  setBodyMode: (realistic: boolean) => void
  /** Current body anchors — garments pin to these so they follow the animated body. */
  anchors: () => BodyAnchors
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
  // Matte studio-mannequin material (neutral plaster; a whisper of sheen).
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xe9e7e2,
    roughness: 0.85,
    metalness: 0,
    sheen: 0.25,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0xffffff)
  })

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
  loadGlbBody(
    material,
    (b) => {
      glb = b
      group.add(b.model)
      b.fit(body.height, body.build)
      applyBodyMode() // honour any toggle made while the model was still loading
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
  const fullSpec = [...partSpec, ...partSpec.slice(5)] // mirror arms + legs
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
  const buildAll = (): BodyPart[] => {
    buildParts()
    buildShape()
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
    measurements.hipHalfX = p.hipHalfX * b * body.hips
    measurements.shoulderHalfX = p.shoulderHalfX * b
    measurements.neckY = LANDMARKS.neckY * h
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
    setCap(0, b.neck, b.head)
    setCap(3, b.lArm, b.rArm) // shoulder line
    setCap(4, b.lUpLeg, b.rUpLeg) // hip line
    // Match the procedural left capsules (−x) to whichever GLB side is on −x.
    let negS: 'l' | 'r' = 'l'
    if (b.lArm && b.rArm) {
      b.lArm.getWorldPosition(wp)
      b.rArm.getWorldPosition(wp2)
      negS = wp.x <= wp2.x ? 'l' : 'r'
    }
    const posS: 'l' | 'r' = negS === 'l' ? 'r' : 'l'
    const bn = (s: 'l' | 'r', seg: string): THREE.Object3D | undefined => b[(s + seg) as keyof typeof b]
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
  const torsoMat = new THREE.Matrix4()
  const hipMat = new THREE.Matrix4()
  const armLMat = new THREE.Matrix4()
  const armRMat = new THREE.Matrix4()
  const anchors = (): BodyAnchors => {
    if (useGlb && glb?.bones.hips) {
      const chest = glb.bones.chest ?? glb.bones.neck ?? glb.bones.hips
      chest.updateWorldMatrix(true, false)
      glb.bones.hips.updateWorldMatrix(true, false)
      torsoMat.copy(chest.matrixWorld)
      hipMat.copy(glb.bones.hips.matrixWorld)
      const la = glb.bones.lArm
      const ra = glb.bones.rArm
      if (la && ra) {
        la.updateWorldMatrix(true, false)
        ra.updateWorldMatrix(true, false)
        const laIsNeg = la.matrixWorld.elements[12] <= ra.matrixWorld.elements[12] // −x arm → armL
        armLMat.copy((laIsNeg ? la : ra).matrixWorld)
        armRMat.copy((laIsNeg ? ra : la).matrixWorld)
      } else {
        armLMat.copy(torsoMat)
        armRMat.copy(torsoMat)
      }
    } else {
      torsoMat.makeTranslation(0, measurements.chestY, 0)
      hipMat.makeTranslation(0, measurements.hipY, 0)
      armLMat.makeTranslation(-measurements.shoulderHalfX, measurements.shoulderY, 0)
      armRMat.makeTranslation(measurements.shoulderHalfX, measurements.shoulderY, 0)
    }
    return { torso: torsoMat, hip: hipMat, armL: armLMat, armR: armRMat }
  }

  let lastT = 0
  const update = (t: number, mode: AnimationMode, speed: number): void => {
    const dt = Math.min(0.05, Math.max(0, t - lastT))
    lastT = t
    if (useGlb && glb) {
      // Play the rig's idle/walk clip (idle frozen when static) then snap the cloth
      // capsules onto its bones; garments follow via their body anchors (see anchors()).
      const animating = mode === 'idle' || mode === 'walk'
      // Ease the walk to half speed so the stride (and the cloth that hangs off it) reads
      // graceful rather than frantic, and the sim keeps up; idle plays at full rate.
      const rate = mode === 'walk' ? 0.5 : 1
      glb.update(animating ? dt * speed * rate : 0, mode === 'walk')
      fitCollidersToGlb()
      return
    }
    let legAmp = 0
    let armAmp = 0
    let freq = 0
    if (mode === 'walk') {
      legAmp = 0.5
      armAmp = 0.35
      freq = 3.0
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
    if (glb) glb.model.visible = useGlb
    bodyMesh.object.visible = !useGlb
    syncBodyBVH(false) // GLB → invalidate (no metaball surface); metaball → rebuild
  }
  /** Switch between the realistic GLB (static) and the animatable metaball body. */
  const setBodyMode = (realistic: boolean): void => {
    wantGlb = realistic
    applyBodyMode()
  }

  applyBody()
  applyPose(curAngle)
  bodyMesh.rebuild(buildAll())
  syncBodyBVH(false) // initial static body → build the collision surface
  lastKey = '0.0000,0.0000'

  return { group, colliders, measurements, bodyCollider, update, resize, setBodyMode, anchors }
}
