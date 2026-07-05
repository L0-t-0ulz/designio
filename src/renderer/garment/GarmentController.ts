import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { BodyCollider } from '../cloth/BodyCollider'
import type { FabricParams } from '../cloth/fabricPresets'
import type { TubeBuild } from '../cloth/Garment'
import { XPBDSolver } from '../cloth/XPBDSolver'
import type { GarmentParams, GarmentType } from './templates'
import { buildGarment } from '../garments/factory'
import { getGarment } from '../garments/registry'

interface Piece {
  geometry: THREE.BufferGeometry
  positions: Float32Array
  mesh: THREE.Mesh
  solver: XPBDSolver
  name: string
  /** Reset this piece's positions to its undraped shape. */
  refill: () => void
}

/**
 * Owns the current garment as one or more simulated pieces (body tube(s) + optional
 * sleeves). All pieces share the studio fabric material + the body colliders.
 */
export class GarmentController {
  private pieces: Piece[] = []
  private gravityY = 9.81
  private windX = 0
  private windZ = 0

  constructor(
    private readonly scene: THREE.Scene,
    private readonly material: THREE.Material,
    private readonly colliders: Capsule[],
    private readonly measurements: Measurements,
    private readonly params: () => FabricParams,
    private readonly bodyCollider: BodyCollider | null = null
  ) {}

  /** (Re)build the garment from its data definition + fit params via the factory. */
  build(type: GarmentType, garmentParams: GarmentParams): void {
    this.dispose()
    const def = getGarment(type)
    for (const p of buildGarment(def, garmentParams, this.measurements, this.colliders)) {
      this.addPiece(p.build, p.refill, p.name)
    }
  }

  private addPiece(build: TubeBuild, fill: (pos: Float32Array) => void, name: string): void {
    const { geometry, positions, nx, ny, pinnedTop } = build
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    this.scene.add(mesh)

    const solver = new XPBDSolver(nx, ny, positions, this.params(), { pinned: pinnedTop, wrapX: true })
    solver.colliders = this.colliders
    solver.bodyCollider = this.bodyCollider
    solver.gravity.set(0, -this.gravityY, 0)
    solver.wind.set(this.windX, 0, this.windZ)
    this.pieces.push({ geometry, positions, mesh, solver, name, refill: () => fill(positions) })
  }

  /** The garment's pieces for the Object Browser (name + mesh; visibility via mesh.visible). */
  getPieces(): { name: string; mesh: THREE.Mesh }[] {
    return this.pieces.map((p) => ({ name: p.name, mesh: p.mesh }))
  }

  setGravity(y: number): void {
    this.gravityY = y
    for (const p of this.pieces) {
      p.solver.gravity.set(0, -y, 0)
      p.solver.wake()
    }
  }

  setWind(x: number, z: number): void {
    this.windX = x
    this.windZ = z
    for (const p of this.pieces) {
      p.solver.wind.set(x, 0, z)
      p.solver.wake()
    }
  }

  step(dt: number): void {
    for (const p of this.pieces) p.solver.step(dt)
  }

  getMeshes(): THREE.Object3D[] {
    return this.pieces.map((p) => p.mesh)
  }

  updateMeshes(): void {
    for (const p of this.pieces) {
      p.geometry.attributes.position.needsUpdate = true
      p.geometry.computeVertexNormals()
    }
  }

  redrape(): void {
    for (const p of this.pieces) {
      p.refill()
      p.solver.reset()
      p.geometry.attributes.position.needsUpdate = true
      p.geometry.computeVertexNormals()
      p.geometry.computeBoundingSphere()
    }
  }

  setFabricPhysics(): void {
    for (const p of this.pieces) p.solver.setFabric(this.params())
    this.redrape()
  }

  clear(): void {
    this.dispose()
  }

  private dispose(): void {
    for (const p of this.pieces) {
      this.scene.remove(p.mesh)
      p.geometry.dispose()
    }
    this.pieces = []
  }
}
