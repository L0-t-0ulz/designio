import { describe, it, expect } from 'vitest'
import { quiltHeight, quiltNormal, quiltParams, QUILT_PATTERNS, type QuiltPattern } from '../src/renderer/fabric/quilt'

const unit = (n: [number, number, number]): boolean => Math.abs(Math.hypot(...n) - 1) < 1e-6

describe('quilting — channel · diamond · box loft', () => {
  it('lofts to a puff at the cell centre and sinks to a stitch line at the edge', () => {
    const cells = 4
    // channel: centre of a channel is high, the boundary (stitch line) is ~0
    expect(quiltHeight('channel', 0.5 / cells, 0.3, cells)).toBeGreaterThan(0.9)
    expect(quiltHeight('channel', 0, 0.3, cells)).toBeLessThan(0.02)
    // box: centre of a cell is high, a grid line is ~0
    expect(quiltHeight('box', 0.5 / cells, 0.5 / cells, cells)).toBeGreaterThan(0.9)
    expect(quiltHeight('box', 0, 0.5 / cells, cells)).toBeLessThan(0.02)
    expect(quiltHeight('box', 0.5 / cells, 0, cells)).toBeLessThan(0.02)
  })

  it('channel loft runs in one direction (independent of v)', () => {
    const cells = 6
    expect(quiltHeight('channel', 0.3, 0.1, cells)).toBeCloseTo(quiltHeight('channel', 0.3, 0.85, cells), 10)
    // box does depend on v
    expect(quiltHeight('box', 0.3, 0.1, cells)).not.toBeCloseTo(quiltHeight('box', 0.3, 0.85, cells), 3)
  })

  it('every pattern height stays in [0,1] and tiles seamlessly', () => {
    for (const p of QUILT_PATTERNS) {
      for (let i = 0; i <= 16; i++) {
        for (let j = 0; j <= 16; j++) {
          const h = quiltHeight(p, i / 16, j / 16, 5)
          expect(h).toBeGreaterThanOrEqual(0)
          expect(h).toBeLessThanOrEqual(1)
        }
      }
      // periodic per unit → the baked tile repeats without a seam
      expect(quiltHeight(p, 0.24, 0.61, 5)).toBeCloseTo(quiltHeight(p, 1.24, 0.61, 5), 10)
      expect(quiltHeight(p, 0.24, 0.61, 5)).toBeCloseTo(quiltHeight(p, 0.24, 2.61, 5), 10)
    }
  })

  it('the normal is a unit vector, ~flat-up at a pillow top, tilted on the slope', () => {
    const cells = 4
    for (const p of QUILT_PATTERNS) {
      for (let i = 0; i <= 12; i++) for (let j = 0; j <= 12; j++) expect(unit(quiltNormal(p, i / 12, j / 12, cells, 3))).toBe(true)
    }
    const top = quiltNormal('channel', 0.5 / cells, 0.5, cells, 3) // pillow apex
    expect(top[2]).toBeGreaterThan(0.98)
    const slope = quiltNormal('channel', 0.2 / cells, 0.5, cells, 3) // on the way down to a stitch line
    expect(Math.abs(slope[0])).toBeGreaterThan(Math.abs(top[0]) + 0.05)
  })

  it('params are sane (matte puffer, tiles a few times, real loft)', () => {
    for (const p of QUILT_PATTERNS) {
      const q = quiltParams(p)
      expect(q.cells).toBeGreaterThan(0)
      expect(q.repeat).toBeGreaterThan(0)
      expect(q.normalStrength).toBeGreaterThan(1)
      expect(q.roughness).toBeGreaterThan(0.5)
      expect(q.roughness).toBeLessThanOrEqual(0.8)
    }
  })

  it('exposes exactly the advertised patterns', () => {
    const expected: QuiltPattern[] = ['channel', 'diamond', 'box']
    expect([...QUILT_PATTERNS].sort()).toEqual([...expected].sort())
  })
})
