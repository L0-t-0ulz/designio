import { describe, it, expect } from 'vitest'
// The golden-image CI's diff math — a plain CJS module so the Electron runner
// (scripts/golden.cjs) and this suite share one implementation.
import { diffStats, formatDiff, dropBottomRows } from '../scripts/imageDiff.cjs'

const px = (...rgba: number[]): Uint8Array => new Uint8Array(rgba)

describe('golden-image pixel diff', () => {
  it('identical buffers → zero differing pixels', () => {
    const a = px(10, 20, 30, 255, 200, 100, 50, 255)
    const s = diffStats(a, new Uint8Array(a))
    expect(s).toEqual({ comparable: true, total: 2, differing: 0, pct: 0, maxDelta: 0 })
  })

  it('counts a pixel once when any channel exceeds the threshold', () => {
    const a = px(10, 20, 30, 255, 200, 100, 50, 255)
    const b = px(10, 20, 60, 255, 200, 100, 50, 255) // +30 on one channel of px 0
    const s = diffStats(a, b, { threshold: 8 })
    expect(s.differing).toBe(1)
    expect(s.pct).toBe(50)
    expect(s.maxDelta).toBe(30)
  })

  it('the threshold masks sub-threshold noise (default 8)', () => {
    const a = px(10, 20, 30, 255)
    const b = px(18, 12, 38, 255) // all deltas = 8, none > 8
    const s = diffStats(a, b)
    expect(s.differing).toBe(0)
    expect(s.maxDelta).toBe(8) // still reported, for the CI log
  })

  it('ignores the alpha channel (captures are opaque)', () => {
    const a = px(10, 20, 30, 255)
    const b = px(10, 20, 30, 0)
    expect(diffStats(a, b).differing).toBe(0)
  })

  it('size mismatch / ragged buffers are not comparable (never a silent pass)', () => {
    expect(diffStats(px(1, 2, 3, 4), px(1, 2, 3, 4, 5, 6, 7, 8)).comparable).toBe(false)
    expect(diffStats(px(1, 2, 3), px(1, 2, 3)).comparable).toBe(false)
    expect(diffStats(px(1, 2, 3, 4), px(1, 2, 3, 4, 5, 6, 7, 8)).pct).toBe(100)
  })

  it('dropBottomRows trims exactly the status-bar strip (zero-copy view)', () => {
    // a 2×3 image: rows r0 r1 r2, 4 bytes/px
    const buf = new Uint8Array(2 * 3 * 4).map((_, i) => i)
    const kept = dropBottomRows(buf, 2, 1)
    expect(kept.length).toBe(2 * 2 * 4) // two rows survive
    expect(kept[0]).toBe(buf[0]) // same storage, not a copy
    expect(dropBottomRows(buf, 2, 0).length).toBe(buf.length)
    expect(dropBottomRows(buf, 2, 99).length).toBe(0) // over-trim clamps, never throws
  })

  it('formats a one-line CI summary', () => {
    const s = diffStats(px(10, 20, 30, 255, 1, 1, 1, 255), px(10, 20, 90, 255, 1, 1, 1, 255))
    expect(formatDiff('dress-mesh', s)).toBe('dress-mesh: 1/2 px differ (50.000%), max channel delta 60')
    expect(formatDiff('x', diffStats(px(1, 2, 3), px(1)))).toContain('NOT COMPARABLE')
  })
})
