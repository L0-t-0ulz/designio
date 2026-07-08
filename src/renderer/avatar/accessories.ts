import * as THREE from 'three'
import type { Capsule } from './colliders'

/**
 * A small **accessories library** — footwear, a belt, a hat and a bag — that attach
 * to the avatar's live body capsules and follow it (walk / pose / resize). They're
 * rigid non-sim meshes layered over the garments (a belt cinches at the waist, a hat
 * sits on the head). Attach points come from the colliders, so both the procedural
 * and GLB avatars work. The anchor math is pure (unit-tested); the geometry is built
 * in the renderer.
 */
export type AccessoryKind = 'shoes' | 'belt' | 'hat' | 'bag'
export const ACCESSORY_KINDS: AccessoryKind[] = ['shoes', 'belt', 'hat', 'bag']

export interface AccessoryAnchors {
  headTop: THREE.Vector3
  headR: number
  waist: THREE.Vector3
  waistR: number
  footL: THREE.Vector3
  footR: THREE.Vector3
  handL: THREE.Vector3
}

/** Key attach points (world) derived from the live body capsules. Pure. */
export function accessoryAnchors(c: Capsule[]): AccessoryAnchors {
  const head = c[0] // head capsule (b = crown)
  const torso = c[2] // torso (a = waist, b = upper chest)
  const hip = c[4] // hip line (a…b across the hips)
  const legL = c[8] // left lower leg (b = foot)
  const legR = c[12] // right lower leg (b = foot)
  const foreL = c[6] // left forearm (b = hand)
  const hipCenter = hip.a.clone().add(hip.b).multiplyScalar(0.5)
  return {
    headTop: head.b.clone(),
    headR: head.radius,
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
    this.items.push(this.buildShoes(), this.buildBelt(), this.buildHat(), this.buildBag())
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
}
