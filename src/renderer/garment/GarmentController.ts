import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements, BodyAnchors } from '../avatar/Mannequin'
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
  /** Average height of the pinned top ring — picks the torso vs hip body anchor. */
  pinnedY: number
  anchorKind: 'torso' | 'hip'
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
    private readonly params: (pieceName: string) => FabricParams,
    private readonly bodyCollider: BodyCollider | null = null,
    private readonly anchors: () => BodyAnchors | null = () => null
  ) {}

  /** (Re)build the garment from its data definition + fit params via the factory. */
  build(type: GarmentType, garmentParams: GarmentParams): void {
    this.dispose()
    const def = getGarment(type)
    for (const p of buildGarment(def, garmentParams, this.measurements, this.colliders)) {
      this.addPiece(p.build, p.refill, p.name)
    }
    this.bindPinsToBody() // hang each piece from the body so it follows animation
  }

  private addPiece(build: TubeBuild, fill: (pos: Float32Array) => void, name: string): void {
    const { geometry, positions, nx, ny, pinnedTop } = build
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    this.scene.add(mesh)

    const solver = new XPBDSolver(nx, ny, positions, this.params(name), { pinned: pinnedTop, wrapX: true })
    solver.colliders = this.colliders
    solver.bodyCollider = this.bodyCollider
    solver.gravity.set(0, -this.gravityY, 0)
    solver.wind.set(this.windX, 0, this.windZ)
    let pinnedY = 0
    for (const idx of pinnedTop) pinnedY += positions[idx * 3 + 1]
    pinnedY = pinnedTop.length ? pinnedY / pinnedTop.length : 0
    this.pieces.push({ geometry, positions, mesh, solver, name, pinnedY, anchorKind: 'torso', refill: () => fill(positions) })
  }

  /** Bind each piece's pinned ring to the nearest body anchor (torso for tops, hip for bottoms). */
  private bindPinsToBody(): void {
    const a = this.anchors()
    if (!a) return
    const torsoY = a.torso.elements[13]
    const hipY = a.hip.elements[13]
    for (const p of this.pieces) {
      p.anchorKind = Math.abs(p.pinnedY - torsoY) <= Math.abs(p.pinnedY - hipY) ? 'torso' : 'hip'
      p.solver.bindPins(a[p.anchorKind])
    }
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
    const a = this.anchors()
    for (const p of this.pieces) {
      p.solver.setAnchor(a ? a[p.anchorKind] : null)
      p.solver.step(dt)
    }
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
    this.bindPinsToBody() // re-hang from the body at the fresh drape
  }

  setFabricPhysics(): void {
    for (const p of this.pieces) p.solver.setFabric(this.params(p.name))
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
