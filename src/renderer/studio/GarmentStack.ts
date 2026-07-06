/**
 * The live stack of garment **layers** worn on one mannequin. Each layer owns its
 * own material, fabric, print and `GarmentController` (its cloth pieces), so many
 * garments simulate + render together. The stack is the runtime twin of the
 * document's `layers[]` — main.ts drives it (add / remove / duplicate / select,
 * edit the active layer) and reads it back for save / export.
 */
import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { BodyCollider } from '../cloth/BodyCollider'
import { GarmentController } from '../garment/GarmentController'
import { createFabricMaterial, applyFabric } from '../cloth/FabricMaterial'
import { getFabric, fabricToSolverParams, type Fabric } from '../fabric/FabricLibrary'
import { getGarment } from '../garments/registry'
import { pocketPlacements } from '../garments/decor'
import { buildDesignArt, hasArt, type DesignArt } from '../start/design'
import { gradeParams, type GarmentLayerData } from './document'

const TEXT_COLOR = 0x1a1a22
const POCKET_LINE = new THREE.LineBasicMaterial({ color: 0x2c2c33 }) // topstitch outline

export interface StackLayer {
  data: GarmentLayerData
  fabric: Fabric
  material: THREE.MeshPhysicalMaterial
  controller: GarmentController
  design: DesignArt | null
  /** Non-simulated decoration (patch pockets) parented to the layer. */
  decor: THREE.Group
  /** Uploaded PNG (runtime-only; not serialised into `.dio`). */
  image: HTMLImageElement | null
  imageName: string | null
}

export interface LayerSummary {
  name: string
  color: number
  visible: boolean
  active: boolean
  pieces: number
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
    private readonly bodyCollider: BodyCollider | null
  ) {}

  get active(): StackLayer {
    return this.layers[this.activeIndex]
  }
  get size(): number {
    return this.layers.length
  }

  private artInput(l: StackLayer): {
    color: number
    image: HTMLImageElement | null
    imageScale: number
    text: string
    textColor: number
  } {
    return { color: l.data.color, image: l.image, imageScale: l.data.imageScale, text: l.data.text, textColor: TEXT_COLOR }
  }

  /** (Re)apply a layer's fabric look + optional print to its material. */
  applyLook(l: StackLayer): void {
    applyFabric(l.material, l.fabric)
    const input = this.artInput(l)
    if (hasArt(input)) {
      if (!l.design) l.design = buildDesignArt(input)
      l.material.map = l.design.texture
      l.material.color.set(0xffffff) // the print canvas owns the base colour
      l.design.redraw()
    } else if (l.design) {
      l.material.map = null
      l.design = null
    }
    l.material.needsUpdate = true
  }

  /** Rebuild a layer's print from scratch (image/text changed) + reapply. */
  refreshDesign(l: StackLayer): void {
    l.design = null
    this.applyLook(l)
  }

  private applyVisibility(l: StackLayer): void {
    for (const m of l.controller.getMeshes()) m.visible = l.data.visible
    l.decor.visible = l.data.visible
  }

  /** Rebuild a layer's non-sim decoration (patch pockets) from its data. */
  private buildDecor(l: StackLayer): void {
    for (const c of l.decor.children) {
      const anyc = c as THREE.Mesh | THREE.LineSegments
      anyc.geometry?.dispose()
    }
    l.decor.clear()
    if (!l.data.pocket) return
    for (const p of pocketPlacements(getGarment(l.data.garmentType), this.measurements)) {
      const geo = new THREE.PlaneGeometry(p.w, p.h)
      const plane = new THREE.Mesh(geo, l.material)
      plane.position.set(p.x, p.y, p.z)
      plane.castShadow = true
      plane.receiveShadow = true
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), POCKET_LINE)
      edges.position.set(p.x, p.y, p.z + 0.0015)
      l.decor.add(plane, edges)
    }
  }

  rebuild(l: StackLayer): void {
    l.controller.build(l.data.garmentType, gradeParams(l.data))
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
      () => fabricToSolverParams(fabric),
      this.bodyCollider
    )
    const decor = new THREE.Group()
    this.scene.add(decor)
    const layer: StackLayer = { data, fabric, material, controller, design: null, decor, image: null, imageName: null }
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
    l.material.dispose()
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
    for (const l of this.layers) l.material.wireframe = on
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
      l.material.dispose()
      this.disposeDecor(l)
    }
    this.layers.length = 0
    this.activeIndex = 0
  }

  toData(): GarmentLayerData[] {
    return this.layers.map((l) => ({ ...l.data }))
  }
}
