import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { FabricParams } from '../cloth/fabricPresets'
import { buildTubeGarment, fillTube, type TubeSpec } from '../cloth/Garment'
import { XPBDSolver } from '../cloth/XPBDSolver'
import { buildGarmentSpecs, type GarmentParams, type GarmentType } from './templates'

interface Piece {
  spec: TubeSpec
  geometry: THREE.BufferGeometry
  positions: Float32Array
  mesh: THREE.Mesh
  solver: XPBDSolver
}

/**
 * Owns the current garment as one or more simulated tube pieces (e.g. pants =
 * two legs). All pieces share the studio's fabric material + the body colliders.
 * Rebuilding on template/param change; stepped and rendered by the main loop.
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
    /** Getter for the current fabric's solver params. */
    private readonly params: () => FabricParams
  ) {}

  /** (Re)build the garment for a template + params. */
  build(type: GarmentType, garmentParams: GarmentParams): void {
    this.dispose()
    for (const spec of buildGarmentSpecs(type, garmentParams, this.measurements)) {
      const { geometry, positions, nx, ny, pinnedTop } = buildTubeGarment(spec)
      const mesh = new THREE.Mesh(geometry, this.material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      this.scene.add(mesh)

      const solver = new XPBDSolver(nx, ny, positions, this.params(), {
        pinned: pinnedTop,
        wrapX: true
      })
      solver.colliders = this.colliders
      solver.gravity.set(0, -this.gravityY, 0)
      solver.wind.set(this.windX, 0, this.windZ)
      this.pieces.push({ spec, geometry, positions, mesh, solver })
    }
  }

  setGravity(y: number): void {
    this.gravityY = y
    for (const p of this.pieces) p.solver.gravity.set(0, -y, 0)
  }

  setWind(x: number, z: number): void {
    this.windX = x
    this.windZ = z
    for (const p of this.pieces) p.solver.wind.set(x, 0, z)
  }

  step(dt: number): void {
    for (const p of this.pieces) p.solver.step(dt)
  }

  getMeshes(): THREE.Object3D[] {
    return this.pieces.map((p) => p.mesh)
  }

  /** Push simulated positions to the render meshes (call each frame). */
  updateMeshes(): void {
    for (const p of this.pieces) {
      p.geometry.attributes.position.needsUpdate = true
      p.geometry.computeVertexNormals()
    }
  }

  /** Reset every piece to its undraped shape and re-simulate. */
  redrape(): void {
    for (const p of this.pieces) {
      fillTube(p.positions, p.spec)
      p.solver.reset()
      p.geometry.attributes.position.needsUpdate = true
      p.geometry.computeVertexNormals()
      p.geometry.computeBoundingSphere()
    }
  }

  /** Apply new fabric physics to every piece, then re-drape. */
  setFabricPhysics(): void {
    for (const p of this.pieces) p.solver.setFabric(this.params())
    this.redrape()
  }

  /** Remove all pieces from the scene (e.g. when switching design mode). */
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
