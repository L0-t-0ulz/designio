/**
 * **Front closures** beyond a single button row and a zip.
 *
 * Double-breasted is two staggered columns. A frog is a pair of knots sitting
 * off centre. A toggle is a short bar, and there are fewer of them than buttons.
 * A zip has no marks — the tape and pull are drawn separately.
 *
 * Positions are fractions of the placket (y = 0 at the hem, 1 at the top) and
 * metres off centre-front. Pure + unit-tested.
 */

export type ClosureStyle = 'button' | 'zip' | 'double-breasted' | 'frog' | 'toggle'
export const CLOSURE_STYLES: ClosureStyle[] = ['button', 'zip', 'double-breasted', 'frog', 'toggle']

export interface ClosureMark {
  /** Metres off centre-front. Positive is the wearer's left. */
  x: number
  /** 0 at the hem, 1 at the top of the placket. */
  y: number
  kind: 'button' | 'frog' | 'toggle'
}

export function isClosureStyle(v: string): v is ClosureStyle {
  return (CLOSURE_STYLES as string[]).includes(v)
}

/** The layer's choice, else the garment's default, else a button placket. */
export function resolveClosureStyle(chosen?: ClosureStyle, fallback?: ClosureStyle): ClosureStyle {
  return chosen ?? fallback ?? 'button'
}

export function closureMarks(style: ClosureStyle, count: number): ClosureMark[] {
  if (style === 'zip') return []
  const n = Math.max(2, Math.min(9, Math.round(Number.isFinite(count) ? count : 5)))
  const ys = Array.from({ length: n }, (_, i) => (i + 0.5) / n)
  if (style === 'double-breasted') {
    const marks: ClosureMark[] = []
    for (const y of ys) {
      marks.push({ x: -0.018, y, kind: 'button' })
      marks.push({ x: 0.018, y: Math.min(0.98, y + 0.035), kind: 'button' })
    }
    return marks
  }
  if (style === 'frog') {
    const marks: ClosureMark[] = []
    for (const y of ys) {
      marks.push({ x: -0.014, y, kind: 'frog' })
      marks.push({ x: 0.014, y, kind: 'frog' })
    }
    return marks
  }
  if (style === 'toggle') {
    const tn = Math.max(2, Math.round(n * 0.6))
    return Array.from({ length: tn }, (_, i) => ({ x: 0, y: (i + 0.5) / tn, kind: 'toggle' as const }))
  }
  return ys.map((y) => ({ x: 0, y, kind: 'button' as const }))
}
