import { describe, it, expect } from 'vitest'
import { ClothCollision, type SimPieceView } from '../src/renderer/cloth/ClothCollision'

const piece = (positions: number[], nx: number, ny: number): SimPieceView => ({
  positions: new Float32Array(positions),
  prev: new Float32Array(positions),
  invMass: new Float32Array(nx * ny).fill(1),
  nx,
  ny,
  wrapX: false,
  wake: () => {}
})

describe('ClothCollision', () => {
  it('pushes apart overlapping particles from different pieces (inter-collision)', () => {
    const c = new ClothCollision()
    const a = piece([0, 1, 0], 1, 1)
    const b = piece([0, 1, 0.005], 1, 1) // 5 mm apart < 2*radius (24 mm) → overlapping
    c.resolve([a, b])
    expect(Math.abs(a.positions[2] - b.positions[2])).toBeGreaterThanOrEqual(2 * c.radius - 1e-4)
  })

  it('leaves same-piece structural neighbours alone (the constraints handle those)', () => {
    const c = new ClothCollision()
    const p = piece([0, 1, 0, 0.005, 1, 0], 2, 1) // grid-adjacent (dx = 1 ≤ gridSkip)
    c.resolve([p])
    expect(p.positions[0]).toBeCloseTo(0, 6)
    expect(p.positions[3]).toBeCloseTo(0.005, 6)
  })

  it('pushes apart a same-piece fold (far in the mesh, close in space)', () => {
    const c = new ClothCollision()
    // particle 5 sits next to particle 0 but they're 5 apart in the grid (a fold).
    const p = piece([0, 1, 0, 0.5, 1, 0, 1, 1, 0, 1.5, 1, 0, 2, 1, 0, 0.005, 1, 0], 6, 1)
    c.resolve([p])
    expect(Math.abs(p.positions[0] - p.positions[15])).toBeGreaterThanOrEqual(2 * c.radius - 1e-4)
  })
})
