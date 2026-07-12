import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

/**
 * Drape-following **piping / corded edge** — a solid round cord traced along a
 * piece's boundary rows (the neckline / top edge and the hem), lifted slightly
 * off the surface, refilled from the live sim buffer each frame like the
 * topstitch — so the cord hugs the moving edge exactly. Rendered with `Line2`
 * in **world units** so the cord has real physical thickness (≈4 mm) instead
 * of a hairline.
 */

/** The cord's world-unit thickness (m) — a classic 4 mm piping cord. */
export const PIPING_DIAMETER = 0.004

/** Shared cord material (colour driven by the trim/stitch colour). */
export function makePipingMaterial(): LineMaterial {
  const mat = new LineMaterial({ color: 0x2c2c33, linewidth: PIPING_DIAMETER, worldUnits: true })
  const hasWindow = typeof window !== 'undefined' // headless tests construct without a DOM
  mat.resolution.set(hasWindow ? window.innerWidth || 1280 : 1280, hasWindow ? window.innerHeight || 800 : 800)
  return mat
}

export class Piping {
  /** Parent for the cord loops (add to the piece mesh so it inherits visibility). */
  readonly object = new THREE.Group()
  private readonly loops: { geom: LineGeometry; line: Line2; idx: number[]; arr: Float32Array }[] = []

  constructor(nx: number, ny: number, material: LineMaterial) {
    this.object.userData.piping = true
    // The raw boundary rows — piping sits ON the edge (unlike topstitch's inset margin).
    const rows = ny >= 2 ? [0, ny - 1] : [0]
    for (const iy of rows) {
      const idx = Array.from({ length: nx }, (_, ix) => iy * nx + ix)
      const arr = new Float32Array((nx + 1) * 3) // +1 closes the loop
      const geom = new LineGeometry()
      geom.setPositions(Array.from(arr))
      const line = new Line2(geom, material)
      line.frustumCulled = false
      line.castShadow = false
      line.userData.piping = true
      this.object.add(line)
      this.loops.push({ geom, line, idx, arr })
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
      // close the loop back to the first point
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
