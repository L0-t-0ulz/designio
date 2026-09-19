import type { Pt } from './garmentPattern'
import type { SizeLabel } from '../studio/document'

/**
 * **Grade nest** — every size of a panel drawn on top of the others from a common
 * reference point, which is how a pattern grader reads a grade.
 *
 * The nest is the only view that shows the *progression*: whether the sizes step
 * evenly, whether the grade opens up where it should, and whether one size has been
 * drafted out of line with its neighbours. A stack of separate panels cannot show
 * any of that.
 *
 * Pure geometry + unit-tested.
 */

/**
 * Where the sizes are pinned together.
 *
 * A real nest is aligned on the pattern's **grade reference point** — a specific
 * marked point the grade radiates from, which the draft has to name. Absent that,
 * these are neutral, well-defined choices:
 *
 *  - `top-centre` — the default, and closest to how a bodice is conventionally
 *    graded: girth grows outward from the centre and length grows downward, so the
 *    neck/shoulder end stays put and the differences accumulate toward the hem.
 *  - `centroid` — growth spread symmetrically in every direction; useful for a
 *    panel with no obvious "top", like a pocket or a cuff.
 *  - `origin` — the outlines as drafted, not moved at all.
 */
export type NestAnchor = 'top-centre' | 'centroid' | 'origin'

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function outlineBounds(outline: readonly Pt[]): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of outline) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

/** The point on `outline` that the chosen anchor pins. */
export function anchorPoint(outline: readonly Pt[], anchor: NestAnchor): Pt {
  if (!outline.length || anchor === 'origin') return { x: 0, y: 0 }
  const b = outlineBounds(outline)
  if (anchor === 'top-centre') return { x: (b.minX + b.maxX) / 2, y: b.minY }
  // centroid: the area centroid, not the vertex mean, so an unevenly sampled
  // outline does not drag the anchor toward its densest side
  let a2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]
    const q = outline[(i + 1) % outline.length]
    const cross = p.x * q.y - q.x * p.y
    a2 += cross
    cx += (p.x + q.x) * cross
    cy += (p.y + q.y) * cross
  }
  if (Math.abs(a2) < 1e-12) return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }
  return { x: cx / (3 * a2), y: cy / (3 * a2) }
}

export interface NestedSize {
  size: SizeLabel
  outline: Pt[]
}

/** Translate every size so their anchor points coincide at the origin. */
export function alignNest(sizes: readonly NestedSize[], anchor: NestAnchor = 'top-centre'): NestedSize[] {
  return sizes.map(({ size, outline }) => {
    const a = anchorPoint(outline, anchor)
    return { size, outline: outline.map((p) => ({ x: p.x - a.x, y: p.y - a.y })) }
  })
}

/** Bounds covering every size in an aligned nest. */
export function nestBounds(nest: readonly NestedSize[]): Bounds {
  const all = nest.flatMap((n) => n.outline)
  return all.length ? outlineBounds(all) : { minX: 0, minY: 0, maxX: 0, maxY: 0 }
}

/**
 * Horizontal half-width of each size at a given height, measured from the anchor.
 *
 * This is what makes the nest checkable rather than merely decorative: for a uniform
 * girth grade the gaps between consecutive sizes should be equal, and a size drafted
 * out of line shows up as an uneven step.
 *
 * Returns null for a size whose outline does not span that height.
 */
export function halfWidthsAt(nest: readonly NestedSize[], y: number): (number | null)[] {
  return nest.map(({ outline }) => {
    let maxX: number | null = null
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i]
      const b = outline[(i + 1) % outline.length]
      // does the edge cross this height?
      const lo = Math.min(a.y, b.y)
      const hi = Math.max(a.y, b.y)
      if (y < lo || y > hi || lo === hi) continue
      const t = (y - a.y) / (b.y - a.y)
      const x = a.x + t * (b.x - a.x)
      if (maxX === null || x > maxX) maxX = x
    }
    return maxX
  })
}

/**
 * Steps between consecutive sizes at a height — the grade increments as drawn.
 * `null` where either neighbour does not reach that height.
 */
export function gradeStepsAt(nest: readonly NestedSize[], y: number): (number | null)[] {
  const w = halfWidthsAt(nest, y)
  const steps: (number | null)[] = []
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]
    const b = w[i]
    steps.push(a === null || b === null ? null : b - a)
  }
  return steps
}

/** Whether the drawn steps are even to within `tolerance` (mm). */
export function isEvenGrade(steps: readonly (number | null)[], tolerance = 0.5): boolean {
  const real = steps.filter((s): s is number => s !== null)
  if (real.length < 2) return true
  const first = real[0]
  return real.every((s) => Math.abs(s - first) <= tolerance)
}

/** Distinct hues across the run, smallest size coolest. */
export function nestColor(index: number, count: number): string {
  const t = count <= 1 ? 0 : index / (count - 1)
  const hue = 210 - t * 190 // blue → red, the way a size run is conventionally drawn
  return `hsl(${hue.toFixed(0)}, 70%, 45%)`
}

/** The nest as a standalone SVG, in millimetres, with a size key. */
export function nestSVG(nest: readonly NestedSize[], opts: { marginMm?: number; label?: string } = {}): string {
  if (!nest.length) return ''
  const margin = opts.marginMm ?? 20
  const b = nestBounds(nest)
  const w = b.maxX - b.minX + margin * 2
  const h = b.maxY - b.minY + margin * 2
  const dx = margin - b.minX
  const dy = margin - b.minY
  const paths = nest
    .map((n, i) => {
      const d = n.outline.map((p, k) => `${k === 0 ? 'M' : 'L'}${(p.x + dx).toFixed(1)},${(p.y + dy).toFixed(1)}`).join(' ') + ' Z'
      // the base size heavier, so the nest reads as a grade around a block
      const base = n.size === 'M'
      return `<path d="${d}" fill="none" stroke="${nestColor(i, nest.length)}" stroke-width="${base ? 1.6 : 0.9}"${base ? '' : ' stroke-dasharray="4 3"'}/>`
    })
    .join('')
  const key = nest
    .map((n, i) => `<text x="${(margin + i * 46).toFixed(0)}" y="${(h - 6).toFixed(0)}" font-size="11" fill="${nestColor(i, nest.length)}">${n.size}</text>`)
    .join('')
  const title = opts.label ? `<text x="${margin}" y="${(margin - 6).toFixed(0)}" font-size="12" fill="#555">${opts.label}</text>` : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}mm" height="${h.toFixed(0)}mm" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}">
  <rect width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#fff"/>
  ${title}${paths}${key}
</svg>`
}
