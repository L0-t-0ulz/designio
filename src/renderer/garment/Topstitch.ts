import * as THREE from 'three'

/**
 * Drape-following **topstitch**: dashed contrast lines that trace a garment piece's
 * boundary rows — the hem and the top edge (neckline / waistband / cuff) — inset one
 * row in from the raw edge like real topstitch, and lifted slightly off the surface
 * along the normal so they read as raised stitching. The lines keep their own small
 * position buffer that is refilled from the piece's live sim buffers each frame, so
 * the stitching tracks the drape (and the walk) exactly.
 */
export class Topstitch {
  /** Parent for the stitch lines (add to the piece mesh so it inherits visibility). */
  readonly object = new THREE.Group()
  private readonly loops: { geom: THREE.BufferGeometry; line: THREE.LineLoop; idx: number[] }[] = []

  constructor(nx: number, ny: number, material: THREE.LineDashedMaterial) {
    this.object.userData.topstitch = true
    // Inset one row in from each raw edge (like a real topstitch margin).
    const rows = ny >= 4 ? [1, ny - 2] : [Math.max(0, Math.floor(ny / 2))]
    for (const iy of rows) {
      const idx = Array.from({ length: nx }, (_, ix) => iy * nx + ix)
      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nx * 3), 3))
      const line = new THREE.LineLoop(geom, material)
      line.frustumCulled = false
      line.castShadow = false
      line.userData.topstitch = true
      this.object.add(line)
      this.loops.push({ geom, line, idx })
    }
  }

  /** Refill the stitch lines from the live positions/normals (call after normals update). */
  update(positions: Float32Array, normals: Float32Array, lift = 0.0018): void {
    for (const { geom, line, idx } of this.loops) {
      const arr = geom.attributes.position.array as Float32Array
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3
        arr[k * 3] = positions[i] + normals[i] * lift
        arr[k * 3 + 1] = positions[i + 1] + normals[i + 1] * lift
        arr[k * 3 + 2] = positions[i + 2] + normals[i + 2] * lift
      }
      geom.attributes.position.needsUpdate = true
      geom.computeBoundingSphere()
      line.computeLineDistances() // dashes track the (changing) length
    }
  }

  dispose(): void {
    for (const { geom } of this.loops) geom.dispose()
    this.object.clear()
  }
}
