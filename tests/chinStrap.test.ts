import { describe, it, expect } from 'vitest'
import { stepChinStrap } from '../src/renderer/garment/chinStrap'

// A strap between two hat-side anchors at the same height, slack enough to sag.
const A = [-0.08, 1.5, 0.02] as const
const B = [0.08, 1.5, 0.02] as const
const N = 6
const segLen = 0.05 // total ~0.35 m across a ~0.16 m gap → plenty of slack to hang

const fresh = (): { pos: Float32Array; prev: Float32Array } => {
  // seed the interior points on the straight line A→B
  const pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const t = (i + 1) / (N + 1)
    pos[i * 3] = A[0] + (B[0] - A[0]) * t
    pos[i * 3 + 1] = A[1] + (B[1] - A[1]) * t
    pos[i * 3 + 2] = A[2] + (B[2] - A[2]) * t
  }
  return { pos, prev: pos.slice() }
}

const settle = (): Float32Array => {
  const { pos, prev } = fresh()
  for (let i = 0; i < 200; i++) stepChinStrap(pos, prev, N, ...A, ...B, segLen, 1 / 60)
  return pos
}

describe('chin-strap physics (two-anchor verlet strand)', () => {
  it('sags under the jaw into a catenary — the middle hangs below the anchors', () => {
    const pos = settle()
    const midY = pos[Math.floor(N / 2) * 3 + 1]
    expect(midY).toBeLessThan(A[1] - 0.02) // hangs at least 2 cm below the hat-side anchors
  })

  it('is a stable catenary — symmetric, finite, links held near rest length', () => {
    const pos = settle()
    for (const v of pos) expect(Number.isFinite(v)).toBe(true)
    // symmetric about centre in x (mirror anchors → mirror strand)
    const first = pos[0]
    const last = pos[(N - 1) * 3]
    expect(first).toBeCloseTo(-last, 2)
    // each link stays near the rest segment length (constraints hold)
    const p = [A, ...Array.from({ length: N }, (_, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]] as const), B]
    for (let i = 0; i < p.length - 1; i++) {
      const d = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1], p[i + 1][2] - p[i][2])
      expect(d).toBeGreaterThan(segLen * 0.6)
      expect(d).toBeLessThan(segLen * 1.4)
    }
  })

  it('a taut strap (short segments) barely sags vs a slack one', () => {
    const taut = (() => {
      const { pos, prev } = fresh()
      for (let i = 0; i < 200; i++) stepChinStrap(pos, prev, N, ...A, ...B, 0.028, 1 / 60) // ~0.2 m total, just spans the gap
      return pos
    })()
    const slack = settle()
    const tautSag = A[1] - taut[Math.floor(N / 2) * 3 + 1]
    const slackSag = A[1] - slack[Math.floor(N / 2) * 3 + 1]
    expect(slackSag).toBeGreaterThan(tautSag) // more slack → more sag
  })
})
