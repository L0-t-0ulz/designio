import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import type { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'

/**
 * Mesh-accurate body collision for cloth. Builds a {@link MeshBVH} over the
 * body's triangles (in world space) and, for any query point, returns the
 * closest surface point pushed out by a skin offset — but only when the point is
 * inside (or within the skin of) the body.
 *
 * Robustness (the fix over the first attempt): the surface-normal orientation is
 * **auto-detected** at build time by probing the mesh's own interior, so it works
 * whether the source winds its triangles inward (MarchingCubes) or outward
 * (a normal mesh). The coarse-mesh guesswork that collapsed garments is gone; the
 * signed inside/outside test is unit-tested against a known sphere + the real body.
 */
export class BodyCollider {
  private bvh: MeshBVH | null = null
  private normals: THREE.BufferAttribute | null = null
  /** MeshBVH reorders this index while building, so face i's verts live here, not at 3i. */
  private index: THREE.TypedArray | null = null
  /** true when the source's face normals point inward (flip them to get outward). */
  private flip = false

  private readonly _p = new THREE.Vector3()
  private readonly _hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 }
  private readonly _n = new THREE.Vector3()

  get ready(): boolean {
    return this.bvh != null
  }

  invalidate(): void {
    this.bvh = null
  }

  /**
   * Build the BVH from an arbitrary **world-space** triangle geometry. Non-indexed
   * triangle soup or indexed geometry both work; smooth vertex normals are
   * computed if absent. Orientation is auto-detected from the interior.
   */
  buildFromGeometry(geom: THREE.BufferGeometry): void {
    if (!geom.getAttribute('normal')) geom.computeVertexNormals()
    this.normals = geom.getAttribute('normal') as THREE.BufferAttribute
    // MeshBVH ensures + *reorders* the geometry's index in place; read it back
    // afterwards so `faceNormal` can map a faceIndex to its real vertices.
    this.bvh = new MeshBVH(geom)
    this.index = geom.getIndex()!.array
    this.flip = false
    this.flip = this.detectInward(geom)
  }

  /** Extract the MarchingCubes active triangles into world space, then build. */
  buildFromMarchingCubes(mc: MarchingCubes): void {
    const posAttr = mc.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    const count = (mc as unknown as { count: number }).count
    if (!posAttr || count < 3) {
      this.invalidate()
      return
    }
    mc.updateMatrixWorld()
    const m = mc.matrixWorld
    const positions = new Float32Array(count * 3)
    const v = this._p
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(posAttr, i).applyMatrix4(m)
      positions[i * 3] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.computeVertexNormals()
    this.buildFromGeometry(g)
  }

  /**
   * If `(px,py,pz)` is inside the body (or within `skin` of the surface), write
   * the nearest surface point pushed out along the outward normal by `skin` into
   * `out` and return it; otherwise return null (the point is safely outside).
   */
  resolve(px: number, py: number, pz: number, skin: number, out: THREE.Vector3): THREE.Vector3 | null {
    if (!this.bvh || !this.normals) return null
    this._p.set(px, py, pz)
    const hit = this.bvh.closestPointToPoint(this._p, this._hit)
    if (!hit) return null
    const n = this.faceNormal(hit.faceIndex, this._n)
    const cx = hit.point.x
    const cy = hit.point.y
    const cz = hit.point.z
    const signed = (px - cx) * n.x + (py - cy) * n.y + (pz - cz) * n.z
    if (signed >= skin) return null // outside by more than the skin offset
    return out.set(cx + n.x * skin, cy + n.y * skin, cz + n.z * skin)
  }

  /** Signed distance to the surface (negative = inside). Exposed for tests. */
  signedDistance(px: number, py: number, pz: number): number {
    if (!this.bvh || !this.normals) return Number.POSITIVE_INFINITY
    this._p.set(px, py, pz)
    const hit = this.bvh.closestPointToPoint(this._p, this._hit)
    if (!hit) return Number.POSITIVE_INFINITY
    const n = this.faceNormal(hit.faceIndex, this._n)
    return (px - hit.point.x) * n.x + (py - hit.point.y) * n.y + (pz - hit.point.z) * n.z
  }

  /** Outward face normal (averaged over the face's 3 vertices, orientation-corrected). */
  private faceNormal(faceIndex: number, out: THREE.Vector3): THREE.Vector3 {
    const nrm = this.normals!
    const idx = this.index!
    const f = faceIndex * 3
    const a = idx[f]
    const b = idx[f + 1]
    const c = idx[f + 2]
    let nx = (nrm.getX(a) + nrm.getX(b) + nrm.getX(c)) / 3
    let ny = (nrm.getY(a) + nrm.getY(b) + nrm.getY(c)) / 3
    let nz = (nrm.getZ(a) + nrm.getZ(b) + nrm.getZ(c)) / 3
    const l = Math.hypot(nx, ny, nz) || 1
    const s = (this.flip ? -1 : 1) / l
    return out.set(nx * s, ny * s, nz * s)
  }

  /**
   * Probe the mesh's own interior (bounding-box centre — inside a solid body/sphere)
   * with the un-flipped normals: if that interior point reads as *outside*
   * (signed > 0), the source normals point inward, so we must flip.
   */
  private detectInward(geom: THREE.BufferGeometry): boolean {
    geom.computeBoundingBox()
    const c = geom.boundingBox!.getCenter(this._p)
    const hit = this.bvh!.closestPointToPoint(c, this._hit)
    if (!hit) return false
    const n = this.faceNormal(hit.faceIndex, this._n) // flip currently false
    const signed = (c.x - hit.point.x) * n.x + (c.y - hit.point.y) * n.y + (c.z - hit.point.z) * n.z
    return signed > 0 // interior read as outside → normals are inward
  }
}
