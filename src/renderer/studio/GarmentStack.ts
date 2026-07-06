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
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, type Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { garmentPatternSpecs } from '../garments/factory'
import { pocketPlacements } from '../garments/decor'
import { buildDesignArt, hasArt, printFromSpec, type DesignArt, type Print } from '../start/design'
import { gradeParams, type GarmentLayerData } from './document'

const POCKET_LINE = new THREE.LineBasicMaterial({ color: 0x2c2c33 }) // topstitch outline

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

    if (l.data.pocket) {
      for (const p of pocketPlacements(getGarment(l.data.garmentType), this.measurements)) {
        const geo = new THREE.PlaneGeometry(p.w, p.h)
        const plane = new THREE.Mesh(geo, pocketMat)
        plane.position.set(p.x, p.y, p.z)
        plane.castShadow = true
        plane.receiveShadow = true
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), POCKET_LINE)
        edges.position.set(p.x, p.y, p.z + 0.0015)
        l.decor.add(plane, edges)
      }
    }

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
  }

  rebuild(l: StackLayer): void {
    l.controller.build(l.data.garmentType, gradeParams(l.data))
    this.applyPartMaterials(l)
    this.buildDecor(l)
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
      (name) => fabricToSolverParams(this.pieceFabric(layer, name)),
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

  step(dt: number): void {
    for (const l of this.layers) if (l.data.visible) l.controller.step(dt)
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
