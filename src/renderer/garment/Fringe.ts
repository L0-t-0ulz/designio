import * as THREE from 'three'

/**
 * Drape-following **hem fringe** — one hanging strand per hem particle, tops refilled
 * from the piece's live sim buffer each frame (like the topstitch) so the fringe
 * curtain sways with the drape and the walk. Strand lengths carry a deterministic
 * per-strand jitter (`strandLength`, pure + unit-tested) so the fringe reads as cut
 * yarn, not a ruler-straight comb; each strand hangs plumb with a whisper of
 * outward set along the surface normal so it doesn't z-fight the cloth.
 */

/** Deterministic per-strand length: `base` ± 20% by a hashed index (no RNG — replays identically). */
export function strandLength(ix: number, base = 0.07): number {
  const h = Math.sin(ix * 12.9898) * 43758.5453
  return base * (0.8 + 0.4 * (h - Math.floor(h)))
}

export class Fringe {
  /** Parent for the strand lines (add to the piece mesh so it inherits visibility). */
  readonly object = new THREE.Group()
  private readonly geom: THREE.BufferGeometry
  private readonly idx: number[]
  private readonly lens: number[]

  constructor(nx: number, ny: number, material: THREE.LineBasicMaterial) {
    this.object.userData.fringe = true
    this.idx = Array.from({ length: nx }, (_, ix) => (ny - 1) * nx + ix) // the hem ring
    this.lens = Array.from({ length: nx }, (_, ix) => strandLength(ix))
    this.geom = new THREE.BufferGeometry()
    this.geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nx * 2 * 3), 3))
    const lines = new THREE.LineSegments(this.geom, material)
    lines.frustumCulled = false
    lines.castShadow = false
    lines.userData.fringe = true
    this.object.add(lines)
  }

  /** Refill strand tops from the live hem particles; bottoms hang plumb below. */
  update(positions: Float32Array, normals: Float32Array): void {
    const arr = this.geom.attributes.position.array as Float32Array
    for (let k = 0; k < this.idx.length; k++) {
      const i = this.idx[k] * 3
      const ox = normals[i] * 0.004 // a whisper off the surface — no z-fighting
      const oz = normals[i + 2] * 0.004
      const x = positions[i] + ox
      const y = positions[i + 1]
      const z = positions[i + 2] + oz
      arr[k * 6] = x
      arr[k * 6 + 1] = y
      arr[k * 6 + 2] = z
      arr[k * 6 + 3] = x
      arr[k * 6 + 4] = y - this.lens[k]
      arr[k * 6 + 5] = z
    }
    this.geom.attributes.position.needsUpdate = true
    this.geom.computeBoundingSphere()
  }

  dispose(): void {
    this.geom.dispose()
    this.object.clear()
  }
}
