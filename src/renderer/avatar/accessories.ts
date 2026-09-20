import * as THREE from 'three'
import type { Capsule } from './colliders'
import { brimProfile, DEFAULT_BRIM, type BrimParams } from './brim'
import { crownDrop, DEFAULT_CROWN, type CrownStyle } from './crown'
import { bandProfile, braidY, trimAnchor, BAND_COLORS, DEFAULT_HAT_BAND, type HatBandParams } from './hatBand'
import { billCurl, DEFAULT_CAP_BILL, type CapBillParams } from './capBill'
import { panelSeamAzimuths, DEFAULT_CAP_PANELS, type CapPanelCount } from './capPanels'
import { puffHeight, DEFAULT_PUFF_LOGO, type PuffLogoParams } from './puffLogo'
import { COWBOY, cowboyBrimLift } from './cowboy'
import { FORMAL, formalBrimLift } from './formalHats'
import { BOONIE, boonieBrimLift, CHIN_CORD, type BoonieSnap } from './boonie'
import { BAKERBOY, goreLobe } from './bakerboy'
import { strawRecipe } from './straw'
import { makeDraftNormalMap, makeDraftRoughnessMap } from '../fabric/weaveDraft'
import type { ExtremityFrames } from './extremities'
import {
  TIE_BLADE_MM,
  TIE_KNOT_W_MM,
  TIE_KNOT_H_MM,
  TIE_TIP_OF_TORSO,
  BOW_WING_MM,
  BOW_HEIGHT_MM,
  BOW_KNOT_MM,
  BRACE_WIDTH_MM,
  BRACE_FRONT_SPREAD_MM,
  OVER_SHIRT_M,
  CHEST_FRONT_OF_R,
  WAIST_FRONT_OF_R,
  tieHalfWidth,
  splineThrough3
} from './neckwear'
import { FLAP_HATS, crownOf, flapAngle, flapHalfWidth, flapStandoff, FLAP_HINGE_FRAC, BILL_AZIMUTHS, type FlapStyle, type FlapWorn } from './earFlaps'
import { STRAW_HATS, brimProfileAt, centreDent, type StrawStyle } from './strawHats'
import { CROWNS, crownRadius, crownHeight, crownFit, crownRise, HAT_LINE_Y, HEAD_CROWN_Y, mmToUnits, TASSEL_LENGTH_MM, TASSEL_STRANDS, TASSEL_BUTTON_MM, tasselStrand, type BrimlessStyle } from './brimless'
import { FRAMES, lensOffset, lensOutline, unitsPerMm, type SunglassesStyle } from './shades'
import { headFrame, FACE_FRONT_R, EAR_CENTRE_FRAC, EARLOBE_FRAC, EAR_X, LOBE_X, EAR_Z } from './face'
import { circumferenceCm, watchCaseMm, watchLugWidthMm, WATCH_THICKNESS_RATIO, FOOT_LAST, SOCK_INSIDE_SHOE, sockRiseM, type SockHeight, HAND_REACH_R, HAND_HALF_THICKNESS_R, HAND_HALF_BREADTH_R, GLOVE_CLEARANCE_R, GLOVE_CUFF_M, WRIST_AT_T, ANKLE_AT_T, WRIST_TO_FOREARM, ANKLE_TO_CALF, STUD_BALL_MM, STUD_POST_MM, HOOP_OUTER_MM, HOOP_WIRE_MM } from './wornSizing'

/**
 * A small **accessories library** — footwear, a belt, a bag, plus **headwear &
 * neckwear** (hat · beanie · cap · bucket hat · ski-mask/balaclava · scarf · neck
 * gaiter) — that attach to the avatar's live body capsules and follow it (walk /
 * pose / resize / head-turn). They're rigid non-sim meshes layered over the garments.
 * Head/neck pieces are placed by the **head frame** (crown + orthonormal basis, so
 * they ride the animated head) and the neck capsule. Attach points come from the
 * colliders, so both the procedural and GLB avatars work. The anchor math is pure
 * (unit-tested); the geometry is built in the renderer.
 */
export type AccessoryKind = 'ushanka' | 'deerstalker' | 'boater' | 'panama' | 'fez' | 'kufi' | 'pillbox' | 'tie' | 'bowtie' | 'suspenders' | 'socks' | 'gloves' | 'studs' | 'watch' | 'anklet' | 'shoes' | 'belt' | 'hat' | 'bag' | 'beanie' | 'cap' | 'bucket' | 'balaclava' | 'scarf' | 'gaiter' | 'beret' | 'sunhat' | 'visor' | 'cowboy' | 'tophat' | 'bowler' | 'boonie' | 'bakerboy' | 'goggles' | 'sunglasses' | 'turban' | 'necklace' | 'hoops'
export const ACCESSORY_KINDS: AccessoryKind[] = ['ushanka', 'deerstalker', 'boater', 'panama', 'fez', 'kufi', 'pillbox', 'tie', 'bowtie', 'suspenders', 'socks', 'gloves', 'studs', 'watch', 'anklet', 'shoes', 'belt', 'hat', 'bag', 'beanie', 'cap', 'bucket', 'balaclava', 'scarf', 'gaiter', 'beret', 'sunhat', 'visor', 'cowboy', 'tophat', 'bowler', 'boonie', 'bakerboy', 'goggles', 'sunglasses', 'turban', 'necklace', 'hoops']

export interface AccessoryAnchors {
  headTop: THREE.Vector3
  headR: number
  /** Head-frame basis (world) — rides the animated head so a bill/face stays forward. */
  headFwd: THREE.Vector3
  headUp: THREE.Vector3
  headRight: THREE.Vector3
  /** Neck ring centre (world) + radius, for neckwear (scarf / gaiter). */
  neck: THREE.Vector3
  neckR: number
  waist: THREE.Vector3
  waistR: number
  footL: THREE.Vector3
  footR: THREE.Vector3
  handL: THREE.Vector3
  /**
   * Limb landmarks, at the fractions along each capsule where the rendered limb is
   * measured to narrow (`?probeTaper=1`) — the wrist at 0.95 of the forearm, the
   * ankle at 0.91 of the shank.
   */
  wristL: THREE.Vector3
  wristR: THREE.Vector3
  handR: THREE.Vector3
  ankleL: THREE.Vector3
  ankleR: THREE.Vector3
  /**
   * Radii **at those landmarks** — the joint's, not the capsule's. A capsule radius
   * has to enclose the whole limb, so it is the forearm's belly or the calf; sizing
   * a sock cuff from it produces a bucket.
   */
  wristR_: number
  ankleR_: number
  /**
   * Fingertips — the far end of the hand, which is **not** the capsule's end point.
   * The capsule stops at the palm and the hand mesh carries on `HAND_REACH_R` radii
   * past it (measured, `?probeLimb=1`), so a glove built to the capsule would leave
   * the fingers bare.
   */
  fingertipL: THREE.Vector3
  fingertipR: THREE.Vector3
  /** The enclosing capsule radii, for anything proportioned to the whole limb. */
  foreArmR: number
  calfR: number
  /** Knee-to-ankle length, so a sock can be told how far up the shank its cuff is. */
  shankLen: number
  /**
   * Hand and foot **pointing** directions (unit). These come from the rig's toe-base
   * and middle-finger bones when it has them, and fall back to the limb axis when it
   * does not — a hand bends at the wrist and a foot toes out, so the limb axis is
   * only ever an approximation of where an extremity is aimed.
   */
  handDirL: THREE.Vector3
  handDirR: THREE.Vector3
  footDirL: THREE.Vector3
  footDirR: THREE.Vector3
  /** Limb axis directions (unit, pointing distally) — a strap must sit square to these. */
  foreArmDirL: THREE.Vector3
  foreArmDirR: THREE.Vector3
  lowerLegDirL: THREE.Vector3
  lowerLegDirR: THREE.Vector3
  /**
   * Outer ear (auricle) centres, world. Placed at the height `face.ts` derives from
   * the brow and the nose base, so they line up with the rendered face rather than
   * with a guessed fraction of the skull.
   */
  earL: THREE.Vector3
  earR: THREE.Vector3
  /** Earlobe centres — where a stud or a hoop actually hangs. */
  lobeL: THREE.Vector3
  lobeR: THREE.Vector3
  /** Shoulder tips (world) + the span between them. */
  shoulderL: THREE.Vector3
  shoulderR: THREE.Vector3
  /** Upper-chest centre, where a tie or a bib sits. */
  chest: THREE.Vector3
  chestR: number
}

/**
 * A point a fraction `t` of the way along a limb capsule, `a` to `b`.
 *
 * Joints are placed with this and a **measured** fraction (`WRIST_AT_T`,
 * `ANKLE_AT_T`) rather than by stepping back from `b` by the capsule's radius, which
 * is what this used to do. The capsule's radius encloses the limb's widest part, so
 * stepping back by it overshoots: on this rig it lands mid-forearm, and it claims a
 * 12 cm-wide ankle. `?probeTaper=1` walks the limb and shows where it really narrows.
 */
export function limbJoint(cap: Capsule, t: number): THREE.Vector3 {
  return cap.a.clone().lerp(cap.b, t)
}

/** Unit direction along a capsule, pointing from `a` toward `b` (distally). */
export function limbDirection(cap: Capsule): THREE.Vector3 {
  const axis = cap.b.clone().sub(cap.a)
  const len = axis.length()
  return len < 1e-6 ? new THREE.Vector3(0, -1, 0) : axis.divideScalar(len)
}

/**
 * A point on the side of the head, `frac` of the head's height below its crown.
 *
 * The head's height is the collider capsule's swept extent, `|a − b| + 2r`, which
 * measurement shows is the rendered crown-to-chin to within a couple of millimetres
 * (see `face.ts`). `side` is −1 for the avatar's left, +1 for its right.
 */
function earPoint(head: Capsule, hf: { right: THREE.Vector3; up: THREE.Vector3; forward: THREE.Vector3 }, side: -1 | 1, frac: number, x: number): THREE.Vector3 {
  const r = head.radius
  const height = head.a.distanceTo(head.b) + 2 * r
  return head.b
    .clone()
    .addScaledVector(hf.up, r - height * frac) // down from the crown, which is b + r
    .addScaledVector(hf.right, side * r * x)
    .addScaledVector(hf.forward, r * EAR_Z)
}

/**
 * The direction to mount something on the surface of a limb: `away`, made
 * perpendicular to the limb `axis`.
 *
 * A watch case has to sit **flat** on the wrist, which means its mount direction must
 * lie in the limb's cross-section — the plane the strap loop occupies. Taking the
 * body-outward direction straight from the geometry would tilt the case whenever the
 * arm is not vertical, so the axial component is projected out (Gram–Schmidt) before
 * it is used. Falls back to a stable perpendicular when `away` is parallel to the axis.
 */
export function radialMount(axis: THREE.Vector3, away: THREE.Vector3): THREE.Vector3 {
  const a = axis.clone().normalize()
  const out = away.clone().addScaledVector(a, -away.dot(a))
  if (out.lengthSq() > 1e-12) return out.normalize()
  // degenerate: pick any axis-perpendicular direction, preferring world +z (front)
  const alt = Math.abs(a.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
  return alt.addScaledVector(a, -alt.dot(a)).normalize()
}

/**
 * An orthonormal frame on a limb, as a rotation: **+y runs distally along the limb**,
 * **+z out of its dorsal face**, +x across it.
 *
 * Everything worn on a limb wants this frame. A watch case is flat on +z, a glove is
 * an ellipsoid long in y / broad in x / thin in z, a sock's cuff is a ring in the x–z
 * plane. Building in it means the geometry reads as the anatomy it describes, and one
 * quaternion puts it on a limb in any pose.
 */
export function limbFrame(axis: THREE.Vector3, dorsal: THREE.Vector3): THREE.Quaternion {
  const y = axis.clone().normalize()
  const z = radialMount(y, dorsal)
  const x = new THREE.Vector3().crossVectors(y, z) // right-handed: x = y × z
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

/**
 * Place a foot piece at `at`, heading `dir`, with the last's +z aligned to it and no
 * roll: only the heading is taken, because a last is modelled flat on the ground.
 */
export function placeFoot(obj: THREE.Object3D, at: THREE.Vector3, dir: THREE.Vector3): void {
  obj.position.set(at.x, Math.max(0.03, at.y) - 0.02, at.z)
  const yaw = Math.atan2(dir.x, dir.z) // heading only — the last lies flat
  obj.rotation.set(0, Number.isFinite(yaw) ? yaw : 0, 0)
}

/**
 * Rewrite a ribbon strip's vertices in place: `rings + 1` cross-sections along a
 * centre-line, two vertices each, offset `halfWidth` either side.
 *
 * Every strap on a body is one of these — a tie down the chest, a brace over a
 * shoulder — and they all have to be rebuilt each frame as the body moves, so this
 * writes into the existing buffer rather than allocating a geometry per frame.
 */
export function writeRibbon(
  geo: THREE.BufferGeometry,
  rings: number,
  centre: (t: number, out: THREE.Vector3) => void,
  side: (t: number, out: THREE.Vector3) => void,
  halfWidth: (t: number) => number
): void {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const c = new THREE.Vector3()
  const s = new THREE.Vector3()
  for (let i = 0; i <= rings; i++) {
    const t = i / rings
    centre(t, c)
    side(t, s)
    const w = halfWidth(t)
    pos.setXYZ(i * 2, c.x - s.x * w, c.y - s.y * w, c.z - s.z * w)
    pos.setXYZ(i * 2 + 1, c.x + s.x * w, c.y + s.y * w, c.z + s.z * w)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  geo.computeBoundingSphere()
}

/** An empty ribbon of `rings` segments, ready for `writeRibbon`. */
export function makeRibbon(rings: number): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((rings + 1) * 2 * 3), 3))
  const idx: number[] = []
  for (let i = 0; i < rings; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  geo.setIndex(idx)
  return geo
}

/** Key attach points (world) derived from the live body capsules. Pure. */
export function accessoryAnchors(c: Capsule[], ext: ExtremityFrames = {}): AccessoryAnchors {
  const head = c[0] // head capsule (b = crown)
  const neckCap = c[1] // neck capsule (a…b along the neck)
  const torso = c[2] // torso (a = waist, b = upper chest)
  const hip = c[4] // hip line (a…b across the hips)
  const legL = c[8] // left lower leg (b = foot)
  const legR = c[12] // right lower leg (b = foot)
  const foreL = c[6] // left forearm (b = hand)
  const foreR = c[10] // right forearm (b = hand)
  const shoulder = c[3] // shoulder line (a = left tip, b = right tip)
  const hipCenter = hip.a.clone().add(hip.b).multiplyScalar(0.5)
  const hf = headFrame(c) // orthonormal head basis (turns with the body)
  return {
    headTop: head.b.clone(),
    headR: head.radius,
    headFwd: hf.forward.clone(),
    headUp: hf.up.clone(),
    headRight: hf.right.clone(),
    neck: neckCap.a.clone().add(neckCap.b).multiplyScalar(0.5),
    neckR: neckCap.radius,
    // waist = just above the hips, toward the chest
    waist: hipCenter.clone().lerp(torso.b, 0.16),
    waistR: torso.radius,
    footL: (ext.footL?.at ?? legL.b).clone(),
    footR: (ext.footR?.at ?? legR.b).clone(),
    handL: (ext.handL?.at ?? foreL.b).clone(),
    handR: (ext.handR?.at ?? foreR.b).clone(),
    wristL: limbJoint(foreL, WRIST_AT_T),
    wristR: limbJoint(foreR, WRIST_AT_T),
    ankleL: limbJoint(legL, ANKLE_AT_T),
    ankleR: limbJoint(legR, ANKLE_AT_T),
    wristR_: foreL.radius * WRIST_TO_FOREARM,
    ankleR_: legL.radius * ANKLE_TO_CALF,
    // the rig's own fingertip when it has one; otherwise the measured reach down
    // the knuckle direction, which is the best an unrigged body can offer
    fingertipL: ext.handL?.tip?.clone() ?? (ext.handL?.at ?? foreL.b).clone().addScaledVector(ext.handL?.dir ?? limbDirection(foreL), foreL.radius * HAND_REACH_R),
    fingertipR: ext.handR?.tip?.clone() ?? (ext.handR?.at ?? foreR.b).clone().addScaledVector(ext.handR?.dir ?? limbDirection(foreR), foreR.radius * HAND_REACH_R),
    handDirL: (ext.handL?.dir ?? limbDirection(foreL)).clone(),
    handDirR: (ext.handR?.dir ?? limbDirection(foreR)).clone(),
    footDirL: (ext.footL?.dir ?? limbDirection(legL)).clone(),
    footDirR: (ext.footR?.dir ?? limbDirection(legR)).clone(),
    foreArmR: foreL.radius,
    calfR: legL.radius,
    shankLen: legL.a.distanceTo(legL.b),
    foreArmDirL: limbDirection(foreL),
    foreArmDirR: limbDirection(foreR),
    lowerLegDirL: limbDirection(legL),
    lowerLegDirR: limbDirection(legR),
    // Ear + earlobe, at the fractions of the head's height `face.ts` derives from the
    // brow and the nose base, in the head frame so they turn with the head.
    earL: earPoint(head, hf, -1, EAR_CENTRE_FRAC, EAR_X),
    earR: earPoint(head, hf, 1, EAR_CENTRE_FRAC, EAR_X),
    lobeL: earPoint(head, hf, -1, EARLOBE_FRAC, LOBE_X),
    lobeR: earPoint(head, hf, 1, EARLOBE_FRAC, LOBE_X),
    shoulderL: shoulder.a.clone(),
    shoulderR: shoulder.b.clone(),
    chest: torso.b.clone(),
    chestR: torso.radius
  }
}

const LEATHER = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.55, metalness: 0.05 })
const METAL = new THREE.MeshStandardMaterial({ color: 0xc9b477, roughness: 0.3, metalness: 0.9 })
const FELT = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.85, metalness: 0 })
const knit = (color: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
const felt = (color: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, side: THREE.DoubleSide })

const TAU = Math.PI * 2
/** The +y axis a limb-worn ring is authored around before being turned onto the limb. */
const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)
/** Visual head-sphere centre in the unit head frame (origin = the head collider's `b`,
 *  +y up, 1 unit = head radius). The metaball cranium sits ~0.35 radii *above* the
 *  collider point, so headwear caps from here (not from the collider point itself). */
const HC = 0.35
const _basis = new THREE.Matrix4()
/** Orient + scale a group so its unit geometry rides the head/neck frame. */
function placeFrame(obj: THREE.Object3D, origin: THREE.Vector3, right: THREE.Vector3, up: THREE.Vector3, fwd: THREE.Vector3, scale: number): void {
  obj.position.copy(origin)
  obj.quaternion.setFromRotationMatrix(_basis.makeBasis(right, up, fwd))
  obj.scale.setScalar(scale)
}

interface Item {
  kind: AccessoryKind
  obj: THREE.Group
  place: (a: AccessoryAnchors) => void
}

/** The live accessories worn on the avatar — one group added to the scene. */
export class Accessories {
  readonly group = new THREE.Group()
  private readonly items: Item[] = []

  constructor() {
    this.group.name = 'accessories'
    this.items.push(
      this.buildFlapHat('ushanka'),
      this.buildFlapHat('deerstalker'),
      this.buildStraw('boater'),
      this.buildStraw('panama'),
      this.buildBrimless('fez'),
      this.buildBrimless('kufi'),
      this.buildBrimless('pillbox'),
      this.buildTie(),
      this.buildBowtie(),
      this.buildSuspenders(),
      this.buildSocks(),
      this.buildGloves(),
      this.buildStuds(),
      this.buildWatch(),
      this.buildAnklet(),
      this.buildShoes(),
      this.buildBelt(),
      this.buildHat(),
      this.buildBeret(),
      this.buildSunHat(),
      this.buildBag(),
      this.buildBeanie(),
      this.buildCap(),
      this.buildVisor(),
      this.buildCowboy(),
      this.buildTopHat(),
      this.buildBowler(),
      this.buildBoonie(),
      this.buildBakerBoy(),
      this.buildBucket(),
      this.buildBalaclava(),
      this.buildGoggles(),
      this.buildSunglasses(),
      this.buildTurban(),
      this.buildNecklace(),
      this.buildHoops(),
      this.buildScarf(),
      this.buildGaiter()
    )
    for (const it of this.items) {
      it.obj.name = it.kind
      it.obj.visible = false
      it.obj.traverse((o) => {
        o.castShadow = true
        o.frustumCulled = false
      })
      this.group.add(it.obj)
    }
  }

  private brim: BrimParams = { ...DEFAULT_BRIM }

  /** The parametric brim designer — re-shape every brimmed hat's brim in place. */
  setBrim(p: Partial<BrimParams>): void {
    this.brim = { ...this.brim, ...p }
    for (const kind of ['hat', 'bucket', 'sunhat'] as AccessoryKind[]) {
      const it = this.items.find((i) => i.kind === kind)
      const holder = it?.obj.getObjectByName('brim-holder') as THREE.Group | undefined
      if (!it || !holder) continue
      for (const child of [...holder.children]) {
        ;(child as THREE.Mesh).geometry?.dispose()
        holder.remove(child)
      }
      const mat = holder.userData.mat as THREE.Material
      this.addBrimMeshes(kind, holder, mat)
    }
  }
  getBrim(): BrimParams {
    return { ...this.brim }
  }

  private crown: CrownStyle = DEFAULT_CROWN

  /** The crown shape library — re-block the fedora's crown crease in place. */
  setCrown(style: CrownStyle): void {
    this.crown = style
    const it = this.items.find((i) => i.kind === 'hat')
    const holder = it?.obj.getObjectByName('crown-holder') as THREE.Group | undefined
    if (!it || !holder) return
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addCrownMesh(holder, holder.userData.mat as THREE.Material)
  }
  getCrown(): CrownStyle {
    return this.crown
  }

  private band: HatBandParams = { ...DEFAULT_HAT_BAND }

  /** The hat band designer — re-trim every banded hat's crown base in place. */
  setHatBand(p: Partial<HatBandParams>): void {
    this.band = { ...this.band, ...p }
    for (const kind of ['hat', 'sunhat'] as AccessoryKind[]) {
      const it = this.items.find((i) => i.kind === kind)
      const holder = it?.obj.getObjectByName('band-holder') as THREE.Group | undefined
      if (!it || !holder) continue
      for (const child of [...holder.children]) {
        ;(child as THREE.Mesh).geometry?.dispose()
        holder.remove(child)
      }
      this.addBandMeshes(holder)
    }
  }
  getHatBand(): HatBandParams {
    return { ...this.band }
  }

  /** Build the current band (+ side trim) around a crown-base holder group. */
  private addBandMeshes(holder: THREE.Group): void {
    const prof = bandProfile(this.band.style)
    if (!prof) return
    const bandR = (holder.userData.bandR as number) + prof.standoff
    const bandY = holder.userData.bandY as number
    const color = this.band.color ?? BAND_COLORS[this.band.style as keyof typeof BAND_COLORS]
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: this.band.style === 'leather' ? 0.5 : 0.88,
      metalness: 0,
      side: THREE.DoubleSide
    })
    if (this.band.style === 'cord') {
      // two phase-shifted strands crossing each other around the crown
      class BraidPath extends THREE.Curve<THREE.Vector3> {
        constructor(private readonly phase: number) {
          super()
        }
        getPoint(t: number): THREE.Vector3 {
          return new THREE.Vector3(Math.sin(t * TAU) * bandR, bandY + braidY(t, this.phase), Math.cos(t * TAU) * bandR)
        }
      }
      for (const phase of [0, Math.PI]) holder.add(new THREE.Mesh(new THREE.TubeGeometry(new BraidPath(phase), 220, prof.strandR, 6, true), mat))
    } else {
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(bandR, bandR, prof.height, 40, 1, true), mat)
      ribbon.position.y = bandY
      holder.add(ribbon)
    }
    const ta = trimAnchor(this.band.trim)
    if (!ta) return
    const trim = new THREE.Group()
    trim.position.set(Math.sin(ta.az) * bandR, bandY + ta.y, Math.cos(ta.az) * bandR)
    trim.rotation.y = ta.az // local +z points radially out of the band
    if (this.band.trim === 'bow') {
      // a self-fabric side bow: two loops + the knot
      for (const s of [-1, 1]) {
        const loop = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat)
        loop.scale.set(0.2, 0.09, 0.05)
        loop.position.x = s * 0.13
        loop.rotation.z = s * 0.25
        trim.add(loop)
      }
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.06), mat)
      trim.add(knot)
    } else if (this.band.trim === 'feather') {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0xc99a52, roughness: 0.9, side: THREE.DoubleSide }))
      plume.scale.set(1, 1, 0.3) // flattened vane
      plume.rotation.set(0.15, 0, 0.55) // leaning back around the crown
      plume.position.set(-0.1, 0.24, 0)
      const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xe8dcc4, roughness: 0.7 }))
      quill.rotation.z = 0.55
      quill.position.set(0.02, 0.04, 0.01)
      trim.add(plume, quill)
    } else if (this.band.trim === 'buckle') {
      // a metal frame lying flat on the band + the prong bar
      const frame = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 4), METAL)
      frame.rotation.z = Math.PI / 4 // square-on
      frame.scale.set(0.85, 1.25, 1)
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.17, 0.014), METAL)
      trim.add(frame, prong)
    }
    holder.add(trim)
  }

  /** Build the blocked fedora crown — a tall dome with the current crease
   *  pressed straight down into its top — into a holder group. */
  private addCrownMesh(holder: THREE.Group, mat: THREE.Material): void {
    const geo = new THREE.SphereGeometry(1, 48, 36, 0, TAU, 0, Math.PI * 0.53)
    geo.scale(1.05, 1.42, 1.05) // the tall blocked felt
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      // creases live on the crown top — fade the press out down the wall
      const blend = Math.max(0, Math.min(1, (y / 1.42 - 0.12) / 0.5))
      const drop = crownDrop(this.crown, x / 1.05, z / 1.05)
      pos.setY(i, y - drop * blend * blend * (3 - 2 * blend))
    }
    geo.computeVertexNormals()
    const dome = new THREE.Mesh(geo, mat)
    dome.position.y = HC
    holder.add(dome)
  }

  /** Build the parametric brim cone (+ optional edge wire) into a holder group. */
  private addBrimMeshes(kind: AccessoryKind, holder: THREE.Group, mat: THREE.Material): void {
    const prof = brimProfile(kind, this.brim)
    if (!prof) return
    const y0 = holder.userData.brimY as number
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(prof.topR, prof.botR, prof.h, 40, 1, true), mat)
    cone.rotation.x = prof.up ? Math.PI : 0 // flipped: the cone runs upward
    cone.position.y = y0 + (prof.up ? prof.h / 2 : -prof.h / 2)
    holder.add(cone)
    if (this.brim.wire) {
      const wire = new THREE.Mesh(new THREE.TorusGeometry(prof.wireR, 0.035, 8, 40), mat)
      wire.rotation.x = Math.PI / 2
      wire.position.y = y0 + (prof.up ? prof.h : -prof.h)
      holder.add(wire)
    }
  }

  setEnabled(kind: AccessoryKind, on: boolean): void {
    const it = this.items.find((i) => i.kind === kind)
    if (it) it.obj.visible = on
  }
  isEnabled(kind: AccessoryKind): boolean {
    return this.items.find((i) => i.kind === kind)?.obj.visible ?? false
  }

  /** Re-attach every visible accessory to the live body (call each frame). */
  update(colliders: Capsule[], ext: ExtremityFrames = {}): void {
    if (!this.items.some((i) => i.obj.visible) || colliders.length < 13) return
    const a = accessoryAnchors(colliders, ext)
    for (const it of this.items) if (it.obj.visible) it.place(a)
  }

  /** A real shoe: a flat sole + a rounded instep/heel + a toe cap, on the shared last. */
  private buildShoes(): Item {
    const shoe = (): THREE.Group => {
      const g = new THREE.Group()
      const L = FOOT_LAST
      const sole = new THREE.Mesh(new THREE.BoxGeometry(L.width, 0.028, L.length), LEATHER)
      sole.position.set(0, -0.012, 0.05)
      const instep = new THREE.Mesh(new THREE.SphereGeometry(L.instep, 16, 12), LEATHER)
      instep.scale.set(0.82, 1.05, 1.7) // domed over the heel + instep
      instep.position.set(0, 0.012, -0.005)
      const toe = new THREE.Mesh(new THREE.SphereGeometry(L.toe, 14, 10), LEATHER)
      toe.scale.set(0.92, 0.62, 1.15) // low rounded toe box
      toe.position.set(0, -0.006, 0.15)
      g.add(sole, instep, toe)
      return g
    }
    const l = shoe()
    const r = shoe()
    const obj = new THREE.Group()
    obj.add(l, r)
    return {
      kind: 'shoes',
      obj,
      place: (a) => {
        // the last is built pointing +z, so turn it to the foot's own heading —
        // feet toe out, and a shoe squared to the world sits ACROSS the foot
        placeFoot(l, a.footL, a.footDirL)
        placeFoot(r, a.footR, a.footDirR)
      }
    }
  }

  private buildBelt(): Item {
    const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.022, 10, 40), LEATHER)
    band.rotation.x = Math.PI / 2 // lie flat around the body
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.02), METAL)
    const obj = new THREE.Group()
    obj.add(band, buckle)
    return {
      kind: 'belt',
      obj,
      place: (a) => {
        obj.position.copy(a.waist)
        const rad = a.waistR * 1.06
        band.scale.set(rad, rad, 1)
        buckle.position.set(0, 0, rad + 0.01) // front-centre
      }
    }
  }

  private buildHat(): Item {
    // the fedora — a blocked-felt crown (creased by the crown shape library)
    // over the parametric brim (a snap-brim by default)
    const crown = new THREE.Group()
    crown.name = 'crown-holder'
    crown.userData.mat = FELT
    this.addCrownMesh(crown, FELT)
    const holder = new THREE.Group()
    holder.name = 'brim-holder'
    holder.userData.mat = FELT
    holder.userData.brimY = HC - 0.06 // the brim leaves the crown wall at the brow
    this.addBrimMeshes('hat', holder, FELT)
    const band = new THREE.Group()
    band.name = 'band-holder'
    band.userData.bandR = 1.05
    band.userData.bandY = HC + 0.07 // the ribbon hugs the crown base above the brim
    this.addBandMeshes(band)
    const obj = new THREE.Group()
    obj.add(crown, holder, band)
    return this.headItem('hat', obj)
  }

  private buildBag(): Item {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.05), LEATHER)
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.06, 0.055), LEATHER)
    flap.position.y = 0.05
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.06), METAL)
    clasp.position.y = 0.02
    const obj = new THREE.Group()
    obj.add(body, flap, clasp)
    return {
      kind: 'bag',
      obj,
      place: (a) => {
        // a clutch held just below the left hand
        obj.position.set(a.handL.x - 0.02, a.handL.y - 0.09, a.handL.z + 0.05)
      }
    }
  }

  // ---- headwear (unit head frame: origin at crown, +y up, +z fwd, 1 unit = head radius) ----
  private headItem(kind: AccessoryKind, obj: THREE.Group): Item {
    return { kind, obj, place: (a) => placeFrame(obj, a.headTop, a.headRight, a.headUp, a.headFwd, a.headR) }
  }
  private neckItem(kind: AccessoryKind, obj: THREE.Group): Item {
    return { kind, obj, place: (a) => placeFrame(obj, a.neck, a.headRight, a.headUp, a.headFwd, a.neckR) }
  }

  private buildBeanie(): Item {
    const mat = knit(0x39414f)
    // crown dome over the head, capping from the cranium down to ~ear level
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 22, 0, TAU, 0, Math.PI * 0.66), mat)
    dome.position.y = HC
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.14, 12, 32), mat)
    cuff.rotation.x = Math.PI / 2
    cuff.position.y = HC - 0.5 // folded brim at the beanie's lower edge
    const obj = new THREE.Group()
    obj.add(dome, cuff)
    return this.headItem('beanie', obj)
  }

  private bill: CapBillParams = { ...DEFAULT_CAP_BILL }

  /** The cap bill designer — re-shape every billed block (cap · visor · baker boy) in place. */
  setCapBill(p: Partial<CapBillParams>): void {
    this.bill = { ...this.bill, ...p }
    for (const kind of ['cap', 'visor', 'bakerboy'] as AccessoryKind[]) {
      const it = this.items.find((i) => i.kind === kind)
      const holder = it?.obj.getObjectByName('bill-holder') as THREE.Group | undefined
      if (!it || !holder) continue
      for (const child of [...holder.children]) {
        ;(child as THREE.Mesh).geometry?.dispose()
        holder.remove(child)
      }
      this.addBillMeshes(holder, holder.userData.mat as THREE.Material)
      const sq = it.obj.getObjectByName('squatchee')
      if (sq) sq.visible = this.bill.squatchee
    }
  }
  getCapBill(): CapBillParams {
    return { ...this.bill }
  }

  /** The bill's forward fan grid (~120° — a real bill doesn't wrap the ears),
   *  curled by the current pre-curve. Local frame: x lateral, y forward,
   *  +z = downward once the mesh is pitched onto the cap. */
  private billGeometry(): THREE.BufferGeometry {
    const R = 1.15 // bill radius (unit head frame)
    const F = 0.9 // fore-shortening
    const rings = 12
    const segs = 24
    const pos: number[] = []
    for (let i = 0; i <= rings; i++) {
      for (let j = 0; j <= segs; j++) {
        const a = Math.PI / 2 + (j / segs - 0.5) * 2.1 // the forward wedge
        const u = i / rings
        const x = Math.cos(a) * R * u
        const y = Math.sin(a) * R * u * F
        pos.push(x, y, billCurl(x / R, y / (R * F), this.bill.curve) * R)
      }
    }
    const idx: number[] = []
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * (segs + 1) + j
        const b = a + segs + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }

  /** Build the visor (+ a contrast underbill when set) into a holder group. */
  private addBillMeshes(holder: THREE.Group, mat: THREE.Material): void {
    const place = (m: THREE.Mesh): THREE.Mesh => {
      m.rotation.set(Math.PI / 2 + 0.32, 0, 0) // pitched down past the face
      m.position.set(0, HC - 0.1, 0.98)
      return m
    }
    holder.add(place(new THREE.Mesh(this.billGeometry(), mat)))
    if (this.bill.underbill !== undefined) {
      const under = place(new THREE.Mesh(this.billGeometry(), felt(this.bill.underbill)))
      under.translateZ(0.025) // local +z = world down — the underbill hangs beneath
      holder.add(under)
    }
  }

  private panels: CapPanelCount = DEFAULT_CAP_PANELS

  /** The 5-panel vs 6-panel construction — re-seam the cap crown in place. */
  setCapPanels(n: CapPanelCount): void {
    this.panels = n
    const it = this.items.find((i) => i.kind === 'cap')
    const holder = it?.obj.getObjectByName('seam-holder') as THREE.Group | undefined
    if (!it || !holder) return
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addSeamMeshes(holder, holder.userData.mat as THREE.Material)
  }
  getCapPanels(): CapPanelCount {
    return this.panels
  }

  /** Lay a ridge + twin topstitch rows along each panel-seam meridian of the
   *  cap dome (radius 1.04, cap θ ∈ [0, 0.56π], centred at HC). */
  private addSeamMeshes(holder: THREE.Group, mat: THREE.Material): void {
    const stitch = felt(0x161f33) // a shade darker — reads as thread
    class SeamPath extends THREE.Curve<THREE.Vector3> {
      constructor(
        private readonly az: number,
        private readonly r: number
      ) {
        super()
      }
      getPoint(t: number): THREE.Vector3 {
        const th = 0.09 + t * (Math.PI * 0.56 - 0.13) // below the button → the dome base
        return new THREE.Vector3(Math.sin(th) * Math.sin(this.az) * this.r, HC + Math.cos(th) * this.r, Math.sin(th) * Math.cos(this.az) * this.r)
      }
    }
    for (const az of panelSeamAzimuths(this.panels)) {
      holder.add(new THREE.Mesh(new THREE.TubeGeometry(new SeamPath(az, 1.045), 20, 0.014, 6, false), mat))
      for (const side of [-0.035, 0.035]) holder.add(new THREE.Mesh(new THREE.TubeGeometry(new SeamPath(az + side, 1.042), 20, 0.006, 5, false), stitch))
    }
  }

  private puff: PuffLogoParams = { ...DEFAULT_PUFF_LOGO }

  /** 3D puff cap embroidery — re-stitch the front-panel mark in place. */
  setPuffLogo(p: Partial<PuffLogoParams>): void {
    this.puff = { ...this.puff, ...p }
    const it = this.items.find((i) => i.kind === 'cap')
    const holder = it?.obj.getObjectByName('puff-holder') as THREE.Group | undefined
    if (!it || !holder) return
    for (const child of [...holder.children]) {
      const m = child as THREE.Mesh
      m.geometry?.dispose()
      ;(m.material as THREE.Material)?.dispose()
      holder.remove(child)
    }
    this.addPuffMeshes(holder)
  }
  getPuffLogo(): PuffLogoParams {
    return { ...this.puff }
  }

  /** Drape the puff mark's patch grid over the dome front and loft it along
   *  the sphere normal by the pure height field. */
  private addPuffMeshes(holder: THREE.Group): void {
    if (this.puff.shape === 'none') return
    const AZ = 0.42 // half-width of the front window (radians)
    // the window sits on the UPPER front panel — the GLB forehead bulges past
    // the dome radius at the brow (the ≥1.2×headR lesson) and pokes through a
    // low patch base, so the mark stays above it
    const TH0 = Math.PI * 0.32 // window top (polar angle from the crown)
    const TH1 = Math.PI * 0.48 // window bottom, above the brow bulge
    const NU = 28
    const NV = 22
    const pos: number[] = []
    const col: number[] = []
    // the flat window blends into the cap felt — only the lofted mark reads
    // as thread (a solid bright window bloomed like the visor lesson)
    const capCol = new THREE.Color(0x24304a)
    const thread = new THREE.Color(this.puff.color)
    const c = new THREE.Color()
    for (let i = 0; i <= NV; i++) {
      for (let j = 0; j <= NU; j++) {
        const u = (j / NU) * 2 - 1
        const v = 1 - (i / NV) * 2
        const az = u * AZ
        const th = TH0 + ((1 - v) / 2) * (TH1 - TH0)
        const h = puffHeight(this.puff.shape, u, v)
        const r = 1.046 + h * 0.11
        pos.push(Math.sin(th) * Math.sin(az) * r, HC + Math.cos(th) * r, Math.sin(th) * Math.cos(az) * r)
        c.copy(capCol).lerp(thread, Math.min(1, h * 2.2))
        col.push(c.r, c.g, c.b)
      }
    }
    const idx: number[] = []
    for (let i = 0; i < NV; i++) {
      for (let j = 0; j < NU; j++) {
        const a = i * (NU + 1) + j
        const b = a + NU + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    // embroidery thread reads soft next to the felt; the env response is damped —
    // the concave dips otherwise catch the studio IBL as a bright pool
    holder.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, envMapIntensity: 0.35, side: THREE.DoubleSide })))
  }

  private buildCap(): Item {
    const mat = felt(0x24304a)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.04, 24, 18, 0, TAU, 0, Math.PI * 0.56), mat)
    dome.position.y = HC
    const holder = new THREE.Group()
    holder.name = 'bill-holder'
    holder.userData.mat = mat
    this.addBillMeshes(holder, mat)
    const seams = new THREE.Group()
    seams.name = 'seam-holder'
    seams.userData.mat = mat
    this.addSeamMeshes(seams, mat)
    const puff = new THREE.Group()
    puff.name = 'puff-holder'
    this.addPuffMeshes(puff)
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat)
    btn.name = 'squatchee'
    btn.position.y = HC + 1.04
    btn.visible = this.bill.squatchee
    const obj = new THREE.Group()
    obj.add(dome, holder, seams, puff, btn)
    return this.headItem('cap', obj)
  }

  private buildVisor(): Item {
    // the sport visor — the cap's parametric bill on an open-crown band
    // (ponytail-friendly: no dome, just the sweatband wrapping the brow).
    // Kept off pure white — a big flat bright plane blooms under the key light.
    const mat = felt(0xb9bdc4)
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.08, 0.3, 32, 1, true), mat)
    band.position.y = HC + 0.02
    const holder = new THREE.Group()
    holder.name = 'bill-holder'
    holder.userData.mat = mat
    this.addBillMeshes(holder, mat)
    const obj = new THREE.Group()
    obj.add(band, holder)
    return this.headItem('visor', obj)
  }

  /** An annulus brim whose rim lifts per-azimuth (lift grows t² toward the edge). */
  private rolledBrimGeometry(innerR: number, outerR: number, lift: (az: number) => number): THREE.BufferGeometry {
    const NR = 10
    const NA = 48
    const pos: number[] = []
    for (let i = 0; i <= NR; i++) {
      for (let j = 0; j <= NA; j++) {
        const t = i / NR
        const az = (j / NA) * TAU
        const r = innerR + t * (outerR - innerR)
        pos.push(Math.sin(az) * r, lift(az) * t * t, Math.cos(az) * r)
      }
    }
    const idx: number[] = []
    for (let i = 0; i < NR; i++) {
      for (let j = 0; j < NA; j++) {
        const a = i * (NA + 1) + j
        const b = a + NA + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }

  private boonieSnap: BoonieSnap = 'none'

  /** Snap the boonie's brim sides up (or let them back down) in place. */
  setBoonieSnap(s: BoonieSnap): void {
    this.boonieSnap = s
    const it = this.items.find((i) => i.kind === 'boonie')
    const holder = it?.obj.getObjectByName('snap-holder') as THREE.Group | undefined
    if (!it || !holder) return
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addBoonieBrim(holder, holder.userData.mat as THREE.Material)
  }
  getBoonieSnap(): BoonieSnap {
    return this.boonieSnap
  }

  private addBoonieBrim(holder: THREE.Group, mat: THREE.Material): void {
    const brim = new THREE.Mesh(this.rolledBrimGeometry(BOONIE.brimInnerR, BOONIE.brimOuterR, (az) => boonieBrimLift(az, this.boonieSnap)), mat)
    brim.position.y = HC - 0.02
    holder.add(brim)
  }

  private buildBakerBoy(): Item {
    const mat = felt(0x4a3f33) // brown tweed
    // the puffed 8-gore crown: a wide low dome whose rim scallops per panel
    const geo = new THREE.SphereGeometry(1, 64, 24, 0, TAU, 0, Math.PI * 0.58)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      // lobes are strongest at the equator (ring = sinθ) and vanish at the button
      const s = 1 + BAKERBOY.puff * goreLobe(Math.atan2(x, z)) * Math.hypot(x, z)
      pos.setX(i, x * s)
      pos.setZ(i, z * s)
    }
    geo.scale(BAKERBOY.crownR, BAKERBOY.crownR * BAKERBOY.crownYScale, BAKERBOY.crownR)
    geo.computeVertexNormals()
    const crown = new THREE.Mesh(geo, mat)
    crown.position.y = HC + 0.28 // the puff overhangs the fitted band below
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.07, 0.28, 32, 1, true), mat)
    band.position.y = HC + 0.02
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat)
    btn.position.y = HC + 0.28 + BAKERBOY.crownR * BAKERBOY.crownYScale
    const holder = new THREE.Group()
    holder.name = 'bill-holder'
    holder.userData.mat = mat
    this.addBillMeshes(holder, mat)
    const obj = new THREE.Group()
    obj.add(crown, band, btn, holder)
    return this.headItem('bakerboy', obj)
  }

  private buildBoonie(): Item {
    const mat = felt(0x6b6a4d) // faded olive field cloth
    // a low soft crown: a short wall + a squashed dome top clearing the skull
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(BOONIE.crownR + 0.04, BOONIE.crownR + 0.04, BOONIE.crownH, 32, 1, true), mat)
    wall.position.y = HC - 0.02 + BOONIE.crownH / 2
    const topGeo = new THREE.SphereGeometry(BOONIE.crownR + 0.04, 32, 16, 0, TAU, 0, Math.PI / 2)
    topGeo.scale(1, 0.52, 1)
    const top = new THREE.Mesh(topGeo, mat)
    top.position.y = HC - 0.02 + BOONIE.crownH
    // the snap-up brim (rebuilt by setBoonieSnap)
    const holder = new THREE.Group()
    holder.name = 'snap-holder'
    holder.userData.mat = mat
    this.addBoonieBrim(holder, mat)
    // the chin cord: brim anchors → the slider bead → a short tail
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x3c3a2e, roughness: 0.9 })
    const seg = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): THREE.Mesh => {
      const va = new THREE.Vector3(a.x, a.y, a.z)
      const vb = new THREE.Vector3(b.x, b.y, b.z)
      const dir = vb.clone().sub(va)
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, dir.length(), 6), cordMat)
      m.position.copy(va).add(vb).multiplyScalar(0.5)
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
      return m
    }
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), cordMat)
    bead.position.set(CHIN_CORD.bead.x, CHIN_CORD.bead.y, CHIN_CORD.bead.z)
    const obj = new THREE.Group()
    obj.add(wall, top, holder, seg(CHIN_CORD.anchorL, CHIN_CORD.bead), seg(CHIN_CORD.anchorR, CHIN_CORD.bead), seg(CHIN_CORD.bead, CHIN_CORD.tailEnd), bead)
    return this.headItem('boonie', obj)
  }

  private buildTopHat(): Item {
    const mat = felt(0x1d1d22) // near-black silk felt
    const p = FORMAL.tophat
    // the stovepipe: subtly flared, capped flat on top
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(p.crownR * p.flare, p.crownR, p.crownH, 36), mat)
    crown.position.y = HC - 0.05 + p.crownH / 2
    const brim = new THREE.Mesh(this.rolledBrimGeometry(p.brimInnerR, p.brimOuterR, (az) => formalBrimLift('tophat', az)), mat)
    brim.position.y = HC - 0.05
    const band = new THREE.Mesh(new THREE.CylinderGeometry(p.crownR + 0.03, p.crownR + 0.03, 0.24, 36, 1, true), felt(0x35353d))
    band.position.y = HC + 0.1
    const obj = new THREE.Group()
    obj.add(crown, brim, band)
    return this.headItem('tophat', obj)
  }

  private buildBowler(): Item {
    const mat = felt(0x26221f) // hard dark-brown felt
    const p = FORMAL.bowler
    const geo = new THREE.SphereGeometry(1, 36, 24, 0, TAU, 0, Math.PI * 0.52)
    geo.scale(p.domeR, p.domeR * p.domeYScale, p.domeR)
    const dome = new THREE.Mesh(geo, mat)
    dome.position.y = HC + 0.02
    const brim = new THREE.Mesh(this.rolledBrimGeometry(p.brimInnerR, p.brimOuterR, (az) => formalBrimLift('bowler', az)), mat)
    brim.position.y = HC - 0.04
    const band = new THREE.Mesh(new THREE.TorusGeometry(p.domeR + 0.02, 0.045, 8, 36), felt(0x141210))
    band.rotation.x = Math.PI / 2
    band.position.y = HC + 0.02
    const obj = new THREE.Group()
    obj.add(dome, brim, band)
    return this.headItem('bowler', obj)
  }

  private buildCowboy(): Item {
    const mat = felt(0x8a6a4a) // tan western felt
    // the cattleman crease: the centre-dent gutter pressed DEEP into a taller block
    const geo = new THREE.SphereGeometry(1, 48, 36, 0, TAU, 0, Math.PI * 0.53)
    geo.scale(COWBOY.crownR, COWBOY.crownYScale, COWBOY.crownR)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const blend = Math.max(0, Math.min(1, (y / COWBOY.crownYScale - 0.12) / 0.5))
      const drop = crownDrop('centre-dent', x / COWBOY.crownR, z / COWBOY.crownR) * 1.6
      pos.setY(i, y - drop * blend * blend * (3 - 2 * blend))
    }
    geo.computeVertexNormals()
    const crown = new THREE.Mesh(geo, mat)
    crown.position.y = HC
    // the side-rolled brim — an annulus whose rim lifts by cowboyBrimLift(az)
    const brim = new THREE.Mesh(this.rolledBrimGeometry(COWBOY.brimInnerR, COWBOY.brimOuterR, cowboyBrimLift), mat)
    brim.position.y = HC - 0.06
    // the leather band + buckle at the crown base
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.07, 0.05, 8, 40), LEATHER)
    band.rotation.x = Math.PI / 2
    band.position.y = HC + 0.04
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.09, 0.03), METAL)
    buckle.position.set(0, HC + 0.04, 1.11)
    const obj = new THREE.Group()
    obj.add(crown, brim, band, buckle)
    return this.headItem('cowboy', obj)
  }

  private buildBucket(): Item {
    const mat = felt(0x5c5f38)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 16, 0, TAU, 0, Math.PI * 0.5), mat)
    dome.position.y = HC
    const holder = new THREE.Group()
    holder.name = 'brim-holder'
    holder.userData.mat = mat
    holder.userData.brimY = HC - 0.03 // the brim leaves the dome base
    this.addBrimMeshes('bucket', holder, mat)
    const obj = new THREE.Group()
    obj.add(dome, holder)
    return this.headItem('bucket', obj)
  }

  private buildBeret(): Item {
    const mat = felt(0x7a2734) // classic wine felt
    // a soft flat disc, squashed and pulled to one side, with the little stalk on top
    const disc = new THREE.Mesh(new THREE.SphereGeometry(1.3, 28, 18), mat)
    disc.scale.set(1, 0.3, 1)
    disc.position.set(0.28, HC + 0.42, -0.08)
    disc.rotation.z = -0.24 // tipped toward the wearer's right
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), mat)
    stalk.position.set(0.36, HC + 0.78, -0.08)
    stalk.rotation.z = -0.24
    const obj = new THREE.Group()
    obj.add(disc, stalk)
    return this.headItem('beret', obj)
  }

  /** The dry plaited-straw material — the basket draft baked to weave maps. */
  private strawMaterial(): THREE.MeshPhysicalMaterial {
    const r = strawRecipe()
    const mat = new THREE.MeshPhysicalMaterial({
      color: r.color,
      roughness: r.roughness,
      metalness: 0,
      sheen: r.sheen,
      sheenColor: r.sheenColor,
      sheenRoughness: r.sheenRoughness,
      side: THREE.DoubleSide
    })
    // the weave bake needs a canvas — headless vitest (node env) has none,
    // so tests get the plain dry-sheen material and the app gets the plait
    if (typeof document !== 'undefined') {
      const tile = (t: THREE.Texture): THREE.Texture => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(r.repeats, r.repeats)
        return t
      }
      mat.normalMap = tile(makeDraftNormalMap(r.draft, r.normalStrength))
      mat.roughnessMap = tile(makeDraftRoughnessMap(r.draft))
      mat.normalScale.set(r.normalStrength, r.normalStrength) // the stack's idiom — relief lives here
    }
    return mat
  }

  private buildSunHat(): Item {
    const mat = this.strawMaterial() // plaited straw, not felt
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 16, 0, TAU, 0, Math.PI * 0.5), mat)
    dome.position.y = HC
    // the statement piece: the parametric brim (a wide gentle droop by default)
    const holder = new THREE.Group()
    holder.name = 'brim-holder'
    holder.userData.mat = mat
    holder.userData.brimY = HC - 0.03
    this.addBrimMeshes('sunhat', holder, mat)
    const band = new THREE.Group()
    band.name = 'band-holder'
    band.userData.bandR = 1.02
    band.userData.bandY = HC + 0.1
    this.addBandMeshes(band)
    const obj = new THREE.Group()
    obj.add(dome, holder, band)
    return this.headItem('sunhat', obj)
  }

  /**
   * A **necktie**, lying on the chest rather than hanging in front of it.
   *
   * The blade runs a Catmull–Rom curve through three body landmarks — the neck, the
   * chest and the waist, each pushed out to that girth — so it bows over the chest
   * the way a tie does. A straight drop from the collar to the waist cuts straight
   * through the ribcage on any figure with a chest.
   *
   * Its length is the tailor's rule: the point reaches the **middle of the belt
   * buckle**, so the blade runs a little past the anatomical waist. Its width is the
   * real 8 cm, in world units, with `tieHalfWidth` opening the blade out of the
   * neck band over the first third and closing it to a point over the last eighth —
   * a constant-width strip reads as a ribbon, not a tie.
   */
  private buildTie(): Item {
    const silk = new THREE.MeshPhysicalMaterial({ color: 0x7a1f33, roughness: 0.34, metalness: 0, sheen: 0.7, sheenColor: new THREE.Color(0xc08090), sheenRoughness: 0.4, side: THREE.DoubleSide })
    const RINGS = 40
    const blade = new THREE.Mesh(makeRibbon(RINGS), silk)
    // the four-in-hand knot: a small rounded wedge, wider than it is deep
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), silk)
    const obj = new THREE.Group()
    obj.add(blade, knot)
    const p0: number[] = [0, 0, 0]
    const p1: number[] = [0, 0, 0]
    const p2: number[] = [0, 0, 0]
    const c = new THREE.Vector3()
    const nextC = new THREE.Vector3()
    const tangent = new THREE.Vector3()
    return {
      kind: 'tie',
      obj,
      place: (a) => {
        // the three landmarks, each on the body's FRONT surface
        const front = a.headFwd
        // The knot sits at the THROAT, not at the neck anchor. That anchor is the
        // neck capsule's midpoint, which on this rig is level with the shoulders —
        // where the body is 9.5 cm deep, so a knot placed on the neck's own radius
        // there is buried inside the chest. Raising it by most of a neck radius puts
        // it above the shoulder mass, where the neck really is that narrow.
        // (Over the shirt, not on the skin — see OVER_SHIRT_M.)
        const neckFront = a.neck
          .clone()
          .addScaledVector(a.headUp, a.neckR * 0.8)
          .addScaledVector(front, a.neckR + OVER_SHIRT_M)
        const chestFront = a.chest.clone().addScaledVector(front, a.chestR * CHEST_FRONT_OF_R + OVER_SHIRT_M)
        const waistFront = a.waist.clone().addScaledVector(front, a.waistR * WAIST_FRONT_OF_R + OVER_SHIRT_M)
        // the tip goes a little past the waist — the belt buckle, not the waistline
        const tip = neckFront.clone().lerp(waistFront, TIE_TIP_OF_TORSO)
        p0[0] = neckFront.x; p0[1] = neckFront.y; p0[2] = neckFront.z
        p1[0] = chestFront.x; p1[1] = chestFront.y; p1[2] = chestFront.z
        p2[0] = tip.x; p2[1] = tip.y; p2[2] = tip.z
        const at = (t: number, out: THREE.Vector3): void => {
          const v = splineThrough3(p0, p1, p2, t)
          out.set(v[0], v[1], v[2])
        }
        const half = (t: number): number => tieHalfWidth(t) * (TIE_BLADE_MM / 1000)
        writeRibbon(
          blade.geometry,
          RINGS,
          at,
          (t, out) => {
            // across the strip: square to both the run of the blade and the body's front
            at(t, c)
            at(Math.min(1, t + 0.02), nextC)
            tangent.copy(nextC).sub(c)
            if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0)
            out.crossVectors(front, tangent.normalize())
            if (out.lengthSq() < 1e-12) out.copy(a.headRight)
            out.normalize()
          },
          half
        )
        knot.position.copy(neckFront).addScaledVector(a.headUp, TIE_KNOT_H_MM / 3000)
        knot.scale.set(TIE_KNOT_W_MM / 1000, TIE_KNOT_H_MM / 1000, TIE_KNOT_W_MM / 1400)
        knot.quaternion.setFromUnitVectors(FORWARD, front)
      }
    }
  }

  /**
   * A **bow tie** — the butterfly shape, 6.5 cm a wing.
   *
   * Two wings that narrow to the knot rather than two rectangles: a bow tie is cut
   * as an hourglass and pinched in the middle, so its silhouette is the pinch. Built
   * as a ribbon running left to right through the knot, with the half-width profile
   * doing the pinching, and placed on the neck's front in the head frame so it turns
   * with the head instead of staying square to the world.
   */
  private buildBowtie(): Item {
    const silk = new THREE.MeshPhysicalMaterial({ color: 0x15161c, roughness: 0.3, metalness: 0, sheen: 0.6, sheenColor: new THREE.Color(0x6a6a7a), sheenRoughness: 0.35, side: THREE.DoubleSide })
    const RINGS = 24
    const bow = new THREE.Mesh(makeRibbon(RINGS), silk)
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), silk)
    const obj = new THREE.Group()
    obj.add(bow, knot)
    return {
      kind: 'bowtie',
      obj,
      place: (a) => {
        const front = a.headFwd
        // the same throat placement the tie's knot uses — the neck anchor is at
        // shoulder level, where a bow tie would sit inside the chest
        const centre = a.neck
          .clone()
          .addScaledVector(a.headUp, a.neckR * 0.8)
          .addScaledVector(front, a.neckR + OVER_SHIRT_M)
        const span = (BOW_WING_MM * 2) / 1000
        writeRibbon(
          bow.geometry,
          RINGS,
          (t, out) => {
            // left wing tip → knot → right wing tip, bowing forward at the tips so
            // the wings stand off the neck rather than wrapping into it
            const x = (t - 0.5) * span
            const bulge = Math.abs(t - 0.5) * 2 // 0 at the knot, 1 at the tips
            out.copy(centre).addScaledVector(a.headRight, x).addScaledVector(front, bulge * a.neckR * 0.25)
          },
          (_t, out) => out.copy(a.headUp),
          (t) => {
            // the hourglass: pinched to the knot, full at the wing tips
            const k = Math.abs(t - 0.5) * 2
            return ((BOW_KNOT_MM + (BOW_HEIGHT_MM - BOW_KNOT_MM) * Math.pow(k, 0.7)) / 2000)
          }
        )
        knot.position.copy(centre).addScaledVector(front, a.neckR * 0.05)
        knot.scale.set(BOW_KNOT_MM / 1000, (BOW_KNOT_MM * 1.6) / 1000, BOW_KNOT_MM / 1200)
        knot.quaternion.setFromUnitVectors(FORWARD, front)
      }
    }
  }

  /**
   * **Suspenders** — two 35 mm braces, over the shoulders and down the back.
   *
   * Each side is one continuous strip clipped at the waistband in front, run up the
   * chest, **over the shoulder tip**, and down the back to the waistband behind.
   * The shoulder tip is the anchor that matters: braces bear their load there, and
   * a strap routed straight from the front waistband to the back one passes through
   * the shoulder instead of over it.
   *
   * The back ends converge toward centre-back, which is the Y a real pair makes.
   */
  private buildSuspenders(): Item {
    const web = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide })
    const clip = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.9 })
    const RINGS = 32
    const straps = [0, 1].map(() => new THREE.Mesh(makeRibbon(RINGS), web))
    const clips = [0, 1, 2, 3].map(() => new THREE.Mesh(new THREE.BoxGeometry(BRACE_WIDTH_MM / 1000, 0.022, 0.008), clip))
    const obj = new THREE.Group()
    obj.add(...straps, ...clips)
    const p0: number[] = [0, 0, 0]
    const p1: number[] = [0, 0, 0]
    const p2: number[] = [0, 0, 0]
    const c = new THREE.Vector3()
    const nextC = new THREE.Vector3()
    const tan = new THREE.Vector3()
    return {
      kind: 'suspenders',
      obj,
      place: (a) => {
        const front = a.headFwd
        const spread = BRACE_FRONT_SPREAD_MM / 1000
        for (let i = 0; i < 2; i++) {
          const sx = i === 0 ? -1 : 1
          const shoulder = i === 0 ? a.shoulderL : a.shoulderR
          const frontClip = a.waist.clone().addScaledVector(front, a.waistR * WAIST_FRONT_OF_R + OVER_SHIRT_M).addScaledVector(a.headRight, sx * spread)
          // behind: the ends come in toward centre-back, the Y a real pair makes
          const backClip = a.waist.clone().addScaledVector(front, -(a.waistR * WAIST_FRONT_OF_R + OVER_SHIRT_M)).addScaledVector(a.headRight, sx * spread * 0.45)
          // the strap goes OVER the shoulder tip, standing just off it by its own bulk
          const over = shoulder.clone().addScaledVector(a.headUp, 0.012 + OVER_SHIRT_M)
          p0[0] = frontClip.x; p0[1] = frontClip.y; p0[2] = frontClip.z
          p1[0] = over.x; p1[1] = over.y; p1[2] = over.z
          p2[0] = backClip.x; p2[1] = backClip.y; p2[2] = backClip.z
          const at = (t: number, out: THREE.Vector3): void => {
            const v = splineThrough3(p0, p1, p2, t)
            out.set(v[0], v[1], v[2])
          }
          writeRibbon(
            straps[i].geometry,
            RINGS,
            at,
            (t, out) => {
              // the strap lies flat on the body: across = the run × the outward normal,
              // and outward flips from front to back as it crosses the shoulder
              at(t, c)
              at(Math.min(1, t + 0.02), nextC)
              tan.copy(nextC).sub(c)
              if (tan.lengthSq() < 1e-12) tan.set(0, -1, 0)
              out.copy(front).multiplyScalar(t < 0.5 ? 1 : -1)
              out.crossVectors(out, tan.normalize())
              if (out.lengthSq() < 1e-12) out.copy(a.headRight)
              out.normalize()
            },
            () => BRACE_WIDTH_MM / 2000
          )
          clips[i * 2].position.copy(frontClip)
          clips[i * 2].quaternion.setFromUnitVectors(FORWARD, front)
          clips[i * 2 + 1].position.copy(backClip)
          clips[i * 2 + 1].quaternion.setFromUnitVectors(FORWARD, front.clone().negate())
        }
      }
    }
  }

  /**
   * **Socks** — a knit foot cut on the *same last as the shoe*, one clearance
   * smaller, plus a ribbed cuff running up the shank.
   *
   * Sharing `FOOT_LAST` is the point: a sock modelled with its own numbers either
   * pokes through the shoe or rattles around inside it, and neither shows up until
   * someone renders both together. Cut at `SOCK_INSIDE_SHOE` of the last, the shoe
   * demonstrably fits over it — a property a test can hold.
   *
   * The cuff height is a real sock height (`?sockHeight=`), measured in cm up from
   * the **sole**, which is how socks are specified. The ankle bone is 7 cm up, so
   * the rise above the ankle is that height less 7 — negative for a no-show, which
   * is exactly why it vanishes into the shoe.
   */
  private sockHeight: SockHeight = 'crew'

  private buildSocks(): Item {
    const mat = knit(0xf0ede6)
    const k = 1 - SOCK_INSIDE_SHOE
    const L = FOOT_LAST
    const parts: { leg: THREE.Mesh; cuff: THREE.Group; foot: THREE.Group; shank: THREE.Group }[] = []
    const obj = new THREE.Group()
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group()
      // the foot, on the shoe's last less the clearance
      const instep = new THREE.Mesh(new THREE.SphereGeometry(L.instep * k, 18, 14), mat)
      instep.scale.set(0.82, 1.05, 1.7)
      instep.position.set(0, 0.012, -0.005)
      const toe = new THREE.Mesh(new THREE.SphereGeometry(L.toe * k, 16, 12), mat)
      toe.scale.set(0.92, 0.62, 1.15)
      toe.position.set(0, -0.006, 0.15)
      // a thin sole shell rather than the shoe's slab — a sock has no sole unit
      const sole = new THREE.Mesh(new THREE.BoxGeometry(L.width * k, 0.014, L.length * k), mat)
      sole.position.set(0, -0.008, 0.05)
      g.add(instep, toe, sole)
      // the shank, built at unit radius / unit length and scaled per frame
      // tapered: 1 at the bottom (the ankle) and rebuilt per rise at the top, because
      // a shank widens toward the calf and a straight tube reads as a cup on a shoe
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), mat)
      const cuff = new THREE.Group()
      for (let r = 0; r < 4; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 24), mat)
        rib.rotation.x = Math.PI / 2
        rib.position.y = 0.72 + r * 0.09
        cuff.add(rib)
      }
      const shank = new THREE.Group()
      shank.add(leg, cuff)
      obj.add(g, shank)
      parts.push({ leg, cuff, foot: g, shank })
    }
    return {
      kind: 'socks',
      obj,
      place: (a) => {
        const feet = [a.footL, a.footR]
        // the rig's foot joint IS the ankle; the capsule lerp is only a fallback
        const ankles = [a.footL, a.footR]
        const dirs = [a.lowerLegDirL, a.lowerLegDirR]
        const footDirs = [a.footDirL, a.footDirR]
        for (let i = 0; i < 2; i++) {
          placeFoot(parts[i].foot, feet[i], footDirs[i])
          const up = dirs[i].clone().negate() // distally is DOWN a leg, so up the shank is −dir
          parts[i].shank.position.copy(ankles[i])
          parts[i].shank.quaternion.setFromUnitVectors(UP, up)
          // sock knit stands a little off the leg; the cuff flares a touch more
          const r = a.ankleR_ * 1.04
          const rise = Math.max(0.012, sockRiseM(this.sockHeight))
          // the calf's belly is about a third of the way up the shank, so that is how
          // far the cuff has to rise before it is on the full calf girth
          const t = Math.min(1, rise / (0.33 * a.shankLen))
          const top = (a.ankleR_ + (a.calfR - a.ankleR_) * t) * 1.04
          if (parts[i].leg.userData.top !== top || parts[i].leg.userData.r !== r) {
            parts[i].leg.userData.top = top
            parts[i].leg.userData.r = r
            parts[i].leg.geometry.dispose()
            const g = new THREE.CylinderGeometry(top, r, 1, 24, 1, true)
            g.translate(0, 0.5, 0)
            parts[i].leg.geometry = g
          }
          parts[i].leg.scale.set(1, rise, 1)
          parts[i].cuff.scale.set(top * 1.05, rise, top * 1.05)
          parts[i].cuff.visible = rise > 0.03 // a no-show has no cuff to show
        }
      }
    }
  }

  /** Pick a sock height — a real cut (`no-show` · `ankle` · `crew` · `knee-high`). */
  setSockHeight(h: SockHeight): void {
    this.sockHeight = h
  }
  getSockHeight(): SockHeight {
    return this.sockHeight
  }

  /**
   * **Gloves** — a shell over the hand and a knit cuff up the forearm.
   *
   * Sized to the hand that is actually rendered. The forearm capsule's distal point
   * is the **palm**: the hand mesh carries on another 2.08 radii past it, so a glove
   * built to the capsule would stop at the knuckles and leave the fingers bare. The
   * reach, the thickness and the breadth all come from `?probeLimb=1`.
   *
   * Built in the limb frame — long in +y down the arm, broad in x, thin in z — so it
   * lies the way a hand lies whatever the arm is doing, with the thumb on the medial
   * side, toward the body.
   */
  private buildGloves(): Item {
    const mat = knit(0x2e3138)
    const halves: { grp: THREE.Group; shell: THREE.Mesh; thumb: THREE.Mesh; cuff: THREE.Mesh }[] = []
    const obj = new THREE.Group()
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group()
      // A capsule, not an ellipsoid: the rig gives a hand's heading but no roll
      // about it, so a shape that is round in section covers the hand whichever way
      // the palm faces — and a mitten IS round in section, which makes this the
      // honest form rather than a workaround. Rebuilt on resize (see `place`)
      // rather than scaled, because scaling a capsule in one axis distorts its caps.
      const shell = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 6, 18), mat)
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat)
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), mat)
      cuff.geometry.translate(0, -0.5, 0) // grows proximally from the wrist
      g.add(shell, thumb, cuff)
      obj.add(g)
      halves.push({ grp: g, shell, thumb, cuff })
    }
    return {
      kind: 'gloves',
      obj,
      place: (a) => {
        const wrists = [a.wristL, a.wristR]
        const hands = [a.handL, a.handR]
        const tips = [a.fingertipL, a.fingertipR]
        const dirs = [a.foreArmDirL, a.foreArmDirR]
        const handDirs = [a.handDirL, a.handDirR]
        for (let i = 0; i < 2; i++) {
          const h = halves[i]
          const R = a.foreArmR // the hand's proportions are measured against the CAPSULE
          // A glove starts at the WRIST, not at the hand joint: the palm just below
          // the wrist would otherwise sit right on the capsule's proximal cap and
          // poke through it.
          h.grp.position.copy(wrists[i])
          // Built along the HAND's heading — a hand bends at the wrist, so the
          // forearm axis points past the fingers rather than down them — and rolled
          // by the **flexion plane**: the wrist hinges palmward, so the plane
          // containing the forearm and the hand contains the palm normal too. The
          // rig exposes no palm roll directly, and this recovers it from two
          // directions it does expose. Straight-armed it degenerates, and
          // `radialMount` falls back to the body's forward.
          const along = tips[i].clone().sub(wrists[i])
          const heading = along.lengthSq() > 1e-8 ? along.clone().normalize() : handDirs[i]
          const flex = new THREE.Vector3().crossVectors(dirs[i], heading)
          const palm = flex.lengthSq() > 1e-8 ? new THREE.Vector3().crossVectors(heading, flex).normalize() : a.headFwd
          h.grp.quaternion.copy(limbFrame(heading, palm))
          // the hand runs wrist → fingertips, both of which are anchors
          const half = wrists[i].distanceTo(tips[i]) * 0.5
          // radius from the hand's half-breadth plus ease; the shaft spans whatever
          // of the joint-to-fingertip reach the two hemispherical caps do not
          const gr = (HAND_HALF_BREADTH_R + GLOVE_CLEARANCE_R) * R
          const L = half * 2
          if (h.grp.userData.gr !== gr || h.grp.userData.L !== L) {
            h.grp.userData.gr = gr
            h.grp.userData.L = L
            h.shell.geometry.dispose()
            const g = new THREE.CapsuleGeometry(gr, Math.max(0, L - 2 * gr), 6, 20)
            g.translate(0, L / 2, 0) // the joint at y = 0, the fingertips at y = L
            h.shell.geometry = g
          }
          // the thumb sits medially — toward the body — and low on the hand
          void hands
          const medial = wrists[i].x < 0 ? 1 : -1
          h.thumb.position.set(medial * gr * 0.8, half * 0.5, 0)
          h.thumb.scale.set(half * 0.3, half * 0.42, HAND_HALF_THICKNESS_R * R * 0.9)
          // the cuff grips the WRIST, which is up the forearm from the hand joint,
          // so it gets its own placement rather than riding the hand's frame
          h.cuff.position.set(0, 0, 0)
          h.cuff.quaternion.setFromUnitVectors(UP, dirs[i]).premultiply(h.grp.quaternion.clone().invert())
          h.cuff.scale.set(a.wristR_ * 1.12, GLOVE_CUFF_M, a.wristR_ * 1.12)
        }
      }
    }
  }

  /**
   * A fine chain sitting on the ankle — the joint end of the lower-leg capsule, not
   * the foot centre, so it rides the narrowest point rather than floating over the
   * instep. Oriented square to the leg axis, which matters as soon as the avatar
   * walks and the shin swings out of vertical.
   */
  private buildAnklet(): Item {
    const obj = new THREE.Group()
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.055, 8, 32), METAL)
    ring.rotation.x = Math.PI / 2 // lies in the plane perpendicular to +y before orienting
    obj.add(ring)
    // a small drop charm hanging on the outer side
    const charm = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), METAL)
    charm.position.set(0.98, -0.16, 0)
    obj.add(charm)
    return {
      kind: 'anklet',
      obj,
      place: (a) => {
        // a chain hangs a little loose on the ankle
        const r = a.ankleR_ * 1.12
        obj.scale.setScalar(r)
        obj.position.copy(a.ankleL)
        obj.quaternion.setFromUnitVectors(UP, a.lowerLegDirL)
      }
    }
  }

  private buildNecklace(): Item {
    // A pearl strand at the neck base. The frame's unit is the NECK radius (~5 cm)
    // but the chest is ~3 units deep, so the front dip bows well forward + down to
    // drape onto the upper chest instead of vanishing inside the torso.
    const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf3ecdf, roughness: 0.18, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.4 })
    const obj = new THREE.Group()
    const N = 18
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI // half-turn: ear to ear around the front
      const x = Math.cos(t) * 1.3
      const z = 0.4 + Math.sin(t) * 2.6 // bows out past the chest surface
      const y = -0.5 - Math.sin(t) * 1.5 // dips onto the upper chest at centre-front
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), pearl)
      b.position.set(x, y, z)
      obj.add(b)
    }
    const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), pearl)
    pendant.position.set(0, -2.25, 3.1)
    obj.add(pendant)
    return this.neckItem('necklace', obj)
  }

  /**
   * Gold hoops hanging from the **earlobes**.
   *
   * They used to be pinned half a head-radius too high — up level with the brow,
   * which is the *top* of the ear — because the height was a round number rather
   * than a landmark. Now they hang off `lobeL`/`lobeR`, and they are built at their
   * real size (30 mm outside, 1.5 mm wire) in world units, so a 30 mm hoop stays a
   * 30 mm hoop on a larger or smaller head instead of scaling with the skull.
   */
  private buildHoops(): Item {
    const obj = new THREE.Group()
    const wire = HOOP_WIRE_MM / 2000 // mm diameter → m radius
    const ring = HOOP_OUTER_MM / 2000 - wire // torus radius is to the centre of the wire
    const hoops = [-1, 1].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(ring, wire, 8, 28), METAL)
      obj.add(m)
      return m
    })
    return {
      kind: 'hoops',
      obj,
      place: (a) => {
        const lobes = [a.lobeL, a.lobeR]
        for (let i = 0; i < 2; i++) {
          // the hoop passes through the lobe, so its centre hangs one radius below it
          hoops[i].position.copy(lobes[i]).addScaledVector(a.headUp, -ring)
          // it lies in the sagittal plane: the ring's axis is the head's lateral axis
          hoops[i].quaternion.setFromUnitVectors(FORWARD, a.headRight)
        }
      }
    }
  }

  /**
   * **Stud earrings** — a 5 mm ball on a 20-gauge post, sitting on the earlobe.
   *
   * Built in world units at the real size, like the hoops: a stud is 5 mm across on
   * any head. The ball sits its own radius proud of the lobe so it reads as resting
   * on the surface rather than sunk into it, and the post runs inward along the
   * head's lateral axis, which is the direction a piercing actually goes.
   */
  private buildStuds(): Item {
    const obj = new THREE.Group()
    const ball = STUD_BALL_MM / 2000
    const post = STUD_POST_MM / 2000
    const studs = [-1, 1].map(() => {
      const g = new THREE.Group()
      const bead = new THREE.Mesh(new THREE.SphereGeometry(ball, 14, 12), METAL)
      // a faceted collet under the ball catches the key light like a real setting
      const collet = new THREE.Mesh(new THREE.CylinderGeometry(ball * 0.55, ball * 0.8, ball * 0.5, 8), METAL)
      collet.rotation.x = Math.PI / 2
      collet.position.z = -ball * 0.7
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(post, post, ball * 2.4, 6), METAL)
      shaft.rotation.x = Math.PI / 2
      shaft.position.z = -ball * 2 // runs inward, mostly hidden by the lobe
      g.add(bead, collet, shaft)
      obj.add(g)
      return g
    })
    return {
      kind: 'studs',
      obj,
      place: (a) => {
        const lobes = [a.lobeL, a.lobeR]
        for (let i = 0; i < 2; i++) {
          const outward = a.headRight.clone().multiplyScalar(i === 0 ? -1 : 1)
          studs[i].position.copy(lobes[i]).addScaledVector(outward, ball)
          // +z of the stud is its outward face, so the post points into the lobe
          studs[i].quaternion.setFromUnitVectors(FORWARD, outward)
        }
      }
    }
  }

  /**
   * A **wristwatch** on the left wrist, sized to the wrist it is worn on.
   *
   * The case diameter comes from `watchCaseMm` — 2 mm of case per cm of wrist — and
   * the thickness and strap width follow from the diameter, so the proportions stay
   * right across body sizes instead of a 40 mm case being bolted onto a child's arm.
   *
   * The whole thing is built in a local frame with **+y along the forearm** and **+z
   * out of the wrist surface**, which makes the geometry say what it means:
   *
   * - the strap loop lies in the x–z plane, i.e. the wrist's cross-section;
   * - the case axis is +z, so it sits flat on the wrist however the arm is posed;
   * - the dial's 12–6 axis is local x — *across* the wrist — because that is where
   *   the lugs are and the strap continues from them around the arm;
   * - the crown at 3 o'clock therefore points along the forearm, and it is put on the
   *   **proximal** side so wrist flexion does not drive it into the back of the hand.
   *
   * The mount direction is the body's forward — the dorsal face of the wrist on this
   * rig — with its along-the-arm component projected out (`radialMount`), so the case
   * stays flat on the wrist when the avatar's arms swing.
   */
  private buildWatch(): Item {
    const steel = new THREE.MeshStandardMaterial({ color: 0xd8dade, roughness: 0.18, metalness: 1, envMapIntensity: 1.4 })
    const dialMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.45, metalness: 0.1 })
    // sapphire: IOR 1.77, which is why a real crystal reads so much brighter than glass
    const crystalMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.92, ior: 1.77, roughness: 0.02, metalness: 0, thickness: 0.001, envMapIntensity: 2 })
    const strapMat = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.62, metalness: 0.02, side: THREE.DoubleSide })
    const handMat = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.3, metalness: 0.6 })

    const frame = new THREE.Group() // local: +y distal, +z out of the wrist
    // Built at unit case radius, so the case spans z ∈ [−0.27, +0.27]: the thickness
    // ratio is baked into the geometry, which means one uniform scale to the fitted
    // diameter gets both the width and the depth right.
    const D = WATCH_THICKNESS_RATIO // the case spans ±D at unit radius, so it is 0.27 × diameter deep
    // the case SIDE is an open cylinder and the bezel a flat ring: a solid cylinder
    // caps the front and hides the dial behind a blank steel disc
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, D * 2, 44, 1, true), steel)
    band.rotation.x = Math.PI / 2
    const bezel = new THREE.Mesh(new THREE.RingGeometry(0.87, 1, 44), steel)
    bezel.position.z = D
    const back = new THREE.Mesh(new THREE.CircleGeometry(1, 44), steel)
    back.rotation.y = Math.PI // faces −z, so it reads from under the wrist
    back.position.z = -D
    const dial = new THREE.Mesh(new THREE.CircleGeometry(0.86, 40), dialMat)
    dial.position.z = 0.05
    // a real sapphire is a thin flat disc, ~1 mm on a 40 mm case — 0.05 at unit radius
    const crystal = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.05, 40), crystalMat)
    crystal.rotation.x = Math.PI / 2
    crystal.position.z = D - 0.05
    // indices at 12 / 3 / 6 / 9. 12 o'clock is local +x — across the wrist, where the
    // lugs are, because the strap continues from them around the arm.
    const indices = new THREE.Group()
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * TAU
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.045, 0.015), handMat)
      mark.position.set(Math.cos(ang) * 0.71, Math.sin(ang) * 0.71, 0.075)
      mark.rotation.z = ang
      indices.add(mark)
    }
    // hands set to 10:08 — the display setting, because it leaves the dial readable
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.015), handMat)
    hour.geometry.translate(0.23, 0, 0) // pivot at the centre pin, not the middle
    hour.rotation.z = Math.PI / 3 // 10 o'clock, measured from 12 at +x
    hour.position.z = 0.1
    const minute = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.015), handMat)
    minute.geometry.translate(0.33, 0, 0)
    minute.rotation.z = -Math.PI * 0.267 // 08 minutes
    minute.position.z = 0.12
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 12), handMat)
    pin.rotation.x = Math.PI / 2
    pin.position.z = 0.14
    // the crown at 3 o'clock sits on the proximal side (local −y), so wrist flexion
    // does not drive it into the back of the hand
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.15, 14), steel)
    crown.position.y = -1.05
    const caseGrp = new THREE.Group()
    caseGrp.add(band, bezel, back, dial, crystal, indices, hour, minute, pin, crown)

    // The strap is a thin band, so it is an open cylinder rather than a torus: axis
    // already +y, which is the forearm, so the loop lies in the wrist's cross-section.
    const strap = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 48, 1, true), strapMat)
    frame.add(caseGrp, strap)

    const obj = new THREE.Group()
    obj.add(frame)
    return {
      kind: 'watch',
      obj,
      place: (a) => {
        // Worn on the **left** wrist, and which one that is has to come from the
        // geometry rather than from an array index: the GLB rig's limb colliders do
        // not sit on the side their index is named for, so `wristL` can land on the
        // avatar's right. The head frame knows which way is right, so ask it.
        const onLeft = a.wristL.clone().sub(a.waist).dot(a.headRight) < 0
        const wrist = onLeft ? a.wristL : a.wristR
        const axis = onLeft ? a.foreArmDirL : a.foreArmDirR
        const caseMm = watchCaseMm(circumferenceCm(a.wristR_))
        const caseR = caseMm / 2000 // mm diameter → m radius
        const bandW = watchLugWidthMm(caseMm) / 1000
        // A watch is worn on the **dorsal** face of the wrist — the back of the hand.
        // On this rig the arm hangs with the back of the hand facing forward, so the
        // body's own forward direction is the dorsal one; flattening it onto the
        // wrist's cross-section keeps the case on the surface rather than skewed
        // across it when the arm swings.
        const mount = radialMount(axis, a.headFwd)
        const x = new THREE.Vector3().crossVectors(axis, mount) // right-handed: x = y × z
        frame.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, axis, mount))
        // the case sits just proximal of the joint, by about half its own diameter
        frame.position.copy(wrist).addScaledVector(axis, -caseR)
        caseGrp.scale.setScalar(caseR)
        caseGrp.position.set(0, 0, a.wristR_ + caseR * WATCH_THICKNESS_RATIO)
        strap.scale.set(a.wristR_ + 0.001, bandW, a.wristR_ + 0.001)
      }
    }
  }

  private buildBalaclava(): Item {
    const mat = knit(0x1b1e25)
    // a tall ovoid shell domed over the WHOLE cranium (crown included) and down past the
    // jaw to the neck base. Centred near the cranium centre (HC) so the crown is covered.
    // Centred at the cranium centre (~HC) so its widest part covers the crown (like the
    // beanie dome), then elongated downward to reach past the jaw to the neck base.
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.16, 28, 26, 0, TAU, 0, Math.PI), mat)
    shell.position.y = 0.32
    shell.scale.set(1.08, 1.36, 1.1)
    // face-opening cue: a darker recessed oval on the front (a real cut-out is a cloth-sim card)
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 22), new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.9 }))
    face.scale.set(0.9, 0.74, 1)
    face.position.set(0, -0.04, 1.18)
    const obj = new THREE.Group()
    obj.add(shell, face)
    return this.headItem('balaclava', obj)
  }

  private buildGoggles(): Item {
    // ski goggles: a mirrored lens band curved across the eyes (a sphere patch just
    // proud of the face plane, z ≈ 1.18 like the balaclava's face oval) + a white
    // frame shell behind it + the strap wrapping the head at eye level
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(1.18, 32, 12, Math.PI / 2 - 0.75, 1.5, 1.55, 0.5),
      new THREE.MeshPhysicalMaterial({ color: 0x7fd4e8, metalness: 1, roughness: 0.08, envMapIntensity: 1.8 })
    )
    lens.position.y = 0.35
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.24, 32, 12, Math.PI / 2 - 0.9, 1.8, 1.5, 0.62),
      new THREE.MeshStandardMaterial({ color: 0xf2f2f4, roughness: 0.55, side: THREE.DoubleSide })
    )
    shell.position.y = 0.35
    const strap = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.06, 8, 32), new THREE.MeshStandardMaterial({ color: 0x22242c, roughness: 0.7 }))
    strap.rotation.x = Math.PI / 2
    strap.position.y = 0.09 // eye level
    const obj = new THREE.Group()
    obj.add(lens, shell, strap)
    return this.headItem('goggles', obj)
  }

  /**
   * The **brimless crowns** — fez, kufi and pillbox.
   *
   * One lathe and a table of profiles, because that is honestly what separates
   * them: all three come off the same kind of block, cut to different heights and
   * tapers. The fez is the tall truncated cone, the kufi the short rounded
   * skullcap, the pillbox the shallow drum — and the pillbox is deliberately
   * *narrower* than the head, which is why it perches rather than fits, and why it
   * is worn tilted and set back.
   *
   * Blocked in millimetres, as a milliner works, converted into the head frame
   * through the measured head breadth so every one of them fits a resized head.
   */
  private buildBrimless(style: BrimlessStyle): Item {
    const c = CROWNS[style]
    const mat = style === 'fez' ? felt(c.colour) : knit(c.colour)
    const RINGS = 20
    const RADIAL = 40
    // a lathe: the crown profile revolved, with the band open at the bottom
    const pts: THREE.Vector2[] = []
    for (let i = 0; i <= RINGS; i++) {
      const t = i / RINGS
      pts.push(new THREE.Vector2(Math.max(1e-4, crownRadius(c, t)), t * crownHeight(c)))
    }
    const crown = new THREE.Mesh(new THREE.LatheGeometry(pts, RADIAL), mat)
    const obj = new THREE.Group()
    obj.add(crown)
    if (style === 'fez') this.addTassel(obj, c)
    // graded to the head it is on: girth so the band clears the widest point, and
    // height so the crown actually contains the skull above it
    obj.scale.set(crownFit(c), crownRise(c, HAT_LINE_Y), crownFit(c))
    // a pillbox perches: tilted back off the brow and set back on the crown
    obj.rotation.x = (-c.tiltDeg * Math.PI) / 180
    obj.position.set(0, HAT_LINE_Y, -c.setBack)
    const outer = new THREE.Group()
    outer.add(obj)
    return this.headItem(style as AccessoryKind, outer)
  }

  /**
   * The fez's tassel — a silk bundle on a cord from a button at the centre of the
   * flat top. Built as strands rather than a cone so it reads as thread.
   */
  private addTassel(obj: THREE.Group, c: (typeof CROWNS)['fez']): void {
    const silk = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.62, metalness: 0 })
    const top = crownHeight(c)
    const button = new THREE.Mesh(new THREE.SphereGeometry((TASSEL_BUTTON_MM / 2) * mmToUnits, 12, 10), silk)
    button.position.y = top
    button.scale.y = 0.6
    obj.add(button)
    const SEGS = 6
    for (let i = 0; i < TASSEL_STRANDS; i++) {
      const path: THREE.Vector3[] = []
      for (let k = 0; k <= SEGS; k++) {
        const d = k / SEGS
        const p = tasselStrand(i, TASSEL_STRANDS, d, 0.06, crownRadius(c, 1 - c.roundTop))
        path.push(new THREE.Vector3(p.x, top + p.y, p.z))
      }
      const strand = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), SEGS * 2, TASSEL_LENGTH_MM * mmToUnits * 0.012, 4, false),
        silk
      )
      obj.add(strand)
    }
  }

  /**
   * The **straw hats** — a boater and a panama.
   *
   * Crown, brim and ribbon band, with the difference between them carried in the
   * spec rather than in the code: a boater is stiffened sennit, so its brim is dead
   * flat with a small turned edge and its crown a hard flat-topped drum; a panama
   * is soft toquilla, so its brim falls away and its crown takes a centre dent.
   *
   * Placed on the same measured hat line as the brimless crowns, and graded so the
   * band clears the head's widest point.
   */
  private buildStraw(style: StrawStyle): Item {
    const h = STRAW_HATS[style]
    const strawMat = this.strawMaterial()
    strawMat.color = new THREE.Color(h.strawColour)
    const ribbonMat = new THREE.MeshStandardMaterial({ color: h.ribbonColour, roughness: 0.68, metalness: 0 })
    const obj = new THREE.Group()

    // the crown: a grid so a centre dent can be pressed into its top
    const RAD = 44
    const bandR = (h.bandMm / 2) * mmToUnits
    const topR = (h.topMm / 2) * mmToUnits
    const hgt = h.crownMm * mmToUnits
    const side = new THREE.Mesh(new THREE.CylinderGeometry(topR, bandR, hgt, RAD, 1, true), strawMat)
    side.position.y = hgt / 2
    obj.add(side)
    // the top, pressed: a disc whose height is the dent field
    const top = new THREE.CircleGeometry(topR, RAD, 0, TAU)
    {
      const pos = top.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const y = pos.getY(i)
        // the crease runs front-to-back, so `across` is x and `axial` is y (→ z)
        pos.setZ(i, -centreDent(h, x / (topR || 1), y / (topR || 1)))
      }
      pos.needsUpdate = true
      top.computeVertexNormals()
    }
    const topMesh = new THREE.Mesh(top, strawMat)
    topMesh.rotation.x = -Math.PI / 2
    topMesh.position.y = hgt
    obj.add(topMesh)

    // the brim: a ring swept out along its own profile
    const BRIM_RINGS = 10
    const brimMat = new THREE.MeshStandardMaterial({ color: h.strawColour, roughness: 0.82, metalness: 0, side: THREE.DoubleSide })
    const brim = new THREE.Mesh(new THREE.BufferGeometry(), brimMat)
    {
      const verts: number[] = []
      const idx: number[] = []
      for (let i = 0; i <= BRIM_RINGS; i++) {
        const { out, down } = brimProfileAt(h, i / BRIM_RINGS)
        for (let k = 0; k < RAD; k++) {
          const a = (k / RAD) * TAU
          verts.push(Math.cos(a) * out, -down, Math.sin(a) * out)
        }
      }
      for (let i = 0; i < BRIM_RINGS; i++) {
        for (let k = 0; k < RAD; k++) {
          const n = (k + 1) % RAD
          const a = i * RAD + k
          const b = i * RAD + n
          idx.push(a, b, a + RAD, b, b + RAD, a + RAD)
        }
      }
      brim.geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      brim.geometry.setIndex(idx)
      brim.geometry.computeVertexNormals()
    }
    obj.add(brim)

    // the ribbon band, sitting on the brim at the base of the crown
    const bandH = h.bandHeightMm * mmToUnits
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(bandR * 1.03, bandR * 1.03, bandH, RAD, 1, true), ribbonMat)
    ribbon.position.y = bandH / 2 + 0.01
    obj.add(ribbon)

    const outer = new THREE.Group()
    obj.scale.set(crownFit(CROWNS.fez), 1, crownFit(CROWNS.fez))
    obj.position.y = HAT_LINE_Y
    outer.add(obj)
    return this.headItem(style as AccessoryKind, outer)
  }

  private flapWorn: FlapWorn = 'down'

  /** Wear the ear flaps down over the ears, or folded up onto the crown. */
  setFlapWorn(worn: FlapWorn): void {
    this.flapWorn = worn
    for (const it of this.items) {
      const flaps = it.obj.getObjectByName('flaps') as THREE.Group | undefined
      if (!flaps) continue
      for (const f of flaps.children) f.rotation.x = flapAngle(worn)
    }
  }
  getFlapWorn(): FlapWorn {
    return this.flapWorn
  }

  /**
   * The **ear-flap hats** — an ushanka and a deerstalker.
   *
   * One flap shape on one hinge; the hats differ in the crown it hangs from, the
   * pile, and what else is attached. The flap **hinges on the ear**, using the same
   * landmark the earrings do, so the two agree about where an ear is — a flap that
   * covers the ear has to pivot there or it swings through the jaw.
   *
   * A deerstalker also carries the pair of bills, front and back, which is the
   * thing that makes it a deerstalker rather than any other flapped cap.
   */
  private buildFlapHat(style: FlapStyle): Item {
    const h = FLAP_HATS[style]
    const crownMat = style === 'ushanka' ? knit(h.crownColour) : felt(h.crownColour)
    const flapMat = style === 'ushanka' ? knit(h.flapColour) : felt(h.flapColour)
    flapMat.side = THREE.DoubleSide
    const obj = new THREE.Group()
    const RAD = 40
    const bandR = (h.bandMm / 2) * mmToUnits

    // The crown goes through the same graded lathe as the fez and the kufi. A
    // hemisphere is the obvious shape for a fur hat and it is the wrong one: this
    // head is squarer at the top than a sphere, so a dome drafted to clear it at
    // the band has the skull coming out through it higher up.
    const cs = crownOf(h)
    const fit = crownFit(cs)
    const rise = crownRise(cs, HAT_LINE_Y)
    const shellR = bandR * fit
    const profile: THREE.Vector2[] = []
    for (let i = 0; i <= 18; i++) {
      const t = i / 18
      profile.push(new THREE.Vector2(Math.max(1e-4, crownRadius(cs, t) * fit), t * crownHeight(cs) * rise))
    }
    obj.add(new THREE.Mesh(new THREE.LatheGeometry(profile, RAD), crownMat))

    // the flaps, each on its own hinge group so the worn state is one rotation
    const flaps = new THREE.Group()
    flaps.name = 'flaps'
    const RINGS = 10
    const COLS = 9
    const SPAN = 1.5 // radians of head the flap covers at its widest
    for (const sx of [-1, 1] as const) {
      const hinge = new THREE.Group()
      const verts: number[] = []
      const idx: number[] = []
      const drop = h.flapDropMm * mmToUnits
      // The flap WRAPS the side of the head: an arc patch about the head's axis,
      // not a flat panel. Built flat it is a strip seen edge-on from the front,
      // which is a line where an ear flap should be a broad shape over the ear.
      for (let i = 0; i <= RINGS; i++) {
        const t = i / RINGS
        const half = (flapHalfWidth(t) / 0.5) * (SPAN / 2) // the profile, as an angle
        const r = shellR + flapStandoff(h, t)
        for (let k = 0; k <= COLS; k++) {
          const a = sx * (Math.PI / 2) + (k / COLS - 0.5) * 2 * half
          verts.push(Math.cos(a) * r, -t * drop, Math.sin(a) * r)
        }
      }
      for (let i = 0; i < RINGS; i++) {
        for (let k = 0; k < COLS; k++) {
          const a = i * (COLS + 1) + k
          idx.push(a, a + 1, a + COLS + 1, a + 1, a + COLS + 2, a + COLS + 1)
        }
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
      geo.setIndex(idx)
      geo.computeVertexNormals()
      const hingeMesh = new THREE.Mesh(geo, flapMat)
      hinge.add(hingeMesh)
      hinge.rotation.x = flapAngle(this.flapWorn)
      flaps.add(hinge)
    }
    // hinged on the EAR — the same landmark the earrings use
    flaps.position.y = HEAD_CROWN_Y - HAT_LINE_Y - FLAP_HINGE_FRAC * (HEAD_CROWN_Y + 1.7)
    obj.add(flaps)

    if (h.billMm > 0) {
      // the deerstalker's pair: front and back, which is what makes it one
      for (const az of BILL_AZIMUTHS) {
        const bill = new THREE.Mesh(new THREE.CylinderGeometry(shellR * 1.02, shellR * 1.02, h.billMm * mmToUnits, 26, 1, false, -0.55, 1.1), crownMat)
        bill.rotation.x = Math.PI / 2
        bill.rotation.y = az
        bill.scale.set(1, 1, 0.12)
        obj.add(bill)
      }
    }

    obj.position.y = HAT_LINE_Y
    const outer = new THREE.Group()
    outer.add(obj)
    return this.headItem(style as AccessoryKind, outer)
  }

  private sunglassesStyle: SunglassesStyle = 'wayfarer'

  /** Pick a frame block — wayfarer · aviator · round · cat-eye. */
  setSunglassesStyle(style: SunglassesStyle): void {
    this.sunglassesStyle = style
    const it = this.items.find((i) => i.kind === 'sunglasses')
    if (!it) return
    const holder = it.obj
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addShades(holder)
  }
  getSunglassesStyle(): SunglassesStyle {
    return this.sunglassesStyle
  }

  /**
   * Shades that ride the face frame, so they coexist with any hat.
   *
   * Built at the **measured** face plane: `?probeHead=1` puts the rendered face at
   * 1.32 collider radii at eye level, and the lenses used to be authored at 0.92 —
   * a good four centimetres inside the skull, with only the outer corners showing
   * and the temple arms apparently floating in mid-air beside the head.
   *
   * The four blocks differ in the way real frames differ: the lens and bridge
   * millimetres off the temple, a moulded acetate rim against drawn wire, the
   * cat-eye's swept corner and the aviator's teardrop and brow bar. Sizing them
   * against the face's width rather than by a constant is how an optician fits a
   * frame, and it is what keeps them looking like eyewear on a head of any size.
   */
  private addShades(obj: THREE.Group): void {
    const f = FRAMES[this.sunglassesStyle]
    const glass = new THREE.MeshPhysicalMaterial({ color: f.tint, metalness: 0.1, roughness: 0.08, transmission: 0.2, ior: 1.52, envMapIntensity: 1.5, side: THREE.DoubleSide })
    const rimMat = f.metal
      ? new THREE.MeshStandardMaterial({ color: 0xc9b477, roughness: 0.24, metalness: 0.95 })
      : new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.38, metalness: 0.05 })
    // eye level: half the head's height below the crown, which is where `face.ts`
    // puts the eyes, and the face plane is the measured one
    const eyeY = -0.575
    const eyeZ = FACE_FRONT_R - 0.06 // the lens hugs the face rather than floating off it
    const rim = f.rimMm * unitsPerMm
    const off = lensOffset(f)
    for (const sx of [-1, 1] as const) {
      const pts = lensOutline(f, sx)
      // the lens itself: the outline filled, sitting in the rim
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
      const lens = new THREE.Mesh(new THREE.ShapeGeometry(shape, 1), glass)
      lens.position.set(sx * off, eyeY, eyeZ)
      obj.add(lens)
      // the rim: a tube swept round the same outline, so a cat-eye's corner and an
      // aviator's teardrop are rimmed in their own shape rather than an ellipse
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true)
      const rimMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, pts.length * 2, rim, 6, true), rimMat)
      rimMesh.position.set(sx * off, eyeY, eyeZ + 0.01)
      obj.add(rimMesh)
      // temple arm, from the lens's outer edge back past the ear
      const temple = new THREE.Mesh(new THREE.BoxGeometry(0.95, rim * 1.6, rim * 1.2), rimMat)
      temple.position.set(sx * (off + f.lensMm * 0.5 * unitsPerMm + 0.28), eyeY + 0.07, eyeZ - 0.5)
      temple.rotation.y = sx * 0.72 // splayed back toward the ears
      obj.add(temple)
    }
    // the bridge over the nose
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(f.bridgeMm * unitsPerMm, rim * 1.4, rim * 1.4), rimMat)
    bridge.position.set(0, eyeY + (f.teardrop ? 0.1 : 0.05), eyeZ + 0.01)
    obj.add(bridge)
    if (f.browBar) {
      // the aviator's bar straight across the top of both lenses
      const bar = new THREE.Mesh(new THREE.BoxGeometry(off * 2 + f.lensMm * unitsPerMm, rim * 1.3, rim * 1.3), rimMat)
      bar.position.set(0, eyeY + (f.lensHighMm / 2) * unitsPerMm, eyeZ + 0.01)
      obj.add(bar)
    }
  }

  private buildSunglasses(): Item {
    const obj = new THREE.Group()
    this.addShades(obj)
    return this.headItem('sunglasses', obj)
  }

  private turbanWraps = 4

  private buildTurban(): Item {
    // a wrapped turban: a domed crown cap + N overlapping cloth wraps stacked from
    // the brow up over the head (the wrap count is designer-controlled). Authored in
    // the unit head frame like the other headwear.
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b3f8f, roughness: 0.72, metalness: 0, side: THREE.DoubleSide })
    const obj = new THREE.Group()
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.78, 24, 16, 0, TAU, 0, Math.PI * 0.6), mat)
    cap.position.y = HC + 0.12 // dome the crown (HC is where headwear caps the head)
    obj.add(cap)
    const holder = new THREE.Group()
    holder.name = 'wrap-holder'
    holder.userData.mat = mat
    obj.add(holder)
    this.addTurbanWraps(holder, mat)
    return this.headItem('turban', obj)
  }

  private addTurbanWraps(holder: THREE.Group, mat: THREE.Material): void {
    const n = this.turbanWraps
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0 // 0 at the hairline → 1 near the crown
      const major = 1.14 - t * 0.5 // narrows toward the domed top
      const band = new THREE.Mesh(new THREE.TorusGeometry(major, 0.14, 10, 32), mat)
      band.rotation.x = Math.PI / 2
      band.rotation.z = (i % 2 ? 1 : -1) * 0.06 // slight alternating tilt — the wrapped look
      band.position.y = HC - 0.28 + t * 0.62 // stack from the hairline up over the crown
      holder.add(band)
    }
  }

  /** The turban wrap-count designer — re-wrap with `n` (2–8) bands in place. */
  setTurbanWraps(n: number): void {
    this.turbanWraps = Math.max(2, Math.min(8, Math.round(n) || 4))
    const it = this.items.find((i) => i.kind === 'turban')
    const holder = it?.obj.getObjectByName('wrap-holder') as THREE.Group | undefined
    if (!holder) return
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addTurbanWraps(holder, holder.userData.mat as THREE.Material)
  }
  getTurbanWraps(): number {
    return this.turbanWraps
  }

  private buildScarf(): Item {
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a2233, roughness: 0.7, metalness: 0, side: THREE.DoubleSide })
    // a soft knit loop wrapping over the garment neckline (neckR is thin), sitting toward the jaw
    const loop = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.55, 14, 32), mat)
    loop.rotation.x = Math.PI / 2
    loop.position.y = 0.35
    // a long, flat, gently-tapering tail (narrower + thinner than a stiff box → reads like cloth)
    const tail = (x: number): THREE.Mesh => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.85, 5.6, 0.12), mat)
      t.scale.set(1, 1, 1)
      t.position.set(x, -2.6, 1.95)
      return t
    }
    const obj = new THREE.Group()
    obj.add(loop, tail(-0.7), tail(0.7))
    return this.neckItem('scarf', obj)
  }

  private buildGaiter(): Item {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 5.2, 24, 1, true), knit(0x565c67))
    tube.position.y = 0.9 // sit up around the neck (toward the jaw), not down at the collarbone
    const obj = new THREE.Group()
    obj.add(tube)
    return this.neckItem('gaiter', obj)
  }
}
