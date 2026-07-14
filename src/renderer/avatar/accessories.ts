import * as THREE from 'three'
import type { Capsule } from './colliders'
import { brimProfile, DEFAULT_BRIM, type BrimParams } from './brim'
import { crownDrop, DEFAULT_CROWN, type CrownStyle } from './crown'
import { bandProfile, braidY, trimAnchor, BAND_COLORS, DEFAULT_HAT_BAND, type HatBandParams } from './hatBand'
import { billCurl, DEFAULT_CAP_BILL, type CapBillParams } from './capBill'
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
export type AccessoryKind = 'shoes' | 'belt' | 'hat' | 'bag' | 'beanie' | 'cap' | 'bucket' | 'balaclava' | 'scarf' | 'gaiter' | 'beret' | 'sunhat' | 'goggles' | 'necklace' | 'hoops'
export const ACCESSORY_KINDS: AccessoryKind[] = ['shoes', 'belt', 'hat', 'bag', 'beanie', 'cap', 'bucket', 'balaclava', 'scarf', 'gaiter', 'beret', 'sunhat', 'goggles', 'necklace', 'hoops']

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
      this.buildBeret(),
      this.buildSunHat(),
      this.buildBag(),
      this.buildBeanie(),
      this.buildCap(),
      this.buildBucket(),
      this.buildBalaclava(),
      this.buildGoggles(),
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
  update(colliders: Capsule[]): void {
    if (!this.items.some((i) => i.obj.visible) || colliders.length < 13) return
    const a = accessoryAnchors(colliders)
    for (const it of this.items) if (it.obj.visible) it.place(a)
  }

  private buildShoes(): Item {
    // a real shoe: a flat sole + a rounded instep/heel + a toe cap (not a flat slab)
    const shoe = (): THREE.Group => {
      const g = new THREE.Group()
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.028, 0.27), LEATHER)
      sole.position.set(0, -0.012, 0.05)
      const instep = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), LEATHER)
      instep.scale.set(0.82, 1.05, 1.7) // domed over the heel + instep
      instep.position.set(0, 0.012, -0.005)
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), LEATHER)
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

  /** The cap bill designer — re-shape the visor (+ underbill/squatchee) in place. */
  setCapBill(p: Partial<CapBillParams>): void {
    this.bill = { ...this.bill, ...p }
    const it = this.items.find((i) => i.kind === 'cap')
    const holder = it?.obj.getObjectByName('bill-holder') as THREE.Group | undefined
    if (!it || !holder) return
    for (const child of [...holder.children]) {
      ;(child as THREE.Mesh).geometry?.dispose()
      holder.remove(child)
    }
    this.addBillMeshes(holder, holder.userData.mat as THREE.Material)
    const sq = it.obj.getObjectByName('squatchee')
    if (sq) sq.visible = this.bill.squatchee
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

  private buildCap(): Item {
    const mat = felt(0x24304a)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.04, 24, 18, 0, TAU, 0, Math.PI * 0.56), mat)
    dome.position.y = HC
    const holder = new THREE.Group()
    holder.name = 'bill-holder'
    holder.userData.mat = mat
    this.addBillMeshes(holder, mat)
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mat)
    btn.name = 'squatchee'
    btn.position.y = HC + 1.04
    btn.visible = this.bill.squatchee
    const obj = new THREE.Group()
    obj.add(dome, holder, btn)
    return this.headItem('cap', obj)
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

  private buildSunHat(): Item {
    const mat = felt(0xd9c08e) // straw
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

  private buildHoops(): Item {
    // gold hoops hanging from the earlobes, facing sideways
    const obj = new THREE.Group()
    for (const side of [-1, 1]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 10, 24), METAL)
      hoop.rotation.y = Math.PI / 2
      hoop.position.set(side * 1.02, HC - 1.05, 0.05)
      obj.add(hoop)
    }
    return this.headItem('hoops', obj)
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
