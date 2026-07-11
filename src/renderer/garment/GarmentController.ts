import * as THREE from 'three'
import type { Capsule } from '../avatar/colliders'
import type { Measurements, BodyAnchors } from '../avatar/Mannequin'
import type { BodyCollider } from '../cloth/BodyCollider'
import type { FabricParams } from '../cloth/fabricPresets'
import type { TubeBuild } from '../cloth/Garment'
import { XPBDSolver } from '../cloth/XPBDSolver'
import { computeAngleWeightedNormals } from '../cloth/normals'
import type { SimPieceView } from '../cloth/ClothCollision'
import type { GarmentParams, GarmentType } from './templates'
import { buildGarment } from '../garments/factory'
import { getGarment } from '../garments/registry'
import { Topstitch } from './Topstitch'

/** Which body anchor a pin group follows (matrix keys of BodyAnchors). */
export type AnchorKey = 'head' | 'torso' | 'hip' | 'armL' | 'armR' | 'foreL' | 'foreR'

/**
 * The body anchor a piece's top ring hangs from, by piece name + position: crown
 * headwear (a beanie/hat) → the **head** (so it turns/nods with the head); a sleeve →
 * its arm (−x = left); everything else → whichever of torso/hip its top ring is nearer.
 * Pure, so it's unit-tested.
 */
export function pieceAnchor(name: string, pinnedX: number, pinnedY: number, torsoY: number, hipY: number): AnchorKey {
  if (/head/i.test(name)) return 'head'
  if (/sleeve/i.test(name)) return pinnedX < 0 ? 'armL' : 'armR'
  return Math.abs(pinnedY - torsoY) <= Math.abs(pinnedY - hipY) ? 'torso' : 'hip'
}

interface Piece {
  geometry: THREE.BufferGeometry
  positions: Float32Array
  mesh: THREE.Mesh
  solver: XPBDSolver
  name: string
  /** Top ring (shoulder/waist) + mid ring (elbow, for sleeves) + waist ring (bodices). */
  topRing: number[]
  midRing: number[]
  waistRing: number[]
  pinnedX: number
  pinnedY: number
  /** The body anchors this piece's pin groups follow (recomputed on each bind). */
  pinGroups: { idx: number[]; kind: AnchorKey }[]
  /** Reset this piece's positions to its undraped shape. */
  refill: () => void
  /** Drape-following topstitch along the hem + top edge. */
  topstitch: Topstitch
  /** false for a flat open panel (a scarf) — the grid doesn't close in X. */
  wrapX: boolean
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
  /** Shared thread material for every piece's topstitch (colour set by the stack). */
  private readonly stitchMat = new THREE.LineDashedMaterial({ color: 0x2c2c33, dashSize: 0.007, gapSize: 0.004 })

  constructor(
    private readonly scene: THREE.Scene,
    private readonly material: THREE.Material,
    private readonly colliders: Capsule[],
    private readonly measurements: Measurements,
    private readonly params: (pieceName: string) => FabricParams,
    private readonly bodyCollider: BodyCollider | null = null,
    private readonly anchors: () => BodyAnchors | null = () => null,
    /** Optional back-panel fabric per piece → per-panel drape (null = same as front). */
    private readonly backParams: (pieceName: string) => FabricParams | null = () => null
  ) {}

  /** (Re)build the garment from its data definition + fit params via the factory. */
  build(type: GarmentType, garmentParams: GarmentParams): void {
    this.dispose()
    const def = getGarment(type)
    for (const p of buildGarment(def, garmentParams, this.measurements, this.colliders)) {
      this.addPiece(p.build, p.refill, p.name, p.wrapX ?? true)
    }
    this.applyPieceFabrics() // per-panel (front/back) drape where a back fabric is set
    this.bindPinsToBody() // hang each piece from the body so it follows animation
  }

  private addPiece(build: TubeBuild, fill: (pos: Float32Array) => void, name: string, wrapX = true): void {
    const { geometry, positions, nx, ny, pinnedTop } = build
    const mesh = new THREE.Mesh(geometry, this.material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    this.scene.add(mesh)

    const solver = new XPBDSolver(nx, ny, positions, this.params(name), { pinned: pinnedTop, wrapX })
    solver.colliders = this.colliders
    solver.bodyCollider = this.bodyCollider
    solver.gravity.set(0, -this.gravityY, 0)
    solver.wind.set(this.windX, 0, this.windZ)
    const topRing = [...pinnedTop]
    const midY = Math.floor((ny - 1) / 2)
    const midRing = Array.from({ length: nx }, (_, ix) => midY * nx + ix) // mid ring (a sleeve's elbow)
    const ringY = (iy: number): number => {
      let y = 0
      for (let ix = 0; ix < nx; ix++) y += positions[(iy * nx + ix) * 3 + 1]
      return y / nx
    }
    // Waist ring: the row nearest the anatomical waist (below the top ring), if the piece
    // reaches it — a bodice/dress pins here too so it can't creep off the shoulders.
    let bestIy = -1
    let bestD = Infinity
    for (let iy = 1; iy < ny; iy++) {
      const d = Math.abs(ringY(iy) - this.measurements.waistY)
      if (d < bestD) {
        bestD = d
        bestIy = iy
      }
    }
    const waistRing = bestIy > 0 && bestD < 0.1 ? Array.from({ length: nx }, (_, ix) => bestIy * nx + ix) : []
    let pinnedY = 0
    let pinnedX = 0
    for (const idx of pinnedTop) {
      pinnedX += positions[idx * 3]
      pinnedY += positions[idx * 3 + 1]
    }
    const n = pinnedTop.length || 1
    const topstitch = new Topstitch(nx, ny, this.stitchMat)
    mesh.add(topstitch.object) // parent to the mesh so it inherits visibility
    computeAngleWeightedNormals(geometry)
    topstitch.update(positions, geometry.attributes.normal.array as Float32Array) // seed frame 0
    this.pieces.push({ geometry, positions, mesh, solver, name, topRing, midRing, waistRing, pinnedX: pinnedX / n, pinnedY: pinnedY / n, pinGroups: [], refill: () => fill(positions), topstitch, wrapX })
  }

  /** Set the topstitch thread colour (the studio drives this from the trim / fabric). */
  setStitchColor(hex: number): void {
    this.stitchMat.color.set(hex)
  }

  /** Bind each piece's pin groups to the body parts it hangs from — a sleeve pins its
   * shoulder to the arm (and, if it reaches, its cuff to the hand so it hugs the whole
   * arm), a top to the torso, a skirt/trouser to the hips — so each follows that part. */
  private bindPinsToBody(): void {
    const a = this.anchors()
    if (!a) return
    const torsoY = a.torso.elements[13]
    const hipY = a.hip.elements[13]
    const ringCentre = (p: Piece, ring: number[]): [number, number, number] => {
      let x = 0
      let y = 0
      let z = 0
      for (const idx of ring) {
        x += p.positions[idx * 3]
        y += p.positions[idx * 3 + 1]
        z += p.positions[idx * 3 + 2]
      }
      const m = ring.length || 1
      return [x / m, y / m, z / m]
    }
    for (const p of this.pieces) {
      const kind = pieceAnchor(p.name, p.pinnedX, p.pinnedY, torsoY, hipY)
      const groups: { idx: number[]; kind: AnchorKey }[] = [{ idx: p.topRing, kind }]
      if (kind === 'armL' || kind === 'armR') {
        // A long sleeve whose mid ring reaches the elbow also pins to the forearm, so it
        // bends with the arm (the forearm moves far less than the hand — no drag).
        if (a.rigged) {
          const foreKind: AnchorKey = kind === 'armL' ? 'foreL' : 'foreR'
          const fore = a[foreKind]
          const [cx, cy, cz] = ringCentre(p, p.midRing)
          const dx = cx - fore.elements[12]
          const dy = cy - fore.elements[13]
          const dz = cz - fore.elements[14]
          if (dx * dx + dy * dy + dz * dz < 0.15 * 0.15) groups.push({ idx: p.midRing, kind: foreKind })
        }
      } else if (kind === 'torso' && p.waistRing.length) {
        // A top/dress bodice also clamps its waist to the pelvis, so it can't creep off
        // the shoulders during a walk; the skirt below the waist stays free to swing.
        groups.push({ idx: p.waistRing, kind: 'hip' })
      }
      p.pinGroups = groups
      p.solver.bindPinGroups(groups.map((g) => ({ idx: g.idx, anchor: a[g.kind] })))
    }
  }

  /** The garment's pieces for the Object Browser (name + mesh; visibility via mesh.visible). */
  getPieces(): { name: string; mesh: THREE.Mesh }[] {
    return this.pieces.map((p) => ({ name: p.name, mesh: p.mesh }))
  }

  /** Solver substeps per piece (simulation quality ↔ performance). */
  setQuality(substeps: number): void {
    for (const p of this.pieces) {
      p.solver.substeps = substeps
      p.solver.wake()
    }
  }

  private strainScratch: Float32Array | null = null
  /** Bake each piece's cloth **strain** into its geometry vertex colours (fit heatmap). */
  updateHeatmap(colorFn: (strain: number) => [number, number, number]): void {
    for (const p of this.pieces) {
      const n = p.solver.count
      if (!this.strainScratch || this.strainScratch.length < n) this.strainScratch = new Float32Array(n)
      const strain = this.strainScratch
      p.solver.strain(strain)
      let attr = p.geometry.getAttribute('color') as THREE.BufferAttribute | undefined
      if (!attr || attr.count !== n) {
        attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3)
        p.geometry.setAttribute('color', attr)
      }
      const c = attr.array as Float32Array
      for (let k = 0; k < n; k++) {
        const [r, g, b] = colorFn(strain[k])
        c[k * 3] = r
        c[k * 3 + 1] = g
        c[k * 3 + 2] = b
      }
      attr.needsUpdate = true
    }
  }

  /** Write each piece's per-particle **wrinkle amount** (from strain) into an `aStrain`
   *  attribute the fabric shader reads for micro-wrinkle creases. */
  updateWrinkle(amountFn: (strain: number) => number): void {
    for (const p of this.pieces) {
      const n = p.solver.count
      if (!this.strainScratch || this.strainScratch.length < n) this.strainScratch = new Float32Array(n)
      const strain = this.strainScratch
      p.solver.strain(strain)
      let attr = p.geometry.getAttribute('aStrain') as THREE.BufferAttribute | undefined
      if (!attr || attr.count !== n) {
        attr = new THREE.BufferAttribute(new Float32Array(n), 1)
        p.geometry.setAttribute('aStrain', attr)
      }
      const a = attr.array as Float32Array
      for (let k = 0; k < n; k++) a[k] = amountFn(strain[k])
      attr.needsUpdate = true
    }
  }

  /** The torso body tube's live sim view (positions + grid), for girth measurement; null if none. */
  bodySim(): { positions: Float32Array; nx: number; ny: number } | null {
    const p = this.pieces.find((q) => !/sleeve|leg/i.test(q.name))
    return p ? { positions: p.positions, nx: p.solver.nx, ny: p.solver.ny } : null
  }

  /** True once every piece has settled to rest — measure the fit on a stable drape. */
  isSettled(): boolean {
    return this.pieces.length > 0 && this.pieces.every((p) => p.solver.settled)
  }

  /** True if any piece integrated this frame or is awake — the global collision pass is
   *  only worth running when something moved (at full rest pieces are stably separated). */
  anyAdvanced(): boolean {
    return this.pieces.some((p) => p.solver.advanced)
  }

  /** Per-piece particle views for the global cloth-collision pass. */
  simPieces(): SimPieceView[] {
    return this.pieces.map((p) => ({
      positions: p.positions,
      prev: p.solver.prev,
      invMass: p.solver.invMass,
      nx: p.solver.nx,
      ny: p.solver.ny,
      wrapX: p.wrapX,
      wake: () => p.solver.wake()
    }))
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
      p.solver.setPinAnchors(p.pinGroups.map((g) => (a ? a[g.kind] : null)))
      p.solver.step(dt)
    }
  }

  getMeshes(): THREE.Object3D[] {
    return this.pieces.map((p) => p.mesh)
  }

  updateMeshes(): void {
    for (const p of this.pieces) {
      if (!p.solver.advanced) continue // resting: the mesh already holds the settled drape — skip the recompute + re-upload
      p.geometry.attributes.position.needsUpdate = true
      computeAngleWeightedNormals(p.geometry)
      p.topstitch.update(p.positions, p.geometry.attributes.normal.array as Float32Array)
    }
  }

  redrape(): void {
    for (const p of this.pieces) {
      p.refill()
      p.solver.reset()
      p.geometry.attributes.position.needsUpdate = true
      computeAngleWeightedNormals(p.geometry)
      p.geometry.computeBoundingSphere()
    }
    this.bindPinsToBody() // re-hang from the body at the fresh drape
  }

  /** Apply each piece's fabric physics (front + optional back panel) in place. */
  private applyPieceFabrics(): void {
    for (const p of this.pieces) {
      const front = this.params(p.name)
      const back = this.backParams(p.name)
      if (back) p.solver.setPanelFabric(front, back)
      else p.solver.setFabric(front)
    }
  }

  setFabricPhysics(): void {
    this.applyPieceFabrics()
    this.redrape()
  }

  /** Set the trapped-air pressure (outward loft) on every piece — a quilted/puffer
   *  garment inflates off the body. Wakes the solvers so the change takes effect. */
  setPressure(pressure: number): void {
    for (const p of this.pieces) {
      p.solver.pressure = pressure
      p.solver.wake()
    }
  }

  /** Tear the garment down for good (layer delete) — frees the shared thread material too. */
  clear(): void {
    this.dispose()
    this.stitchMat.dispose()
  }

  /** Drop the current pieces (rebuild) — keeps the shared `stitchMat` for the next build. */
  private dispose(): void {
    for (const p of this.pieces) {
      this.scene.remove(p.mesh)
      p.topstitch.dispose()
      p.geometry.dispose()
    }
    this.pieces = []
  }
}
