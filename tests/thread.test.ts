import { describe, it, expect } from 'vitest'
import { threadMetres, THREAD_RATIO } from '../src/renderer/export/thread'

describe('thread consumption', () => {
  it('lockstitch ≈ 2.5× the seam length, plus a 10% waste allowance', () => {
    // 100 cm seam = 1 m → 1 × 2.5 × 1.1 = 2.75 m, rounded to 0.1 → 2.8 m
    expect(threadMetres(100)).toBeCloseTo(2.8, 5)
    expect(threadMetres(1000)).toBeCloseTo(27.5, 5)
  })

  it('scales with the consumption ratio (overlock eats far more)', () => {
    expect(threadMetres(100, THREAD_RATIO.overlock)).toBeGreaterThan(threadMetres(100, THREAD_RATIO.lockstitch))
    expect(threadMetres(100, THREAD_RATIO.overlock)).toBeCloseTo((100 / 100) * 14 * 1.1, 5)
  })

  it('is monotonic in seam length', () => {
    expect(threadMetres(500)).toBeGreaterThan(threadMetres(200))
  })

  it('clamps non-positive inputs to 0', () => {
    expect(threadMetres(0)).toBe(0)
    expect(threadMetres(-50)).toBe(0)
    expect(threadMetres(100, -3)).toBe(0)
  })
})
