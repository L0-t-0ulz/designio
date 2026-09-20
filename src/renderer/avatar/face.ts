import * as THREE from 'three'
import type { Capsule } from './colliders'

/**
 * **Face & hair customization** — a procedural hairstyle library + subtle face
 * features (brows · eyes · nose · lips) that ride the avatar's head each frame, so
 * they follow the walk / turn / pose / resize just like the accessories do. All the
 * geometry is authored in a **unit head frame** (origin = crown, +y up, +z facing)
 * and placed by `headFrame()`, which is derived from the live capsules — so both the
 * procedural body and the GLB avatar get a face. The frame + layout math is pure and
 * unit-tested; the meshes are built in the renderer.
 */

export type Hairstyle = 'bald' | 'short' | 'bob' | 'long' | 'afro'
export const HAIRSTYLES: Hairstyle[] = ['bald', 'short', 'bob', 'long', 'afro']
export const HAIRSTYLE_LABELS: Record<Hairstyle, string> = {
  bald: 'None', short: 'Short', bob: 'Bob', long: 'Long', afro: 'Afro'
}

export interface HairColor {
  id: string
  label: string
  hex: number
}
/** A curated set of natural hair colours (the picker also allows any custom hue). */
export const HAIR_COLORS: HairColor[] = [
  { id: 'black', label: 'Black', hex: 0x1a1412 },
  { id: 'brown', label: 'Brown', hex: 0x3a2418 },
  { id: 'chestnut', label: 'Chestnut', hex: 0x5a3620 },
  { id: 'auburn', label: 'Auburn', hex: 0x7a3b23 },
  { id: 'blonde', label: 'Blonde', hex: 0xc7a25a },
  { id: 'platinum', label: 'Platinum', hex: 0xd9cba6 },
  { id: 'red', label: 'Red', hex: 0x9a3a1e },
  { id: 'grey', label: 'Grey', hex: 0x9a9490 }
]

/** Orthonormal head frame (world) — origin at the crown, facing +z, up +y. */
export interface HeadFrame {
  crown: THREE.Vector3
  radius: number
  forward: THREE.Vector3
  up: THREE.Vector3
  right: THREE.Vector3
}

/**
 * Derive the head frame from the live body capsules. The head axis (0.a→0.b) gives
 * `up`; the shoulder axis (3.a→3.b, left→right) gives `right`; `forward = right × up`
 * (≈ +z at rest) — so the whole rig turns with the body during a turn/pose. Pure.
 */
export function headFrame(c: Capsule[]): HeadFrame {
  const head = c[0]
  const shoulder = c[3]
  const up = new THREE.Vector3().subVectors(head.b, head.a)
  if (up.lengthSq() < 1e-8) up.set(0, 1, 0)
  up.normalize()
  const right = new THREE.Vector3().subVectors(shoulder.b, shoulder.a)
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  // re-orthogonalise `right` against `up`, then rebuild `forward`
  right.addScaledVector(up, -right.dot(up))
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  right.normalize()
  const forward = new THREE.Vector3().crossVectors(right, up).normalize()
  return { crown: head.b.clone(), radius: head.radius, forward, up, right }
}

/**
 * A hairstyle described as head-radius-relative volumes the builder consumes (so the
 * same spec drives the mesh and is checkable in a test). `back` = how far the hair
 * falls behind, in head radii (0 = none).
 */
export interface HairstyleSpec {
  cap: boolean
  back: number
  afro: boolean
}
export function hairstyleSpec(style: Hairstyle): HairstyleSpec {
  switch (style) {
    case 'bald': return { cap: false, back: 0, afro: false }
    case 'short': return { cap: true, back: 0.35, afro: false }
    case 'bob': return { cap: true, back: 1.6, afro: false }
    case 'long': return { cap: true, back: 3.0, afro: false }
    case 'afro': return { cap: false, back: 0, afro: true }
  }
}

export type FeatureKind = 'sclera' | 'iris' | 'brow' | 'nose' | 'lip'
/** A face feature placed in the unit head frame (origin crown, +y up, +z facing). */
export interface FaceFeature {
  name: string
  kind: FeatureKind
  pos: [number, number, number]
  size: [number, number, number]
}

/**
 * The face features laid out in the unit head frame. Eyes are mirrored in x, brows
 * sit above the eyes, lips below — all on the front hemisphere (z > 0). Pure, so the
 * arrangement is unit-tested.
 */
export function faceFeatureLayout(): FaceFeature[] {
  // Head-local units where the collider crown is the origin; the visible head is a
  // tall ovoid whose centre sits ~0.9 below the crown, so the face features live low.
  const eyeY = -0.95
  const browY = -0.68
  const lipY = -1.7
  return [
    { name: 'eyeL-sclera', kind: 'sclera', pos: [-0.42, eyeY, 0.82], size: [0.17, 0.11, 0.11] },
    { name: 'eyeR-sclera', kind: 'sclera', pos: [0.42, eyeY, 0.82], size: [0.17, 0.11, 0.11] },
    { name: 'eyeL-iris', kind: 'iris', pos: [-0.42, eyeY, 0.9], size: [0.08, 0.08, 0.06] },
    { name: 'eyeR-iris', kind: 'iris', pos: [0.42, eyeY, 0.9], size: [0.08, 0.08, 0.06] },
    { name: 'browL', kind: 'brow', pos: [-0.42, browY, 0.86], size: [0.24, 0.06, 0.07] },
    { name: 'browR', kind: 'brow', pos: [0.42, browY, 0.86], size: [0.24, 0.06, 0.07] },
    { name: 'nose', kind: 'nose', pos: [0, -1.28, 1.02], size: [0.14, 0.28, 0.16] },
    { name: 'lip', kind: 'lip', pos: [0, lipY, 0.86], size: [0.3, 0.11, 0.1] }
  ]
}

/**
 * **Ear landmarks**, as fractions of the head's own crown-to-chin height.
 *
 * Measured, not guessed. Raycasting the rendered avatar (`?probeHead=1`) across a
 * ladder of heights shows that the head collider's **swept extent** — crown at
 * `b + r`, chin at `a − r` — lands within 2 mm of the rendered head's crown and chin,
 * on both the GLB avatar and the procedural body. So the head's real height is
 * `|a − b| + 2r`, and a landmark expressed as a fraction of it is correct for either
 * body and stays correct when the head is resized.
 *
 * The fractions are the classical face proportions: the hairline sits a fifth of the
 * way down, and hairline → brow → base of the nose → chin divide the rest in thirds.
 * The **auricle spans brow to nose base** — which on this head works out at 6.7 cm
 * tall, against a real ear's 6–6.5 cm.
 */
export const HAIRLINE_FRAC = 0.2
export const BROW_FRAC = HAIRLINE_FRAC + (1 - HAIRLINE_FRAC) / 3
export const NOSE_BASE_FRAC = HAIRLINE_FRAC + (2 * (1 - HAIRLINE_FRAC)) / 3
/** Top and bottom of the ear, and so its centre — 0.6 of the way down the head. */
export const EAR_TOP_FRAC = BROW_FRAC
export const EAR_BOTTOM_FRAC = NOSE_BASE_FRAC
export const EAR_CENTRE_FRAC = (EAR_TOP_FRAC + EAR_BOTTOM_FRAC) / 2
/** The fleshy lobule is the bottom fifth of the auricle; a piercing sits in its middle. */
export const LOBULE_FRACTION = 0.2
export const EARLOBE_FRAC = EAR_TOP_FRAC + (EAR_BOTTOM_FRAC - EAR_TOP_FRAC) * (1 - LOBULE_FRACTION / 2)

/**
 * Half-breadth of the head at those heights, in collider radii — again measured off
 * the rendered avatar, which is a little narrower than its own collider (0.87 r at
 * the widest) and tapers toward the jaw.
 */
/**
 * The rendered head's **widest** half-breadth, in collider radii — 0.87, measured
 * with `?probeHead=1` on both bodies.
 *
 * The head collider has to enclose the skull, so its radius is not the head's girth:
 * on the stock body it is 10 cm against a rendered 8.7 cm. Anything that has to
 * *grip* the head — a knit band, a hat's crown opening — has to be sized to this and
 * not to the collider, or its opening comes out wider than the head it is on.
 */
export const HEAD_BREADTH_R = 0.87
export const EAR_X = 0.855
export const LOBE_X = 0.83
/** The ear canal sits a little behind the mid-coronal plane. */
export const EAR_Z = -0.1

const FACE_MATS: Record<FeatureKind, THREE.MeshStandardMaterial> = {
  sclera: new THREE.MeshStandardMaterial({ color: 0xf3efe9, roughness: 0.32, metalness: 0 }),
  iris: new THREE.MeshStandardMaterial({ color: 0x4a3120, roughness: 0.22, metalness: 0 }),
  brow: new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.85, metalness: 0 }),
  nose: new THREE.MeshStandardMaterial({ color: 0xcf9d84, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.0 }),
  lip: new THREE.MeshStandardMaterial({ color: 0xb56660, roughness: 0.45, metalness: 0 })
}

/**
 * The live hair + face rig — one group added to the scene, re-attached to the head
 * each frame. Hairstyles are pre-built and toggled by visibility so switching is free.
 */
export class FaceRig {
  readonly group = new THREE.Group()
  private readonly hairPivot = new THREE.Group()
  private readonly facePivot = new THREE.Group()
  private readonly hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.72, metalness: 0.02 })
  private readonly styleGroups = new Map<Hairstyle, THREE.Group>()
  private style: Hairstyle = 'bald' // no hair by default → the avatar's clean default look

  constructor() {
    this.group.name = 'face-rig'
    this.group.add(this.hairPivot, this.facePivot)
    for (const s of HAIRSTYLES) {
      const g = this.buildHair(s)
      g.visible = s === this.style
      this.styleGroups.set(s, g)
      this.hairPivot.add(g)
    }
    this.buildFace()
    this.facePivot.visible = false // subtle features are opt-in (a clean face by default)
    this.group.traverse((o) => {
      o.castShadow = true
      o.frustumCulled = false
    })
  }

  setHairstyle(style: Hairstyle): void {
    this.style = style
    for (const [s, g] of this.styleGroups) g.visible = s === style
  }
  getHairstyle(): Hairstyle {
    return this.style
  }
  setHairColor(hex: number): void {
    this.hairMat.color.setHex(hex)
  }
  getHairColor(): number {
    return this.hairMat.color.getHex()
  }
  setFaceVisible(on: boolean): void {
    this.facePivot.visible = on
  }
  isFaceVisible(): boolean {
    return this.facePivot.visible
  }
  setEnabled(on: boolean): void {
    this.group.visible = on
  }
  isEnabled(): boolean {
    return this.group.visible
  }

  /** Re-attach the rig to the live head (call each frame). */
  update(colliders: Capsule[]): void {
    if (!this.group.visible || colliders.length < 13) return
    const f = headFrame(colliders)
    const basis = new THREE.Matrix4().makeBasis(f.right, f.up, f.forward)
    for (const pivot of [this.hairPivot, this.facePivot]) {
      pivot.position.copy(f.crown)
      pivot.quaternion.setFromRotationMatrix(basis)
      pivot.scale.setScalar(f.radius)
    }
  }

  // ---- geometry (authored in the unit head frame: origin crown, +y up, +z face) ----

  private buildFace(): void {
    for (const feat of faceFeatureLayout()) {
      const geo =
        feat.kind === 'brow'
          ? new THREE.BoxGeometry(feat.size[0], feat.size[1], feat.size[2])
          : new THREE.SphereGeometry(0.5, 16, 12)
      const m = new THREE.Mesh(geo, FACE_MATS[feat.kind])
      if (feat.kind !== 'brow') m.scale.set(feat.size[0] * 2, feat.size[1] * 2, feat.size[2] * 2)
      m.position.set(feat.pos[0], feat.pos[1], feat.pos[2])
      this.facePivot.add(m)
    }
  }

  private buildHair(style: Hairstyle): THREE.Group {
    const g = new THREE.Group()
    const spec = hairstyleSpec(style)
    // Author against the visible ovoid head (taller than wide, centre ~0.9 below the
    // collider crown). A front azimuthal wedge is cut out so the face is framed open;
    // +z faces front, which is phi = π/2 in three's sphere winding.
    // The scalp is centred on the cranium (~+0.35 above the collider crown) and
    // stretched down (SCALE.y) so a curtain can reach the jaw for the longer styles.
    const POS: [number, number, number] = [0, 0.35, -0.05]
    const SCALE: [number, number, number] = [1.02, 1.68, 1.08]
    const HAIRLINE = Math.PI * 0.63 // full-revolution bowl cap down to here (smooth hairline)
    const GAP = 1.2 // radians of the front opening for the falling curtain (+z front)
    const PHI_START = Math.PI / 2 + GAP / 2
    const PHI_LEN = Math.PI * 2 - GAP
    // How far down the curtain falls (polar angle), by length.
    const curtainEnd = Math.min(Math.PI * 0.99, Math.PI * (0.55 + spec.back * 0.14))

    if (spec.cap) {
      // Bowl/scalp cap — a smooth full revolution to the hairline (no seam), covering
      // the skull + forehead and leaving the face (below) open.
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 48, 28, 0, Math.PI * 2, 0, HAIRLINE),
        this.hairMat
      )
      cap.scale.set(...SCALE)
      cap.position.set(...POS)
      g.add(cap)
      // Longer styles: a curtain that falls behind/beside the face. Its top tucks
      // under the cap (overlap) so there's no visible seam; the front is left open.
      if (spec.back > 0.5) {
        const curtain = new THREE.Mesh(
          new THREE.SphereGeometry(1.12, 48, 40, PHI_START, PHI_LEN, Math.PI * 0.58, curtainEnd - Math.PI * 0.58),
          this.hairMat
        )
        curtain.scale.set(...SCALE)
        curtain.position.set(...POS)
        g.add(curtain)
      }
      // Extra shoulder-length fall for the longest style.
      if (spec.back >= 2.5) {
        const fall = new THREE.Mesh(
          new THREE.CylinderGeometry(1.02, 0.86, 1.4, 40, 1, true, PHI_START, PHI_LEN),
          this.hairMat
        )
        fall.scale.set(SCALE[0], 1, SCALE[2])
        fall.position.set(0, -1.65, -0.12)
        g.add(fall)
      }
    }

    if (spec.afro) {
      // A big round pouf — full revolution (no seam), open below the hairline so the
      // face shows; centred high and back so it frames the head.
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 34, 26, 0, Math.PI * 2, 0, Math.PI * 0.72),
        this.hairMat
      )
      puff.scale.set(1.12, 1.16, 1.12)
      puff.position.set(0, 0.45, -0.12)
      g.add(puff)
    }

    // DoubleSide so the open shells read from every angle.
    this.hairMat.side = THREE.DoubleSide
    return g
  }
}
