import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/**
 * Drape-following **opening binding** — the ribbed elastic edge that finishes a
 * cut opening (a balaclava's eye/mouth holes): a solid cord traced around each
 * hole's rim node loop, lifted slightly off the surface and refilled from the
 * live sim buffer each frame, exactly like the piping cord. The matching
 * *physics* half lives in `XPBDSolver.stiffenAmong` (the rim constraints run
 * stiffer, so the opening holds its shape like a real bound edge).
 */
export class HoleBinding {
  /** Parent for the rim cords (add to the piece mesh so it inherits visibility). */
  readonly object = new THREE.Group()
  private readonly loops: { geom: LineGeometry; idx: number[]; arr: Float32Array }[] = []

  constructor(rims: number[][], material: LineMaterial) {
    for (const idx of rims) {
      if (idx.length < 3) continue
      const arr = new Float32Array((idx.length + 1) * 3) // +1 closes the loop
      const geom = new LineGeometry()
      geom.setPositions(Array.from(arr))
      const line = new Line2(geom, material)
      line.frustumCulled = false
      line.castShadow = false
      this.object.add(line)
      this.loops.push({ geom, idx, arr })
    }
  }

  /** Refill the cords from the live positions/normals (call after normals update). */
  update(positions: Float32Array, normals: Float32Array, lift = 0.0022): void {
    for (const { geom, idx, arr } of this.loops) {
      for (let k = 0; k < idx.length; k++) {
        const i = idx[k] * 3
        arr[k * 3] = positions[i] + normals[i] * lift
        arr[k * 3 + 1] = positions[i + 1] + normals[i + 1] * lift
        arr[k * 3 + 2] = positions[i + 2] + normals[i + 2] * lift
      }
      arr[idx.length * 3] = arr[0]
      arr[idx.length * 3 + 1] = arr[1]
      arr[idx.length * 3 + 2] = arr[2]
      geom.setPositions(Array.from(arr))
      geom.computeBoundingSphere()
    }
  }

  dispose(): void {
    for (const { geom } of this.loops) geom.dispose()
    this.object.clear()
  }
}
