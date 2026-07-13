/** Types for imageDiff.cjs — shared by scripts/golden.cjs and the vitest suite. */
export interface DiffStats {
  comparable: boolean
  total: number
  differing: number
  pct: number
  maxDelta: number
}
export function diffStats(a: Uint8Array, b: Uint8Array, opts?: { threshold?: number }): DiffStats
export function formatDiff(name: string, s: DiffStats): string
export function dropBottomRows(buf: Uint8Array, pxWidth: number, rows: number): Uint8Array
