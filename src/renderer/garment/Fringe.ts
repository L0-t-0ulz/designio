import * as THREE from 'three'

/**
 * Drape-following **hem fringe** — one hanging strand per hem particle, tops
 * refilled from the piece's live sim buffer each frame. Strands are REAL
 * dynamics, not painted: each is a small verlet chain (gravity + inertial
 * damping + rope-style length projection) hanging from its driven top, so the
 * curtain swings with a walk, lags a turn, and settles plumb — while strand
 * lengths carry a deterministic per-strand jitter (`strandLength`, pure +
 * unit-tested) so the fringe reads as cut yarn, not a ruler-straight comb.
 * A scarf's fringe hangs off the strip's END columns (the tail hems), a
 * skirt's off its bottom row — `fringeEdgeIndices` picks the edge.
 */

/** Deterministic per-strand length: `base` ± 20% by a hashed index (no RNG — replays identically). */
export function strandLength(ix: number, base = 0.07): number {
  const h = Math.sin(ix * 12.9898) * 43758.5453
  return base * (0.8 + 0.4 * (h - Math.floor(h)))
}

export type FringeEdge = 'hem' | 'ends'

/** Strand-top particle indices for a piece grid: the bottom row (`hem`) or the
 *  two end columns (`ends` — a scarf strip's tail hems). Pure. */
export function fringeEdgeIndices(nx: number, ny: number, edge: FringeEdge): number[] {
  if (edge === 'ends') {
    const out: number[] = []
    for (let iy = 0; iy < ny; iy++) out.push(iy * nx, iy * nx + nx - 1)
    return out
  }
  return Array.from({ length: nx }, (_, ix) => (ny - 1) * nx + ix)
}

/**
 * One verlet step for a strand chain of `segs` free points hanging from a
 * driven top (tx, ty, tz): integrate with gravity + inertial damping, then two
 * rope-style top-down length-projection passes. Deterministic; mutates only
 * `pos`/`prev` from point offset `o`. Pure math (unit-tested).
 */
export function stepStrand(pos: Float32Array, prev: Float32Array, o: number, segs: number, tx: number, ty: number, tz: number, segLen: number, dt: number, damping = 0.965): void {
  const g = -9.81 * dt * dt
  for (let s = 0; s < segs; s++) {
    const i = (o + s) * 3
    const px = pos[i]
    const py = pos[i + 1]
    const pz = pos[i + 2]
    pos[i] = px + (px - prev[i]) * damping
    pos[i + 1] = py + (py - prev[i + 1]) * damping + g
    pos[i + 2] = pz + (pz - prev[i + 2]) * damping
    prev[i] = px
    prev[i + 1] = py
    prev[i + 2] = pz
  }
  for (let iter = 0; iter < 2; iter++) {
    let ax = tx
    let ay = ty
    let az = tz
    for (let s = 0; s < segs; s++) {
      const i = (o + s) * 3
      const dx = pos[i] - ax
      const dy = pos[i + 1] - ay
      const dz = pos[i + 2] - az
      const d = Math.hypot(dx, dy, dz) || 1e-9
      const k = segLen / d
      pos[i] = ax + dx * k
      pos[i + 1] = ay + dy * k
      pos[i + 2] = az + dz * k
      ax = pos[i]
      ay = pos[i + 1]
      az = pos[i + 2]
    }
  }
}

const SEGS = 4
const FIXED_DT = 1 / 60 // the loop is fixed-timestep

export class Fringe {
  /** Parent for the strand lines (add to the piece mesh so it inherits visibility). */
  readonly object = new THREE.Group()
  private readonly geom: THREE.BufferGeometry
  private readonly idx: number[]
  private readonly lens: number[]
  private readonly pos: Float32Array
  private readonly prev: Float32Array
  private seeded = false

  constructor(nx: number, ny: number, material: THREE.LineBasicMaterial, edge: FringeEdge = 'hem') {
    this.object.userData.fringe = true
    this.idx = fringeEdgeIndices(nx, ny, edge)
    this.lens = this.idx.map((_, k) => strandLength(k))
    this.pos = new Float32Array(this.idx.length * SEGS * 3)
    this.prev = new Float32Array(this.idx.length * SEGS * 3)
    this.geom = new THREE.BufferGeometry()
    this.geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.idx.length * SEGS * 2 * 3), 3))
    const lines = new THREE.LineSegments(this.geom, material)
    lines.frustumCulled = false
    lines.castShadow = false
    lines.userData.fringe = true
    this.object.add(lines)
  }

  /** Drive strand tops from the live hem particles + step the verlet chains. */
  update(positions: Float32Array, normals: Float32Array, dt = FIXED_DT): void {
    const arr = this.geom.attributes.position.array as Float32Array
    let v = 0
    for (let k = 0; k < this.idx.length; k++) {
      const i = this.idx[k] * 3
      const tx = positions[i] + normals[i] * 0.004 // a whisper off the surface — no z-fighting
      const ty = positions[i + 1]
      const tz = positions[i + 2] + normals[i + 2] * 0.004
      const segLen = this.lens[k] / SEGS
      const o = k * SEGS
      if (!this.seeded) {
        for (let s = 0; s < SEGS; s++) {
          const j = (o + s) * 3
          this.pos[j] = this.prev[j] = tx
          this.pos[j + 1] = this.prev[j + 1] = ty - segLen * (s + 1)
          this.pos[j + 2] = this.prev[j + 2] = tz
        }
      } else {
        stepStrand(this.pos, this.prev, o, SEGS, tx, ty, tz, segLen, dt)
      }
      // write the polyline: top → p0 → … → p(SEGS−1)
      let ax = tx
      let ay = ty
      let az = tz
      for (let s = 0; s < SEGS; s++) {
        const j = (o + s) * 3
        arr[v++] = ax
        arr[v++] = ay
        arr[v++] = az
        arr[v++] = this.pos[j]
        arr[v++] = this.pos[j + 1]
        arr[v++] = this.pos[j + 2]
        ax = this.pos[j]
        ay = this.pos[j + 1]
        az = this.pos[j + 2]
      }
    }
    this.seeded = true
    this.geom.attributes.position.needsUpdate = true
    this.geom.computeBoundingSphere()
  }

  dispose(): void {
    this.geom.dispose()
    this.object.clear()
  }
}
