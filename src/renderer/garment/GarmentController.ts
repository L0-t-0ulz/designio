import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements } from '../avatar/Mannequin'
import type { FabricParams } from '../cloth/fabricPresets'
import {
  buildAxisTube,
  buildTubeGarment,
  fillAxisTube,
  fillTube,
  type AxisTubeSpec,
  type TubeBuild
} from '../cloth/Garment'
import { XPBDSolver } from '../cloth/XPBDSolver'
import { buildGarmentSpecs, type GarmentParams, type GarmentType } from './templates'

interface Piece {
  geometry: THREE.BufferGeometry
  positions: Float32Array
  mesh: THREE.Mesh
  solver: XPBDSolver
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
    private readonly params: () => FabricParams
  ) {}

  /** (Re)build the garment for a template + params. */
  build(type: GarmentType, garmentParams: GarmentParams): void {
    this.dispose()
    for (const spec of buildGarmentSpecs(type, garmentParams, this.measurements)) {
      this.addPiece(buildTubeGarment(spec), (pos) => fillTube(pos, spec))
    }
    const sleeve = garmentParams.sleeve ?? 'none'
    if ((type === 'top' || type === 'dress') && sleeve !== 'none') {
      for (const spec of this.sleeveSpecs(sleeve === 'long')) {
        this.addPiece(buildAxisTube(spec), (pos) => fillAxisTube(pos, spec))
      }
    }
  }

  /** Two sleeve tubes along the arm capsules (indices 5/6 = left, 9/10 = right). */
  private sleeveSpecs(long: boolean): AxisTubeSpec[] {
    const arms: [Capsule, Capsule][] = [
      [this.colliders[5], this.colliders[6]],
      [this.colliders[9], this.colliders[10]]
    ]
    return arms.map(([upper, fore]) => {
      const a = upper.a.clone() // shoulder
      const b = (long ? fore.b : upper.b).clone() // wrist or elbow
      const len = a.distanceTo(b)
      return {
        rings: Math.max(6, Math.min(28, Math.round(len / 0.03))),
        radial: 26,
        a,
        b,
        radiusStart: 0.085,
        radiusEnd: (long ? fore.radius : upper.radius) + 0.03
      }
    })
  }

  private addPiece(build: TubeBuild, fill: (pos: Float32Array) => void): void {
    const { geometry, positions, nx, ny, pinnedTop } = build
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    this.scene.add(mesh)

    const solver = new XPBDSolver(nx, ny, positions, this.params(), { pinned: pinnedTop, wrapX: true })
    solver.colliders = this.colliders
    solver.gravity.set(0, -this.gravityY, 0)
    solver.wind.set(this.windX, 0, this.windZ)
    this.pieces.push({ geometry, positions, mesh, solver, refill: () => fill(positions) })
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
