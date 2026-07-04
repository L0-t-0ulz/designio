import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { FabricParams } from '../cloth/fabricPresets'
import type { ClothWorld } from '../cloth/ClothWorld'
import { buildSewnTop, type PatternParams } from './pattern'

/**
 * Owns the sewn-pattern garment: two flat panels stitched around the body into a
 * top (a `ClothWorld`). Parallel to `GarmentController` but for the pattern → sew
 * → drape workflow. Active only in "Pattern" mode.
 */
export class PatternController {
  private world?: ClothWorld
  private meshes: THREE.Mesh[] = []
  private geometries: THREE.BufferGeometry[] = []
  private initial: Float32Array = new Float32Array(0)
  private gravityY = 9.81
  private windX = 0
  private windZ = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly material: THREE.Material,
    private readonly colliders: Capsule[],
    private readonly params: () => FabricParams
  ) {}

  /** Build (or rebuild) the sewn garment from pattern params, and show it. */
  build(p: PatternParams): void {
    this.clear()
    const sewn = buildSewnTop(p, this.params())
    this.world = sewn.world
    this.world.colliders = this.colliders
    this.world.gravity.set(0, -this.gravityY, 0)
    this.world.wind.set(this.windX, 0, this.windZ)
    this.geometries = sewn.geometries
    this.initial = sewn.initial
    for (const geo of this.geometries) {
      const mesh = new THREE.Mesh(geo, this.material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      this.scene.add(mesh)
      this.meshes.push(mesh)
    }
  }

  step(dt: number): void {
    this.world?.step(dt)
  }

  updateMeshes(): void {
    for (const geo of this.geometries) {
      geo.attributes.position.needsUpdate = true
      geo.computeVertexNormals()
    }
  }

  /** Re-run the sew simulation from the arranged (unsewn) layout. */
  resew(): void {
    if (!this.world) return
    this.world.reset(this.initial)
    this.updateMeshes()
  }

  setFabricPhysics(): void {
    this.world?.setFabric(this.params())
    this.resew()
  }

  setGravity(y: number): void {
    this.gravityY = y
    this.world?.gravity.set(0, -y, 0)
  }

  setWind(x: number, z: number): void {
    this.windX = x
    this.windZ = z
    this.world?.wind.set(x, 0, z)
  }

  clear(): void {
    for (const mesh of this.meshes) this.scene.remove(mesh)
    for (const geo of this.geometries) geo.dispose()
    this.meshes = []
    this.geometries = []
    this.world = undefined
  }
}
