import { describe, it, expect } from 'vitest'
import { ClothCollision, type SimPieceView } from '../src/renderer/cloth/ClothCollision'

/**
 * Headwear-over-headwear: two knit layers on one head (a liner under a shell) must
 * stay layered — the shell rides OVER the liner instead of sinking through it. The
 * inter-garment repulsion (the same global pass the stack runs) keeps every
 * cross-piece particle a cloth thickness apart. Here we drive it directly on two
 * concentric rings around the head.
 */
const RADIAL = 16
const CENTER = [0, 1.6, 0] as const

// a ring of RADIAL particles around the head axis at radius r (one piece)
const ring = (r: number): SimPieceView => {
  const pos: number[] = []
  for (let i = 0; i < RADIAL; i++) {
    const a = (i / RADIAL) * Math.PI * 2
    pos.push(CENTER[0] + Math.cos(a) * r, CENTER[1], CENTER[2] + Math.sin(a) * r)
  }
  const f = new Float32Array(pos)
  return { positions: f, prev: f.slice(), invMass: new Float32Array(RADIAL).fill(1), nx: RADIAL, ny: 1, wrapX: true, wake: () => {} }
}

const radiusOf = (p: SimPieceView, i: number): number =>
  Math.hypot(p.positions[i * 3] - CENTER[0], p.positions[i * 3 + 2] - CENTER[2])

describe('headwear-over-headwear layering', () => {
  it('the outer shell is pushed to ride over the inner liner (kept a thickness apart)', () => {
    const c = new ClothCollision()
    const liner = ring(0.1) // inner knit
    const shell = ring(0.104) // outer knit — overlapping the liner (gap 4 mm < 2·radius)

    // a few passes, as the stack runs it each step
    for (let k = 0; k < 8; k++) c.resolve([liner, shell])

    // every shell particle now sits OUTSIDE its matching liner particle…
    for (let i = 0; i < RADIAL; i++) expect(radiusOf(shell, i)).toBeGreaterThan(radiusOf(liner, i))

    // …and no shell particle overlaps any liner particle closer than the thickness
    let minGap = Infinity
    for (let a = 0; a < RADIAL; a++)
      for (let b = 0; b < RADIAL; b++) {
        const d = Math.hypot(
          shell.positions[a * 3] - liner.positions[b * 3],
          shell.positions[a * 3 + 1] - liner.positions[b * 3 + 1],
          shell.positions[a * 3 + 2] - liner.positions[b * 3 + 2]
        )
        minGap = Math.min(minGap, d)
      }
    expect(minGap).toBeGreaterThanOrEqual(2 * c.radius - 2e-3)
  })

  it('all particles stay finite through the layering passes', () => {
    const c = new ClothCollision()
    const liner = ring(0.1)
    const shell = ring(0.105)
    for (let k = 0; k < 8; k++) c.resolve([liner, shell])
    for (const p of [liner, shell]) for (const v of p.positions) expect(Number.isFinite(v)).toBe(true)
  })
})
