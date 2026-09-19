/**
 * **Grid + ruler for the 2D pattern** — a measured background behind the panels, so a
 * designer can read a panel's real size off the sheet instead of exporting it and
 * measuring elsewhere.
 *
 * The pattern SVG's user units are millimetres, so a tick every 10 units is a tick
 * every centimetre. Spacing, tick positions and label text are pure and unit-tested;
 * `panelsToSVG` drops the returned `<g>` in behind the panels.
 */

/** Minor lines this far apart, in mm, at the loosest. Ladder is 1 · 2 · 5 · 10 cm. */
const STEPS_MM = [10, 20, 50, 100, 200, 500]

/** Roughly how many minor lines we want across the longest side. More than this and
 *  the grid turns into a grey wash; far fewer and it stops being useful. */
const TARGET_LINES = 40

/** Every Nth minor line is drawn heavier and gets a ruler label. */
export const MAJOR_EVERY = 5

/**
 * Minor-line spacing in mm for a sheet of this size — the smallest step on the
 * 1/2/5 ladder that keeps the line count at or under `TARGET_LINES`, so a tiny cuff
 * sheet gets a 1 cm grid and a full coat sheet a coarser one.
 */
export function gridStepMm(spanMm: number, target = TARGET_LINES): number {
  const span = Math.max(spanMm, 0)
  for (const step of STEPS_MM) if (span / step <= target) return step
  return STEPS_MM[STEPS_MM.length - 1]
}

/** Tick positions from 0 up to and including `span` where it lands exactly. */
export function gridTicks(span: number, step: number): number[] {
  if (!(step > 0) || !(span > 0) || !Number.isFinite(span) || !Number.isFinite(step)) return []
  const out: number[] = []
  // count-driven rather than accumulating, so float drift can't shift later ticks
  const n = Math.floor(span / step)
  for (let i = 0; i <= n; i++) out.push(i * step)
  return out
}

/** A ruler label in centimetres — whole numbers stay whole ("15", not "15.0"). */
export function rulerLabel(mm: number): string {
  const cm = mm / 10
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1)
}

const MINOR = '#e2e6ef'
const MAJOR = '#c3cad8'
const TEXT = '#8a93a6'

/**
 * The grid `<g>`, sized to the sheet. Drawn first so panels sit on top of it, and
 * marked `pointer-events="none"` so it can never swallow a click meant for a panel or
 * a pattern note.
 *
 * Returns '' for a degenerate sheet rather than emitting an empty group.
 */
export function patternGridSVG(widthMm: number, heightMm: number): string {
  if (!(widthMm > 0) || !(heightMm > 0)) return ''
  const step = gridStepMm(Math.max(widthMm, heightMm))
  const xs = gridTicks(widthMm, step)
  const ys = gridTicks(heightMm, step)
  const isMajor = (i: number): boolean => i % MAJOR_EVERY === 0

  const lines: string[] = []
  xs.forEach((x, i) => {
    lines.push(
      `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${heightMm.toFixed(1)}" stroke="${isMajor(i) ? MAJOR : MINOR}" stroke-width="${isMajor(i) ? 0.8 : 0.4}"/>`
    )
  })
  ys.forEach((y, i) => {
    lines.push(
      `<line x1="0" y1="${y.toFixed(1)}" x2="${widthMm.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${isMajor(i) ? MAJOR : MINOR}" stroke-width="${isMajor(i) ? 0.8 : 0.4}"/>`
    )
  })

  // Ruler numbers on the major lines only — every minor line labelled is unreadable.
  const labels: string[] = []
  xs.forEach((x, i) => {
    if (i && isMajor(i)) labels.push(`<text x="${(x + 2).toFixed(1)}" y="10" font-size="8" fill="${TEXT}">${rulerLabel(x)}</text>`)
  })
  ys.forEach((y, i) => {
    if (i && isMajor(i)) labels.push(`<text x="2" y="${(y - 2).toFixed(1)}" font-size="8" fill="${TEXT}">${rulerLabel(y)}</text>`)
  })

  const unit = `<text x="2" y="10" font-size="8" fill="${TEXT}">cm</text>`
  return `<g class="pattern-grid" pointer-events="none">${lines.join('')}${labels.join('')}${unit}</g>`
}
