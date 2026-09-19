import type { PatternPanel } from './garmentPattern'

/**
 * **Pattern piece count** for the spec sheet — the two numbers a cutting room asks
 * for first.
 *
 * They are not the same number, and conflating them is the classic way to short a
 * cut: `pieces` is how many distinct pattern pieces the garment is drafted from,
 * `toCut` is how many physical bits of cloth come off the table, because a mirrored
 * piece (`cut: 2`) is one pattern piece and two cut pieces.
 */
export interface PatternPieceCount {
  /** Distinct pattern pieces in the draft. */
  pieces: number
  /** Physical pieces to cut, counting mirrors and multiples. */
  toCut: number
  /** Per-piece detail, in draft order, for the spec-sheet table. */
  breakdown: { name: string; cut: number }[]
}

/**
 * A panel's cut quantity, defended against a malformed draft. A missing, zero,
 * negative or fractional `cut` means at least one piece — a spec sheet that tells a
 * factory to cut zero of something is worse than one that rounds.
 */
export function cutQuantity(panel: Pick<PatternPanel, 'cut'>): number {
  const n = Math.floor(panel.cut)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function patternPieceCount(panels: readonly Pick<PatternPanel, 'name' | 'cut'>[]): PatternPieceCount {
  const breakdown = panels.map((p) => ({ name: p.name, cut: cutQuantity(p) }))
  return {
    pieces: breakdown.length,
    toCut: breakdown.reduce((n, p) => n + p.cut, 0),
    breakdown
  }
}

/** One-line summary for the spec sheet, e.g. "7 pieces · 12 to cut". The two are
 *  shown together precisely because they differ whenever anything is mirrored. */
export function pieceCountSummary(c: PatternPieceCount): string {
  const pieces = `${c.pieces} piece${c.pieces === 1 ? '' : 's'}`
  return `${pieces} · ${c.toCut} to cut`
}
