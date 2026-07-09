import * as THREE from 'three'
import type { Capsule } from './colliders'
import { headFrame } from './face'

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
export type AccessoryKind = 'shoes' | 'belt' | 'hat' | 'bag' | 'beanie' | 'cap' | 'bucket' | 'balaclava' | 'scarf' | 'gaiter'
export const ACCESSORY_KINDS: AccessoryKind[] = ['shoes', 'belt', 'hat', 'bag', 'beanie', 'cap', 'bucket', 'balaclava', 'scarf', 'gaiter']

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
}

/** Key attach points (world) derived from the live body capsules. Pure. */
export function accessoryAnchors(c: Capsule[]): AccessoryAnchors {
  const head = c[0] // head capsule (b = crown)
  const neckCap = c[1] // neck capsule (a…b along the neck)
  const torso = c[2] // torso (a = waist, b = upper chest)
  const hip = c[4] // hip line (a…b across the hips)
  const legL = c[8] // left lower leg (b = foot)
  const legR = c[12] // right lower leg (b = foot)
  const foreL = c[6] // left forearm (b = hand)
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
    footL: legL.b.clone(),
    footR: legR.b.clone(),
    handL: foreL.b.clone()
  }
}

const LEATHER = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.55, metalness: 0.05 })
const METAL = new THREE.MeshStandardMaterial({ color: 0xc9b477, roughness: 0.3, metalness: 0.9 })
const FELT = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.85, metalness: 0 })
const knit = (color: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
const felt = (color: number): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, side: THREE.DoubleSide })

const TAU = Math.PI * 2
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
      this.buildShoes(),
      this.buildBelt(),
      this.buildHat(),
      this.buildBag(),
      this.buildBeanie(),
      this.buildCap(),
      this.buildBucket(),
      this.buildBalaclava(),
      this.buildScarf(),
      this.buildGaiter()
    )
    for (const it of this.items) {
      it.obj.visible = false
      it.obj.traverse((o) => {
        o.castShadow = true
        o.frustumCulled = false
      })
      this.group.add(it.obj)
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
  update(colliders: Capsule[]): void {
    if (!this.items.some((i) => i.obj.visible) || colliders.length < 13) return
    const a = accessoryAnchors(colliders)
    for (const it of this.items) if (it.obj.visible) it.place(a)
  }

  private buildShoes(): Item {
    const shoe = (): THREE.Mesh => {
      const g = new THREE.BoxGeometry(0.1, 0.06, 0.26)
      g.translate(0, 0, 0.05) // toe forward of the ankle
      return new THREE.Mesh(g, LEATHER)
    }
    const l = shoe()
    const r = shoe()
    const obj = new THREE.Group()
    obj.add(l, r)
    return {
      kind: 'shoes',
      obj,
      place: (a) => {
        l.position.set(a.footL.x, Math.max(0.03, a.footL.y) - 0.02, a.footL.z)
        r.position.set(a.footR.x, Math.max(0.03, a.footR.y) - 0.02, a.footR.z)
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
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.02, 32), FELT)
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 1, 32), FELT)
    const obj = new THREE.Group()
    obj.add(brim, crown)
    return {
      kind: 'hat',
      obj,
      place: (a) => {
        const r = a.headR
        obj.position.set(a.headTop.x, a.headTop.y - r * 0.3, a.headTop.z)
        brim.scale.set(r * 2.3, 1, r * 2.3)
        const crownH = r * 1.5
        crown.scale.set(r * 2.3, crownH, r * 2.3)
        crown.position.y = crownH / 2
      }
    }
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

  private buildCap(): Item {
    const mat = felt(0x24304a)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.04, 24, 18, 0, TAU, 0, Math.PI * 0.56), mat)
    dome.position.y = HC
    // a curved bill projecting past the face (must clear the head sphere, z>1), angled down
    const bill = new THREE.Mesh(new THREE.CircleGeometry(1.15, 22, 0, Math.PI), mat)
    bill.rotation.set(Math.PI / 2 + 0.32, 0, 0)
    bill.position.set(0, HC - 0.1, 0.98)
    bill.scale.set(1, 0.9, 1)
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat)
    btn.position.y = HC + 1.04
    const obj = new THREE.Group()
    obj.add(dome, bill, btn)
    return this.headItem('cap', obj)
  }

  private buildBucket(): Item {
    const mat = felt(0x5c5f38)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 16, 0, TAU, 0, Math.PI * 0.5), mat)
    dome.position.y = HC
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 1.5, 0.26, 32, 1, true), mat)
    brim.position.y = HC - 0.16 // flares down-and-out from the dome base
    const obj = new THREE.Group()
    obj.add(dome, brim)
    return this.headItem('bucket', obj)
  }

  private buildBalaclava(): Item {
    const mat = knit(0x1b1e25)
    // a tall ovoid shell covering the cranium down past the jaw to the neck base
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1.12, 28, 26, 0, TAU, 0, Math.PI * 0.98), mat)
    shell.position.y = -0.3
    shell.scale.set(1.02, 1.5, 1.06)
    // face-opening cue: a darker recessed oval on the front (a real cut-out is a cloth-sim card)
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 22), new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.9 }))
    face.scale.set(0.9, 0.74, 1)
    face.position.set(0, -0.25, 1.12)
    const obj = new THREE.Group()
    obj.add(shell, face)
    return this.headItem('balaclava', obj)
  }

  private buildScarf(): Item {
    const mat = new THREE.MeshStandardMaterial({ color: 0x7a2233, roughness: 0.7, metalness: 0, side: THREE.DoubleSide })
    // wide enough to wrap *over* the garment neckline (neckR is thin), sitting toward the jaw
    const loop = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.85, 12, 28), mat)
    loop.rotation.x = Math.PI / 2
    loop.position.y = 0.4
    const tail = (x: number): THREE.Mesh => {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.1, 5.2, 0.25), mat)
      t.position.set(x, -2.4, 2.0)
      return t
    }
    const obj = new THREE.Group()
    obj.add(loop, tail(-0.7), tail(0.7))
    return this.neckItem('scarf', obj)
  }

  private buildGaiter(): Item {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 4.4, 24, 1, true), knit(0x565c67))
    tube.position.y = 0.3
    const obj = new THREE.Group()
    obj.add(tube)
    return this.neckItem('gaiter', obj)
  }
}
