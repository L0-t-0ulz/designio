/**
 * The live stack of garment **layers** worn on one mannequin. Each layer owns its
 * own material, fabric, print and `GarmentController` (its cloth pieces), so many
 * garments simulate + render together. The stack is the runtime twin of the
 * document's `layers[]` — main.ts drives it (add / remove / duplicate / select,
 * edit the active layer) and reads it back for save / export.
 */
import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements, BodyAnchors } from '../avatar/Mannequin'
import type { BodyCollider } from '../cloth/BodyCollider'
import { GarmentController } from '../garment/GarmentController'
import { ClothCollision } from '../cloth/ClothCollision'
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, fabricThickness, interfaceParams, type Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { garmentPatternSpecs } from '../garments/factory'
import { pocketPlacements } from '../garments/decor'
import { buildDesignArt, hasArt, printFromSpec, type DesignArt, type Print } from '../start/design'
import { gradeParams, type GarmentLayerData } from './document'

const POCKET_LINE = new THREE.LineBasicMaterial({ color: 0x2c2c33 }) // topstitch outline
// Shared closure materials (buttons · zip tape · metal pull) — geometry is per-mesh.
// A shell/plastic button — a clearcoat gives the subtle glossy highlight real buttons have.
const CLOSURE_BUTTON = new THREE.MeshPhysicalMaterial({ color: 0x26262c, metalness: 0, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.32, sheen: 0.2 })
const CLOSURE_HOLE = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.85 }) // sew holes
const CLOSURE_THREAD = new THREE.LineBasicMaterial({ color: 0xdedad0 }) // cross-stitch thread
const CLOSURE_ZIP = new THREE.MeshStandardMaterial({ color: 0x1d1d21, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide })
const CLOSURE_METAL = new THREE.MeshStandardMaterial({ color: 0xc2c2ca, metalness: 0.85, roughness: 0.3 })
// A button profile lathed once + shared: a slightly domed disc with a rounded rim + a
// recessed centre well (where the holes sit) — reads far more like a real button than a flat disc.
const BUTTON_PROFILE = (() => {
  const R = 0.0088
  const pts = [
    new THREE.Vector2(0, 0.0016), // centre, recessed
    new THREE.Vector2(R * 0.34, 0.0015),
    new THREE.Vector2(R * 0.42, 0.0024), // inner well wall
    new THREE.Vector2(R * 0.82, 0.0028), // domed face
    new THREE.Vector2(R * 0.97, 0.0022), // rounded rim
    new THREE.Vector2(R, 0.001),
    new THREE.Vector2(R, 0) // edge → back
  ]
  return new THREE.LatheGeometry(pts, 28)
})()

const layerMats = (l: StackLayer): THREE.MeshPhysicalMaterial[] => [
  l.material,
  l.sleeveMaterial,
  l.legMaterial,
  l.trimMaterial,
  l.backMaterial,
  l.legBackMaterial
]
const disposeMats = (l: StackLayer): void => {
  for (const m of layerMats(l)) m.dispose()
  l.lining?.dispose()
}
/** Free the print/design canvas textures (front + back) so they don't leak. */
const disposeDesigns = (l: StackLayer): void => {
  l.design?.texture.dispose()
  l.backDesign?.texture.dispose()
}

export interface StackLayer {
  data: GarmentLayerData
  /** The body/default fabric (parts fall back to it). */
  fabric: Fabric
  /** Body material (the print/logo lives here). */
  material: THREE.MeshPhysicalMaterial
  /** Per-part materials (used only when a part has its own fabric). */
  sleeveMaterial: THREE.MeshPhysicalMaterial
  legMaterial: THREE.MeshPhysicalMaterial
  /** Back-panel materials (used only when a back panel has its own fabric). */
  backMaterial: THREE.MeshPhysicalMaterial
  legBackMaterial: THREE.MeshPhysicalMaterial
  /** Contrast-trim material (collar/cuff/pocket/hem bands) when `data.trim` is on. */
  trimMaterial: THREE.MeshPhysicalMaterial
  /** Inner "lining" material — a darkened shell offset inward for fabric thickness. */
  lining: THREE.MeshPhysicalMaterial | null
  controller: GarmentController
  design: DesignArt | null
  /** The back panel's own albedo (back colour + prints) when a back fabric is set. */
  backDesign: DesignArt | null
  /** Non-simulated decoration (patch pockets + trim bands) parented to the layer. */
  decor: THREE.Group
  /** Placed prints (logos + text) — runtime (images live here). */
  prints: Print[]
}

export interface LayerSummary {
  name: string
  color: number
  visible: boolean
  active: boolean
  pieces: number
}

/** Editable garment parts (piece groups + back panels + trim). */
export type PartId = 'body' | 'sleeves' | 'legs' | 'trim' | 'back' | 'legBack'

/** Which part a simulated piece belongs to, keyed off its mesh name (drives its material + physics). */
export function partForPiece(name: string): 'sleeves' | 'legs' | 'body' {
  if (/sleeve/i.test(name)) return 'sleeves'
  if (/leg/i.test(name)) return 'legs'
  return 'body'
}

/**
 * The fabric id for a back panel, following its fallback chain: a body `back`
 * panel falls back to the body fabric; a `legBack` panel to the `legs` fabric
 * then the body fabric. (Front panels use the piece's own fabric.)
 */
export function panelFabricId(data: GarmentLayerData, panel: 'back' | 'legBack'): string {
  const pf = data.partFabrics
  if (panel === 'back') return pf?.back?.fabricId ?? data.fabricId
  return pf?.legBack?.fabricId ?? pf?.legs?.fabricId ?? data.fabricId
}

export class GarmentStack {
  readonly layers: StackLayer[] = []
  activeIndex = 0
  private gravityY = 9.81
  private windX = 0
  private windZ = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly colliders: Capsule[],
    private readonly measurements: Measurements,
    private readonly bodyCollider: BodyCollider | null,
    private readonly anchors: () => BodyAnchors | null = () => null
  ) {}

  get active(): StackLayer {
    return this.layers[this.activeIndex]
  }
  get size(): number {
    return this.layers.length
  }

  private artInput(l: StackLayer): { color: number; prints: Print[] } {
    return { color: l.data.color, prints: l.prints }
  }

  /** The fabric for a garment part (its override, or the body default). */
  private partFabric(l: StackLayer, part: 'sleeves' | 'legs'): Fabric {
    const pf = l.data.partFabrics?.[part]
    return pf ? { ...getFabric(pf.fabricId), color: pf.color } : l.fabric
  }

  /** The fabric that drives a piece's cloth physics, by piece name (part override, or body). */
  private pieceFabric(l: StackLayer, name: string): Fabric {
    const part = partForPiece(name)
    return part === 'body' ? l.fabric : this.partFabric(l, part)
  }

  /** The current { fabricId, color } for a part (body/trim/sleeves/legs/back/legBack). */
  partData(part: PartId): { fabricId: string; color: number } {
    const d = this.active.data
    if (part === 'body') return { fabricId: d.fabricId, color: d.color }
    if (part === 'trim') return { fabricId: d.trimFabricId ?? d.fabricId, color: d.trimColor ?? d.color }
    // legBack falls back to the legs (front) fabric, then the body default.
    if (part === 'legBack') return d.partFabrics?.legBack ?? d.partFabrics?.legs ?? { fabricId: d.fabricId, color: d.color }
    return d.partFabrics?.[part] ?? { fabricId: d.fabricId, color: d.color }
  }
  /** Assign a fabric and/or colour to a part of the active layer (visual). */
  setPart(part: PartId, opts: { fabricId?: string; color?: number }): void {
    const l = this.active
    const cur = this.partData(part)
    const next = { fabricId: opts.fabricId ?? cur.fabricId, color: opts.color ?? cur.color }
    if (part === 'body') {
      l.data.fabricId = next.fabricId
      l.data.color = next.color
      l.fabric = { ...getFabric(next.fabricId), color: next.color }
    } else if (part === 'trim') {
      l.data.trim = true
      l.data.trimFabricId = next.fabricId
      l.data.trimColor = next.color
    } else {
      ;(l.data.partFabrics ??= {})[part] = next
    }
    // The back panel's base colour changed → rebuild its print canvas in applyLook.
    if (part === 'back' && l.backDesign) {
      l.backDesign.texture.dispose()
      l.backDesign = null
    }
    this.applyLook(l)
    this.buildDecor(l) // trim bands / pocket material depend on trim
    // A piece fabric swap changes drape, so re-derive its physics. Back panels are
    // visual-only (they share the piece's sim), and colour-only edits don't drape.
    if (opts.fabricId && (part === 'body' || part === 'sleeves' || part === 'legs')) l.controller.setFabricPhysics()
  }

  /** The fabric for a back panel (its override, else the piece's front fabric). */
  private panelFabric(l: StackLayer, panel: 'back' | 'legBack'): Fabric {
    const ov = panel === 'back' ? l.data.partFabrics?.back : l.data.partFabrics?.legBack
    if (ov) return { ...getFabric(ov.fabricId), color: ov.color }
    return panel === 'back' ? l.fabric : this.partFabric(l, 'legs')
  }
  /**
   * Assign each piece mesh its material by piece name. When a back panel has its
   * own fabric, the body/leg mesh gets a `[front, back]` material array — the two
   * geometry groups from `finishTube` (front = +z, back = −z). The front keeps the
   * print. Otherwise a single material renders both groups.
   */
  private applyPartMaterials(l: StackLayer): void {
    const hasBack = !!l.data.partFabrics?.back
    const hasLegBack = !!l.data.partFabrics?.legBack
    for (const { name, mesh } of l.controller.getPieces()) {
      const part = partForPiece(name)
      if (part === 'sleeves') mesh.material = l.sleeveMaterial
      else if (part === 'legs') mesh.material = hasLegBack ? [l.legMaterial, l.legBackMaterial] : l.legMaterial
      else mesh.material = hasBack ? [l.material, l.backMaterial] : l.material
    }
  }

  /** (Re)apply a layer's per-part fabric looks + trim + the print to its materials. */
  applyLook(l: StackLayer): void {
    applyFabric(l.material, l.fabric) // body / default
    applyFabric(l.sleeveMaterial, this.partFabric(l, 'sleeves'))
    applyFabric(l.legMaterial, this.partFabric(l, 'legs'))
    applyFabric(l.backMaterial, this.panelFabric(l, 'back'))
    applyFabric(l.legBackMaterial, this.panelFabric(l, 'legBack'))
    const trimFab: Fabric = l.data.trimFabricId
      ? { ...getFabric(l.data.trimFabricId), color: l.data.trimColor ?? 0x1a1a22 }
      : { ...l.fabric, color: l.data.trimColor ?? 0x1a1a22 }
    applyFabric(l.trimMaterial, trimFab)

    const input = this.artInput(l)
    if (hasArt(input)) {
      if (!l.design) l.design = buildDesignArt(input)
      l.material.map = l.design.texture
      l.material.color.set(0xffffff) // the print canvas owns the base colour
      l.design.redraw(input) // fresh input → the base colour tracks a recolour (not stale)
    } else if (l.design) {
      l.material.map = null
      l.design.texture.dispose()
      l.design = null
    }
    // When the back panel has its own fabric it's a separate material/geometry group,
    // so give it its own albedo (the back colour + the same prints) — otherwise a
    // print placed on the back (u>0.5) wouldn't show on the back material.
    if (hasArt(input) && l.data.partFabrics?.back) {
      const backInput = { color: this.panelFabric(l, 'back').color, prints: l.prints }
      if (!l.backDesign) l.backDesign = buildDesignArt(backInput)
      l.backMaterial.map = l.backDesign.texture
      l.backMaterial.color.set(0xffffff)
      l.backDesign.redraw(backInput)
    } else if (l.backDesign) {
      l.backMaterial.map = null
      l.backDesign.texture.dispose()
      l.backDesign = null
    }
    l.material.needsUpdate = true
    l.backMaterial.needsUpdate = true
    this.applyPartMaterials(l)
    this.updateLining(l)
    l.controller.setStitchColor(this.stitchColor(l))
  }

  /**
   * Topstitch thread colour: the contrast trim colour when trim is on, else a tonal
   * **contrast** of the fabric — a lighter thread on dark cloth, a darker thread on
   * light cloth (the classic visible topstitch), desaturated so it stays tasteful.
   */
  private stitchColor(l: StackLayer): number {
    if (l.data.trim) return l.data.trimColor ?? 0x1a1a22
    const hsl = { h: 0, s: 0, l: 0 }
    new THREE.Color(l.fabric.color).getHSL(hsl)
    const tl = hsl.l < 0.5 ? Math.min(1, hsl.l + 0.4) : Math.max(0, hsl.l - 0.4)
    return new THREE.Color().setHSL(hsl.h, hsl.s * 0.55, tl).getHex()
  }

  /** Rebuild a layer's print from scratch (image/text changed) + reapply. */
  refreshDesign(l: StackLayer): void {
    disposeDesigns(l)
    l.design = null
    l.backDesign = null
    this.applyLook(l)
  }

  private applyVisibility(l: StackLayer): void {
    for (const m of l.controller.getMeshes()) m.visible = l.data.visible
    l.decor.visible = l.data.visible
  }

  /** Rebuild a layer's non-sim decoration (patch pockets + contrast-trim bands). */
  private buildDecor(l: StackLayer): void {
    for (const c of l.decor.children) {
      const anyc = c as THREE.Mesh | THREE.LineSegments
      anyc.geometry?.dispose()
    }
    l.decor.clear()
    const trimOn = !!l.data.trim
    const pocketMat = trimOn ? l.trimMaterial : l.material

    if (getGarment(l.data.garmentType).hood) this.buildHood(l)

    if (l.data.pocket) this.buildPocket(l, pocketMat)

    // contrast-trim bands at the hem + neckline (thin rings in the trim material)
    if (trimOn) {
      const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
      const band = (radius: number, y: number): void => {
        const geo = new THREE.TorusGeometry(Math.max(0.03, radius + 0.006), 0.014, 8, 48)
        const ring = new THREE.Mesh(geo, l.trimMaterial)
        ring.rotation.x = Math.PI / 2
        ring.position.set(0, y, 0)
        ring.castShadow = true
        l.decor.add(ring)
      }
      if (spec) {
        band(spec.radiusBottom, spec.bottomY) // hem band
        if (spec.neckline) band(spec.radiusTop * 0.62, (spec.shoulderY ?? spec.topY) - 0.04) // neck band
      }
    }

    if (l.data.closure) this.buildClosure(l)
    if (l.data.collar) this.buildCollar(l)
  }

  /**
   * The collar / lapel library: a shaped collar around the neckline whose form
   * depends on `collarStyle` — a stand (band / mandarin), a folded shirt collar,
   * a flat rounded Peter-Pan, or fold-back notch lapels down a V front. Non-sim
   * decoration in the garment's (or trim) fabric, sized from the neck spec.
   */
  private buildCollar(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const style = l.data.collarStyle ?? 'band'
    const neckR = Math.max(0.05, spec.radiusTop * 0.6)
    const neckY = (spec.shoulderY ?? spec.topY) - 0.02
    const mat = l.data.trim ? l.trimMaterial : l.material
    const add = (geo: THREE.BufferGeometry, y: number, rotX = 0): void => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(0, y, 0)
      m.rotation.x = rotX
      m.castShadow = true
      m.receiveShadow = true
      l.decor.add(m)
    }
    if (style === 'band' || style === 'mandarin') {
      const h = style === 'mandarin' ? 0.06 : 0.038
      const topR = style === 'mandarin' ? neckR * 0.96 : neckR * 1.02
      add(new THREE.CylinderGeometry(topR, neckR * 1.04, h, 40, 1, true), neckY + h / 2)
    } else if (style === 'shirt') {
      const sh = 0.026 // stand height
      add(new THREE.CylinderGeometry(neckR * 1.03, neckR * 1.05, sh, 40, 1, true), neckY + sh / 2)
      add(new THREE.CylinderGeometry(neckR * 1.05, neckR * 1.55, 0.055, 40, 1, true), neckY + sh + 0.018) // flared fold-down
    } else if (style === 'peterpan') {
      add(new THREE.RingGeometry(neckR * 1.02, neckR * 1.95, 44, 1), neckY - 0.005, -Math.PI / 2 + 0.28) // flat, front dips
    } else {
      // notch: fold-back lapels down the V front + a small back stand
      this.buildLapels(l, neckY, mat)
      add(new THREE.CylinderGeometry(neckR * 1.02, neckR * 1.04, 0.03, 40, 1, true, Math.PI * 0.72, Math.PI * 1.56), neckY + 0.015) // back-only stand
    }
  }

  /**
   * The pocket library at each placement: a flat **patch**, a single **welt** or
   * double **jetted** lip (inset slit pockets), a patch + **flap**, or a 3D **bellows**
   * (cargo) box + flap. Non-sim decoration in the garment (or trim) fabric.
   */
  private buildPocket(l: StackLayer, mat: THREE.Material): void {
    const style = l.data.pocketStyle ?? 'patch'
    const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number): void => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, y, z)
      m.castShadow = true
      m.receiveShadow = true
      l.decor.add(m)
    }
    const stitch = (geo: THREE.BufferGeometry, x: number, y: number, z: number): void => {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), POCKET_LINE)
      e.position.set(x, y, z)
      l.decor.add(e)
    }
    for (const p of pocketPlacements(getGarment(l.data.garmentType), this.measurements)) {
      if (style === 'welt' || style === 'jetted') {
        const lipH = style === 'jetted' ? 0.007 : 0.014
        const oy = p.y + p.h * 0.2
        const top = new THREE.PlaneGeometry(p.w, lipH)
        add(top, p.x, oy, p.z + 0.001)
        stitch(top, p.x, oy, p.z + 0.0025)
        if (style === 'jetted') {
          const bot = new THREE.PlaneGeometry(p.w, lipH)
          add(bot, p.x, oy - lipH - 0.006, p.z + 0.001)
          stitch(bot, p.x, oy - lipH - 0.006, p.z + 0.0025)
        }
      } else {
        const bellows = style === 'bellows'
        const body = bellows ? new THREE.BoxGeometry(p.w, p.h, 0.022) : new THREE.PlaneGeometry(p.w, p.h)
        const bz = bellows ? p.z + 0.011 : p.z
        add(body, p.x, p.y, bz)
        stitch(body, p.x, p.y, bz + 0.0015)
        if (style === 'flap' || bellows) {
          const flapH = p.h * 0.4
          const flap = new THREE.PlaneGeometry(p.w * 1.04, flapH)
          const fy = p.y + p.h / 2 - flapH / 2 + 0.006
          const fz = bellows ? p.z + 0.023 : p.z + 0.003
          add(flap, p.x, fy, fz)
          stitch(flap, p.x, fy, fz + 0.0015)
        }
      }
    }
  }

  /** Two flat fold-back lapels forming a V/notch down the chest (jacket front). */
  private buildLapels(l: StackLayer, neckY: number, mat: THREE.Material): void {
    const m = this.measurements
    const fz = m.chestR + 0.014 // sit proud of the draped jacket front
    for (const s of [-1, 1]) {
      const p = [
        s * 0.02, neckY + 0.02, fz, // top inner (near centre-front neck)
        s * m.chestR * 0.95, neckY - 0.01, fz - 0.012, // top outer (shoulder side)
        s * m.chestR * 0.72, m.chestY, fz, // bottom outer
        s * 0.03, m.chestY + 0.04, fz + 0.008 // bottom inner (toward centre front)
      ]
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
      geo.setIndex([0, 1, 2, 0, 2, 3])
      geo.computeVertexNormals()
      const lapel = new THREE.Mesh(geo, mat)
      lapel.castShadow = true
      lapel.receiveShadow = true
      l.decor.add(lapel)
    }
  }

  /**
   * A real front closure: a centre-front placket that hugs the garment front (a
   * curved ribbon following the tube radius), with either a **column of buttons**
   * or a **zip tape + metal pull** (chosen by the garment's `closureStyle`). Non-sim
   * decoration, sized/placed from the garment's tube spec so it fits any figure/size.
   */
  private buildClosure(l: StackLayer): void {
    const spec = garmentPatternSpecs(getGarment(l.data.garmentType), gradeParams(l.data), this.measurements, this.colliders).body[0]
    if (!spec) return
    const style = getGarment(l.data.garmentType).closureStyle ?? 'button'
    const yTop = (spec.shoulderY ?? spec.topY) - (spec.neckline ? 0.1 : 0.04)
    const yBot = spec.bottomY + 0.015
    if (yTop - yBot < 0.06) return
    const rTop = spec.radiusTop
    const rBot = spec.radiusBottom
    const frontZ = (y: number): number => {
      const t = THREE.MathUtils.clamp((y - yBot) / (yTop - yBot), 0, 1)
      return rBot + (rTop - rBot) * t + 0.011 // sit proud of the draped front surface
    }
    // Curved placket ribbon down the centre front (hugs the front bulge).
    const hw = (style === 'zip' ? 0.022 : 0.034) / 2
    const segs = 12
    const pos: number[] = []
    const idx: number[] = []
    for (let i = 0; i <= segs; i++) {
      const y = yBot + ((yTop - yBot) * i) / segs
      const z = frontZ(y)
      pos.push(-hw, y, z, hw, y, z)
      if (i < segs) {
        const a = i * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const bandGeo = new THREE.BufferGeometry()
    bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    bandGeo.setIndex(idx)
    bandGeo.computeVertexNormals()
    const band = new THREE.Mesh(bandGeo, style === 'zip' ? CLOSURE_ZIP : l.data.trim ? l.trimMaterial : l.material)
    band.castShadow = true
    band.receiveShadow = true
    l.decor.add(band)
    if (style === 'zip') {
      const py = yTop - 0.035
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.022, 0.005), CLOSURE_METAL)
      pull.position.set(0, py, frontZ(py) + 0.006)
      pull.castShadow = true
      l.decor.add(pull)
    } else {
      const n = Math.max(3, Math.round((yTop - yBot) / 0.085))
      for (let i = 0; i < n; i++) {
        const y = yBot + ((yTop - yBot) * (i + 0.5)) / n
        const faceZ = frontZ(y) + 0.006
        // domed shell button body (clone the shared lathe so per-rebuild disposal is safe)
        const btn = new THREE.Mesh(BUTTON_PROFILE.clone(), CLOSURE_BUTTON)
        btn.rotation.x = Math.PI / 2 // domed face toward the front (+z)
        btn.position.set(0, y, faceZ)
        btn.castShadow = true
        btn.receiveShadow = true
        l.decor.add(btn)
        // four sew holes in the recessed centre well + a cross-stitch thread
        const off = 0.0024
        const holeZ = faceZ + 0.0016
        for (const [hx, hy] of [[-off, off], [off, off], [-off, -off], [off, -off]] as [number, number][]) {
          const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, 0.0012, 8), CLOSURE_HOLE)
          hole.rotation.x = Math.PI / 2
          hole.position.set(hx, y + hy, holeZ)
          l.decor.add(hole)
        }
        const tz = holeZ + 0.0007
        const thread = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-off, y + off, tz), new THREE.Vector3(off, y - off, tz),
          new THREE.Vector3(off, y + off, tz), new THREE.Vector3(-off, y - off, tz)
        ])
        l.decor.add(new THREE.LineSegments(thread, CLOSURE_THREAD))
      }
    }
  }

  /**
   * A real fallen-back hood: a draped cowl behind the neck. Built from the belly
   * band of a sphere (poles trimmed) covering ~230° around the back, elongated
   * vertically so it hangs down the upper back. Positioned + sized from the body
   * so it fits any figure/size. Non-sim decoration in the garment's own fabric.
   */
  private buildHood(l: StackLayer): void {
    const m = this.measurements
    const hr = m.chestR * 1.05 // cowl radius — a touch wider than the neck
    const geo = new THREE.SphereGeometry(hr, 28, 20, Math.PI * 0.86, Math.PI * 1.28, Math.PI * 0.14, Math.PI * 0.74)
    geo.scale(1, 1.35, 0.92) // taller drape, slightly flattened front-to-back
    const hood = new THREE.Mesh(geo, l.material)
    hood.position.set(0, m.shoulderY - hr * 0.18, -m.chestR * 0.5)
    hood.castShadow = true
    hood.receiveShadow = true
    l.decor.add(hood)
  }

  /**
   * A material for the inner "lining" shell: a darkened copy of the fabric look,
   * pushed **inward along the normal** by the fabric's physical thickness in the
   * vertex shader. Paired with the (double-sided) outer surface, this gives every
   * garment real thickness so hems/necklines/openings don't read paper-thin. The
   * push distance is a uniform kept on `userData` so it can be re-tuned in place.
   */
  private makeLiningMaterial(thickness: number): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({ metalness: 0, side: THREE.DoubleSide, envMapIntensity: 1.0 })
    const uThickness = { value: thickness }
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uThickness = uThickness
      shader.vertexShader = 'uniform float uThickness;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed -= objectNormal * uThickness;'
      )
    }
    mat.userData.uThickness = uThickness
    return mat
  }

  /**
   * (Re)build the fabric-thickness lining: keep one lining material per layer whose
   * look tracks the body fabric (darkened for an inside shadow), and attach it as a
   * child shell to every simulated piece mesh (sharing the live geometry, so it
   * follows the sim for free). Idempotent — pieces created by `rebuild` get a shell;
   * `applyLook` just re-syncs the material in place (no shader recompile).
   */
  private updateLining(l: StackLayer): void {
    // Sheer fabrics (chiffon/organza) stay see-through — an opaque inner shell would
    // kill the translucency, and they're thin + floaty anyway. Drop any lining shells.
    if (l.fabric.transmission > 0.25) {
      for (const { mesh } of l.controller.getPieces()) {
        for (const c of mesh.children.filter((ch) => ch.userData.lining)) mesh.remove(c)
      }
      return
    }
    // A real lining reads thicker at the openings (so the contrast layer shows).
    const lined = !!l.data.lined
    const thickness = fabricThickness(l.fabric) * (lined ? 1.7 : 1)
    if (!l.lining) l.lining = this.makeLiningMaterial(thickness)
    const lm = l.lining
    if (lined) {
      // a satiny contrast lining fabric (complementary hue, lighter) shown inside
      const hsl = { h: 0, s: 0, l: 0 }
      new THREE.Color(l.fabric.color).getHSL(hsl)
      lm.color.setHSL((hsl.h + 0.5) % 1, Math.min(1, hsl.s + 0.12), Math.min(0.82, hsl.l + 0.22))
      lm.roughness = 0.26
      lm.sheen = 0.95
      lm.sheenRoughness = 0.34
      lm.sheenColor = new THREE.Color(0xffffff)
      lm.normalMap = null
    } else {
      lm.color.copy(l.material.color).multiplyScalar(0.8) // darker "inside" (plain thickness)
      lm.roughness = Math.min(1, l.material.roughness + 0.06)
      lm.sheen = l.material.sheen * 0.6
      lm.sheenRoughness = l.material.sheenRoughness
      lm.normalMap = l.material.normalMap
      lm.normalScale.copy(l.material.normalScale)
    }
    lm.needsUpdate = true
    ;(lm.userData.uThickness as { value: number }).value = thickness
    for (const { mesh } of l.controller.getPieces()) {
      if (mesh.children.some((c) => c.userData.lining)) continue
      const shell = new THREE.Mesh(mesh.geometry, lm)
      shell.userData.lining = true
      shell.castShadow = false
      shell.receiveShadow = true
      mesh.add(shell)
    }
  }

  rebuild(l: StackLayer): void {
    l.controller.build(l.data.garmentType, gradeParams(l.data))
    this.applyPartMaterials(l)
    this.buildDecor(l)
    this.updateLining(l)
    this.applyVisibility(l)
  }
  rebuildAll(): void {
    for (const l of this.layers) this.rebuild(l)
  }

  addLayer(data: GarmentLayerData, makeActive = true): StackLayer {
    const fabric: Fabric = { ...getFabric(data.fabricId), color: data.color }
    const material = createFabricMaterial(fabric)
    const controller = new GarmentController(
      this.scene,
      material,
      this.colliders,
      this.measurements,
      (name) => {
        const p = fabricToSolverParams(this.pieceFabric(layer, name))
        return layer.data.interfaced ? interfaceParams(p) : p
      },
      this.bodyCollider,
      this.anchors
    )
    const decor = new THREE.Group()
    this.scene.add(decor)
    const layer: StackLayer = {
      data,
      fabric,
      material,
      sleeveMaterial: createFabricMaterial(fabric),
      legMaterial: createFabricMaterial(fabric),
      backMaterial: createFabricMaterial(fabric),
      legBackMaterial: createFabricMaterial(fabric),
      trimMaterial: createFabricMaterial(fabric),
      lining: null,
      controller,
      design: null,
      backDesign: null,
      decor,
      prints: (data.prints ?? []).map(printFromSpec)
    }
    this.layers.push(layer)
    if (makeActive) this.activeIndex = this.layers.length - 1
    controller.setGravity(this.gravityY)
    controller.setWind(this.windX, this.windZ)
    this.rebuild(layer)
    this.applyLook(layer)
    return layer
  }

  select(i: number): void {
    this.activeIndex = Math.max(0, Math.min(this.layers.length - 1, i))
  }

  private disposeDecor(l: StackLayer): void {
    for (const c of l.decor.children) (c as THREE.Mesh).geometry?.dispose()
    l.decor.clear()
    this.scene.remove(l.decor)
  }

  removeActive(): void {
    if (this.layers.length <= 1) return // always keep at least one garment
    const [l] = this.layers.splice(this.activeIndex, 1)
    l.controller.clear()
    disposeMats(l)
    disposeDesigns(l)
    this.disposeDecor(l)
    this.activeIndex = Math.min(this.activeIndex, this.layers.length - 1)
  }

  toggleVisible(i: number): void {
    const l = this.layers[i]
    l.data.visible = !l.data.visible
    this.applyVisibility(l)
  }

  /** Hide every layer's meshes (entering Pattern mode); `rebuildAll` restores them. */
  hideAll(): void {
    for (const l of this.layers) {
      for (const m of l.controller.getMeshes()) m.visible = false
      l.decor.visible = false
    }
  }

  private readonly collision = new ClothCollision()
  step(dt: number): void {
    for (const l of this.layers) if (l.data.visible) l.controller.step(dt)
    // Global cloth self / inter collision over every visible garment (layered outfits
    // push off each other; a garment doesn't pass through itself).
    this.collision.resolve(this.layers.flatMap((l) => (l.data.visible ? l.controller.simPieces() : [])))
  }
  updateMeshes(): void {
    for (const l of this.layers) if (l.data.visible) l.controller.updateMeshes()
  }
  redrapeAll(): void {
    for (const l of this.layers) l.controller.redrape()
  }
  redrapeActive(): void {
    this.active.controller.redrape()
  }

  setGravity(y: number): void {
    this.gravityY = y
    for (const l of this.layers) l.controller.setGravity(y)
  }
  setWind(x: number, z: number): void {
    this.windX = x
    this.windZ = z
    for (const l of this.layers) l.controller.setWind(x, z)
  }
  setActivePhysics(): void {
    this.active.controller.setFabricPhysics()
  }
  setWireframe(on: boolean): void {
    for (const l of this.layers) for (const m of layerMats(l)) m.wireframe = on
  }
  get wireframe(): boolean {
    return this.layers.some((l) => l.material.wireframe)
  }

  getMeshesAll(): THREE.Object3D[] {
    return this.layers.flatMap((l) => l.controller.getMeshes())
  }

  /** Rows for the Object Browser (one per garment layer). */
  list(): LayerSummary[] {
    return this.layers.map((l, i) => ({
      name: getGarment(l.data.garmentType).name,
      color: l.data.color,
      visible: l.data.visible,
      active: i === this.activeIndex,
      pieces: l.controller.getPieces().length
    }))
  }

  clear(): void {
    for (const l of this.layers) {
      l.controller.clear()
      disposeMats(l)
      disposeDesigns(l)
      this.disposeDecor(l)
    }
    this.layers.length = 0
    this.activeIndex = 0
  }

  toData(): GarmentLayerData[] {
    return this.layers.map((l) => ({ ...l.data }))
  }
}
