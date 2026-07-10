/**
 * Cloth self / inter collision — a global spatial-hash particle repulsion.
 *
 * Every visible garment particle is hashed into a uniform grid; any two particles
 * closer than a cloth "thickness" are pushed apart — **unless** they're structural
 * neighbours of the same piece (grid-adjacent), which the distance constraints
 * already handle. So different pieces / layers always repel (a top over a skirt,
 * two trouser legs) and a single piece's far-apart-in-mesh folds repel too (a
 * flared skirt doesn't pass through itself), without a per-frame BVH.
 *
 * It runs on the shared position buffers *after* the per-piece solvers step, and
 * wakes any piece it moved so it re-settles. Positions only (no velocity injected)
 * → stable.
 */
export interface SimPieceView {
  /** xyz per particle — the zero-copy buffer shared with the solver + geometry. */
  positions: Float32Array
  /** previous positions (velocity = pos − prev); kept in sync so no velocity is injected. */
  prev: Float32Array
  /** 0 = pinned/immovable, >0 = free. */
  invMass: Float32Array
  nx: number
  ny: number
  wrapX: boolean
  wake: () => void
}

const P1 = 73856093
const P2 = 19349663
const P3 = 83492791

export class ClothCollision {
  /** Half the keep-apart distance — the cloth's effective thickness (m). */
  radius = 0.012
  /** Structural-neighbour skip: same-piece particles this close in the grid don't repel. */
  gridSkip = 2
  iterations = 2

  private readonly grid = new Map<number, number[]>()
  // Flat per-global-particle scratch (grown as needed): which piece + local index.
  private gPiece = new Int32Array(0)
  private gLocal = new Int32Array(0)
  // Reused across frames so the hot path allocates nothing: a pool of cell buckets
  // (lengths reset, not reallocated) + the moved-pieces set.
  private readonly cellPool: number[][] = []
  private readonly moved = new Set<number>()

  private key(ix: number, iy: number, iz: number): number {
    return ((ix * P1) ^ (iy * P2) ^ (iz * P3)) | 0
  }

  /** Same-piece structural neighbours (grid-adjacent, wrap-aware in x) — skipped. */
  private structural(p: SimPieceView, ka: number, kb: number): boolean {
    const ixa = ka % p.nx
    const ixb = kb % p.nx
    let dx = Math.abs(ixa - ixb)
    if (p.wrapX) dx = Math.min(dx, p.nx - dx)
    const dy = Math.abs(Math.floor(ka / p.nx) - Math.floor(kb / p.nx))
    return Math.max(dx, dy) <= this.gridSkip
  }

  resolve(pieces: SimPieceView[]): void {
    if (pieces.length === 0) return
    const cell = this.radius * 2
    const d = this.radius * 2
    const d2 = d * d

    // 1. flatten every particle to a global index → (piece, local).
    let n = 0
    for (const p of pieces) n += p.nx * p.ny
    if (this.gPiece.length < n) {
      this.gPiece = new Int32Array(n)
      this.gLocal = new Int32Array(n)
    }
    const gPiece = this.gPiece
    const gLocal = this.gLocal
    let g = 0
    for (let pi = 0; pi < pieces.length; pi++) {
      const c = pieces[pi].nx * pieces[pi].ny
      for (let k = 0; k < c; k++) {
        gPiece[g] = pi
        gLocal[g] = k
        g++
      }
    }

    // 2. hash into the grid. Buckets come from a reused pool (cleared, not reallocated).
    this.grid.clear()
    let poolUsed = 0
    for (let i = 0; i < n; i++) {
      const p = pieces[gPiece[i]]
      const o = gLocal[i] * 3
      const key = this.key(Math.floor(p.positions[o] / cell), Math.floor(p.positions[o + 1] / cell), Math.floor(p.positions[o + 2] / cell))
      let arr = this.grid.get(key)
      if (!arr) {
        arr = this.cellPool[poolUsed] ?? (this.cellPool[poolUsed] = [])
        arr.length = 0
        poolUsed++
        this.grid.set(key, arr)
      }
      arr.push(i)
    }

    // 3. resolve overlaps (Gauss–Seidel).
    const moved = this.moved
    moved.clear()
    for (let iter = 0; iter < this.iterations; iter++) {
      for (let a = 0; a < n; a++) {
        const pa = pieces[gPiece[a]]
        const ka = gLocal[a]
        const ai = ka * 3
        const ax = pa.positions[ai]
        const ay = pa.positions[ai + 1]
        const az = pa.positions[ai + 2]
        const cx = Math.floor(ax / cell)
        const cy = Math.floor(ay / cell)
        const cz = Math.floor(az / cell)
        for (let dz = -1; dz <= 1; dz++)
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const arr = this.grid.get(this.key(cx + dx, cy + dy, cz + dz))
              if (!arr) continue
              for (const b of arr) {
                if (b <= a) continue // each pair once
                if (gPiece[a] === gPiece[b] && this.structural(pa, ka, gLocal[b])) continue
                const pb = pieces[gPiece[b]]
                const kb = gLocal[b]
                const bi = kb * 3
                let nx = pa.positions[ai] - pb.positions[bi]
                let ny = pa.positions[ai + 1] - pb.positions[bi + 1]
                let nz = pa.positions[ai + 2] - pb.positions[bi + 2]
                const dist2 = nx * nx + ny * ny + nz * nz
                if (dist2 >= d2 || dist2 < 1e-12) continue
                const wa = pa.invMass[ka]
                const wb = pb.invMass[kb]
                const wsum = wa + wb
                if (wsum === 0) continue
                const dist = Math.sqrt(dist2)
                const s = (d - dist) / dist // normalised overlap
                const fa = s * (wa / wsum)
                const fb = s * (wb / wsum)
                pa.positions[ai] += nx * fa
                pa.positions[ai + 1] += ny * fa
                pa.positions[ai + 2] += nz * fa
                pb.positions[bi] -= nx * fb
                pb.positions[bi + 1] -= ny * fb
                pb.positions[bi + 2] -= nz * fb
                pa.prev[ai] = pa.positions[ai]
                pa.prev[ai + 1] = pa.positions[ai + 1]
                pa.prev[ai + 2] = pa.positions[ai + 2]
                pb.prev[bi] = pb.positions[bi]
                pb.prev[bi + 1] = pb.positions[bi + 1]
                pb.prev[bi + 2] = pb.positions[bi + 2]
                if (wa > 0) moved.add(gPiece[a])
                if (wb > 0) moved.add(gPiece[b])
              }
            }
      }
    }

    for (const pi of moved) pieces[pi].wake()
  }
}
