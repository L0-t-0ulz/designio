import { describe, it, expect } from 'vitest'
import { angleWeightedNormals } from '../src/renderer/cloth/normals'

/** Build a flat XY grid (nx×ny verts) and its triangle index. */
function grid(nx: number, ny: number, jitterZ = 0): { pos: Float32Array; idx: number[] } {
  const pos = new Float32Array(nx * ny * 3)
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const i = (y * nx + x) * 3
      pos[i] = x
      pos[i + 1] = y
      pos[i + 2] = jitterZ && x % 2 ? jitterZ : 0
    }
  }
  const idx: number[] = []
  for (let y = 0; y < ny - 1; y++) {
    for (let x = 0; x < nx - 1; x++) {
      const a = y * nx + x
      const b = a + 1
      const c = a + nx
      const d = c + 1
      idx.push(a, b, c, b, d, c) // CCW so normals face +Z
    }
  }
  return { pos, idx }
}

describe('angleWeightedNormals', () => {
  it('a single triangle gets the unit face normal at every vertex', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) // CCW in XY → +Z
    const out = new Float32Array(9)
    angleWeightedNormals(pos, [0, 1, 2], out)
    for (let i = 0; i < 3; i++) {
      expect(out[i * 3]).toBeCloseTo(0, 6)
      expect(out[i * 3 + 1]).toBeCloseTo(0, 6)
      expect(out[i * 3 + 2]).toBeCloseTo(1, 6)
    }
  })

  it('a flat grid has every normal = +Z regardless of triangle sizes', () => {
    const { pos, idx } = grid(5, 4)
    const out = new Float32Array(pos.length)
    angleWeightedNormals(pos, idx, out)
    for (let i = 0; i < out.length; i += 3) {
      expect(out[i]).toBeCloseTo(0, 6)
      expect(out[i + 1]).toBeCloseTo(0, 6)
      expect(out[i + 2]).toBeCloseTo(1, 6)
    }
  })

  it('produces unit-length normals on a non-flat (folded) mesh', () => {
    const { pos, idx } = grid(6, 6, 0.4) // ripple in z
    const out = new Float32Array(pos.length)
    angleWeightedNormals(pos, idx, out)
    for (let i = 0; i < out.length; i += 3) {
      expect(Math.hypot(out[i], out[i + 1], out[i + 2])).toBeCloseTo(1, 5)
    }
  })

  it('a symmetric roof ridge yields a symmetric (x≈0) upward normal', () => {
    // two slopes meeting at a ridge along y; ridge vertex (index 1) normal is up+symmetric
    // verts: left(-1,0,0) ridge(0,0,1) right(1,0,0) and a second row at y=1
    const pos = new Float32Array([
      -1, 0, 0, 0, 0, 1, 1, 0, 0,
      -1, 1, 0, 0, 1, 1, 1, 1, 0
    ])
    // left slope (0,1,3,4) + right slope (1,2,4,5), wound CCW so normals point up
    const idx = [0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4]
    const out = new Float32Array(pos.length)
    angleWeightedNormals(pos, idx, out)
    // ridge vertices 1 and 4: symmetric → x≈0, z>0 (points up out of the roof)
    for (const v of [1, 4]) {
      expect(out[v * 3]).toBeCloseTo(0, 5)
      expect(out[v * 3 + 2]).toBeGreaterThan(0)
    }
  })

  it('skips degenerate (zero-area) triangles without producing NaN', () => {
    const pos = new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]) // collinear → zero area
    const out = new Float32Array(9)
    angleWeightedNormals(pos, [0, 1, 2], out)
    for (const n of out) expect(Number.isFinite(n)).toBe(true)
    // no contribution → safe +Z fallback
    expect(out[2]).toBe(1)
  })
})
