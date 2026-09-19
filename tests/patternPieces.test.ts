import { describe, it, expect } from 'vitest'
import { cutQuantity, patternPieceCount, pieceCountSummary } from '../src/renderer/export/patternPieces'

const p = (name: string, cut: number) => ({ name, cut })

describe('cut quantity', () => {
  it('takes the panel at its word', () => {
    expect(cutQuantity(p('Front', 1)).valueOf()).toBe(1)
    expect(cutQuantity(p('Sleeve', 2))).toBe(2)
  })

  it('never returns zero — a spec sheet saying "cut 0" is worse than one that rounds', () => {
    for (const bad of [0, -3, NaN, Infinity, -Infinity]) expect(cutQuantity(p('x', bad))).toBe(1)
  })

  it('floors a fractional quantity rather than passing it to a cutting room', () => {
    expect(cutQuantity(p('x', 2.7))).toBe(2)
    expect(cutQuantity(p('x', 0.5))).toBe(1) // floors to 0, then clamped up
  })
})

describe('pattern piece count', () => {
  it('separates pattern pieces from pieces to cut', () => {
    // the whole point: a mirrored sleeve is one pattern piece and two cut pieces
    const c = patternPieceCount([p('Front', 1), p('Back', 1), p('Sleeve', 2)])
    expect(c.pieces).toBe(3)
    expect(c.toCut).toBe(4)
  })

  it('is the same number when nothing is mirrored', () => {
    const c = patternPieceCount([p('Front', 1), p('Back', 1)])
    expect(c.pieces).toBe(c.toCut)
  })

  it('handles multiples above two', () => {
    expect(patternPieceCount([p('Gore', 6)]).toCut).toBe(6)
  })

  it('keeps a per-piece breakdown in draft order', () => {
    expect(patternPieceCount([p('Front', 1), p('Sleeve', 2)]).breakdown).toEqual([
      { name: 'Front', cut: 1 },
      { name: 'Sleeve', cut: 2 }
    ])
  })

  it('normalises bad quantities in the breakdown too, not just the total', () => {
    const c = patternPieceCount([p('Front', 0), p('Back', -1)])
    expect(c.breakdown).toEqual([{ name: 'Front', cut: 1 }, { name: 'Back', cut: 1 }])
    expect(c.toCut).toBe(2)
  })

  it('handles an empty draft', () => {
    expect(patternPieceCount([])).toEqual({ pieces: 0, toCut: 0, breakdown: [] })
  })

  it('never reports fewer pieces to cut than pattern pieces', () => {
    for (const panels of [[p('a', 1)], [p('a', 1), p('b', 2)], [p('a', 0), p('b', -5)], []]) {
      const c = patternPieceCount(panels)
      expect(c.toCut).toBeGreaterThanOrEqual(c.pieces)
    }
  })
})

describe('summary line', () => {
  it('reads naturally and shows both numbers', () => {
    expect(pieceCountSummary(patternPieceCount([p('a', 1), p('b', 2)]))).toBe('2 pieces · 3 to cut')
  })

  it('singularises one piece', () => {
    expect(pieceCountSummary(patternPieceCount([p('a', 1)]))).toBe('1 piece · 1 to cut')
  })

  it('copes with an empty draft', () => {
    expect(pieceCountSummary(patternPieceCount([]))).toBe('0 pieces · 0 to cut')
  })
})
