'use strict'
/**
 * Pure pixel-diff math for the golden-image CI (`scripts/golden.cjs`) — kept as
 * a plain CJS module so the Electron runner and the vitest suite share ONE
 * implementation. Buffers are raw 4-bytes-per-pixel (BGRA/RGBA — a per-channel
 * compare is order-agnostic); alpha is ignored (captures are opaque).
 */

/**
 * Compare two raw pixel buffers. A pixel "differs" when any colour channel
 * deviates by more than `threshold` (0–255). Returns population stats — the
 * caller decides the pass bar (e.g. differing% < 1).
 */
function diffStats(a, b, opts = {}) {
  const threshold = opts.threshold ?? 8
  if (a.length !== b.length || a.length % 4 !== 0) {
    return { comparable: false, total: 0, differing: 0, pct: 100, maxDelta: 255 }
  }
  const total = a.length / 4
  let differing = 0
  let maxDelta = 0
  for (let i = 0; i < a.length; i += 4) {
    let d = Math.abs(a[i] - b[i])
    const d1 = Math.abs(a[i + 1] - b[i + 1])
    const d2 = Math.abs(a[i + 2] - b[i + 2])
    if (d1 > d) d = d1
    if (d2 > d) d = d2
    if (d > maxDelta) maxDelta = d
    if (d > threshold) differing++
  }
  return { comparable: true, total, differing, pct: total ? (100 * differing) / total : 0, maxDelta }
}

/** One-line human summary for the CI log. */
function formatDiff(name, s) {
  if (!s.comparable) return `${name}: NOT COMPARABLE (size mismatch)`
  return `${name}: ${s.differing}/${s.total} px differ (${s.pct.toFixed(3)}%), max channel delta ${s.maxDelta}`
}

/**
 * Drop the bottom `rows` pixel rows (a zero-copy subarray view) — the golden
 * runner trims the status bar this way, whose live fps/step readout is the one
 * legitimately nondeterministic strip of the shell.
 */
function dropBottomRows(buf, pxWidth, rows) {
  const bytes = Math.max(0, Math.min(buf.length, rows * pxWidth * 4))
  return buf.subarray(0, buf.length - bytes)
}

module.exports = { diffStats, formatDiff, dropBottomRows }
