import { outlineArea, type Pt } from './drawnPanel'
import { ARRANGEMENT_POINTS, type PlacedPanel, type SeamDef } from './arrangement'
import { outlinePointAt } from './panelFeatures'

/**
 * Style lines — draw a seam path across a panel and it splits into separate
 * pattern pieces (yoke + body, princess seam, colour-block), which re-sew
 * along the cut via the arrangement machinery's eased seam pairing. Pure math:
 * `splitOutline` cuts a closed outline with a polyline, `demoStyleLines`
 * composes a colour-blocked bodice from the split pieces + whole back, and
 * `outlinesToSVG` exports the pieces as separate flat pattern panels.
 */

interface Crossing {
  /** Position along the whole cut path (segment index + t). */
  cutPos: number
  /** Outline edge index the cut crosses (edge i = outline[i] → outline[i+1]). */
  edge: number
  /** Parameter along that outline edge. */
  edgeT: number
  point: Pt
}

/** Segment×segment intersection (proper crossings only). */
function intersect(a0: Pt, a1: Pt, b0: Pt, b1: Pt): { s: number; t: number; point: Pt } | null {
  const dax = a1.x - a0.x
  const day = a1.y - a0.y
  const dbx = b1.x - b0.x
  const dby = b1.y - b0.y
  const den = dax * dby - day * dbx
  if (Math.abs(den) < 1e-12) return null
  const s = ((b0.x - a0.x) * dby - (b0.y - a0.y) * dbx) / den
  const t = ((b0.x - a0.x) * day - (b0.y - a0.y) * dax) / den
  if (s < -1e-9 || s > 1 + 1e-9 || t < -1e-9 || t > 1 + 1e-9) return null
  return { s: Math.min(1, Math.max(0, s)), t: Math.min(1, Math.max(0, t)), point: { x: a0.x + s * dax, y: a0.y + s * day } }
}

/**
 * Split a closed outline along a polyline cut path. The path must cross the
 * boundary exactly twice (a simple style line — its ends may lie outside the
 * panel); returns the two closed pieces, each carrying the cut path as its new
 * edge, or null when the path doesn't cut cleanly.
 */
export function splitOutline(outline: Pt[], path: Pt[]): [Pt[], Pt[]] | null {
  if (outline.length < 3 || path.length < 2) return null
  const crossings: Crossing[] = []
  for (let s = 0; s < path.length - 1; s++) {
    for (let e = 0; e < outline.length; e++) {
      const hit = intersect(path[s], path[s + 1], outline[e], outline[(e + 1) % outline.length])
      if (hit) crossings.push({ cutPos: s + hit.s, edge: e, edgeT: hit.t, point: hit.point })
    }
  }
  if (crossings.length < 2) return null
  crossings.sort((a, b) => a.cutPos - b.cutPos)
  const A = crossings[0]
  const B = crossings[crossings.length - 1]
  if (A.edge === B.edge && Math.abs(A.edgeT - B.edgeT) < 1e-9) return null

  // the cut path between the two crossings (interior vertices only)
  const inner: Pt[] = [A.point]
  for (let s = Math.ceil(A.cutPos); s <= Math.floor(B.cutPos); s++) {
    if (s > A.cutPos && s < B.cutPos) inner.push(path[s])
  }
  inner.push(B.point)

  // walk the outline from A forward to B → piece 1; B forward to A → piece 2
  const walk = (from: Crossing, to: Crossing): Pt[] => {
    const pts: Pt[] = []
    let e = (from.edge + 1) % outline.length
    // guard: same edge with to further along — no outline vertices between
    if (from.edge === to.edge && to.edgeT > from.edgeT) return pts
    while (true) {
      pts.push(outline[e])
      if (e === to.edge) break
      e = (e + 1) % outline.length
      if (pts.length > outline.length + 1) break // safety
    }
    return pts
  }
  const piece1 = [...inner, ...walk(B, A)] // cut A→B, then outline B→A
  const piece2 = [...inner.slice().reverse(), ...walk(A, B)] // cut B→A, then outline A→B

  if (Math.abs(outlineArea(piece1)) < 1e-8 || Math.abs(outlineArea(piece2)) < 1e-8) return null
  return [piece1, piece2]
}

/** The two pieces ordered left/right (or bottom/top) by centroid — callers name
 *  them for seam sides. */
export function orderPieces(pieces: [Pt[], Pt[]], axis: 'x' | 'y'): [Pt[], Pt[]] {
  const centroid = (poly: Pt[]): number => poly.reduce((s, p) => s + p[axis], 0) / poly.length
  return centroid(pieces[0]) <= centroid(pieces[1]) ? pieces : [pieces[1], pieces[0]]
}

/**
 * The demo (`?styleLines=demo`): the arrangement bodice's waisted front split
 * by a princess-style curved vertical line into a colour-block pair, re-sewn
 * along the cut; the back stays whole. Three panels, three seams — all driven
 * by the stock arrangement machinery.
 */
export function demoStyleLines(): { panels: PlacedPanel[]; seams: SeamDef[] } {
  const top = 0.48
  const hem = 0.06
  const waistY = 0.28
  const front: Pt[] = [
    { x: -0.17, y: top },
    { x: 0.17, y: top },
    { x: 0.13, y: waistY },
    { x: 0.16, y: hem },
    { x: -0.16, y: hem },
    { x: -0.13, y: waistY }
  ]
  // princess-style curve, offset left of centre, bowing with the waist
  const cut: Pt[] = [
    { x: -0.045, y: top + 0.02 },
    { x: -0.06, y: waistY },
    { x: -0.05, y: hem - 0.02 }
  ]
  const split = splitOutline(front, cut)
  if (!split) throw new Error('demo style line failed to cut the front panel')
  const [left, right] = orderPieces(split, 'x')
  const back: Pt[] = front.map((p) => ({ x: p.x, y: p.y }))
  const panels: PlacedPanel[] = [
    { outline: left, at: ARRANGEMENT_POINTS.front },
    { outline: right, at: ARRANGEMENT_POINTS.front },
    { outline: back, at: ARRANGEMENT_POINTS.back }
  ]
  const seams: SeamDef[] = [
    { a: 0, aSide: 'right', b: 1, bSide: 'left' }, // the style line, re-sewn
    { a: 1, aSide: 'right', b: 2, bSide: 'left' }, // body side seams
    { a: 2, aSide: 'right', b: 0, bSide: 'left' }
  ]
  return { panels, seams }
}

/** Export split pieces as separate flat pattern panels (pure SVG, mm scale,
 *  pieces laid side by side with labels — the style-line counterpart of
 *  `patternToSVG`). */
export interface ExportPiece {
  name: string
  outline: Pt[]
  /** Internal cut-outs — dashed inner polygons. */
  holes?: Pt[][]
  /** Dart wedges — dash-dot fold wedges. */
  sewnHoles?: Pt[][]
  /** Seam notches: normalised arc positions [0..1] along the outline — ticks. */
  notches?: number[]
  /** Drill holes: marked circles (panel space, m). */
  drills?: Pt[]
}

export function outlinesToSVG(pieces: ExportPiece[], seamAllowanceM = 0.01): string {
  const M = 20 // page margin, mm
  const GAP = 30
  const sa = seamAllowanceM * 1000
  let x0 = M
  let maxH = 0
  const blocks: string[] = []
  for (const piece of pieces) {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const p of piece.outline) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    const w = (maxX - minX) * 1000
    const h = (maxY - minY) * 1000
    const X = (p: Pt): string => (x0 + sa + (p.x - minX) * 1000).toFixed(1)
    const Y = (p: Pt): string => (M + sa + (maxY - p.y) * 1000).toFixed(1)
    const poly = (o: Pt[]): string => o.map((p) => `${X(p)},${Y(p)}`).join(' ')
    blocks.push(
      `<polygon points="${poly(piece.outline)}" fill="none" stroke="#111" stroke-width="0.6"/>`,
      `<text x="${(x0 + sa + w / 2).toFixed(1)}" y="${(M + sa + h / 2).toFixed(1)}" font-size="10" text-anchor="middle" fill="#666">${piece.name}</text>`
    )
    // internal cut-outs (cut away) vs dart wedges (fold + sew) get distinct dashes
    for (const hole of piece.holes ?? []) {
      blocks.push(`<polygon points="${poly(hole)}" fill="none" stroke="#111" stroke-width="0.4" stroke-dasharray="3 2"/>`)
    }
    for (const wedge of piece.sewnHoles ?? []) {
      blocks.push(`<polygon points="${poly(wedge)}" fill="none" stroke="#111" stroke-width="0.4" stroke-dasharray="6 2 1 2"/>`)
    }
    // seam notches: 4 mm ticks pointing into the piece
    let cx = 0
    let cy = 0
    for (const p of piece.outline) {
      cx += p.x
      cy += p.y
    }
    cx /= piece.outline.length
    cy /= piece.outline.length
    for (const t of piece.notches ?? []) {
      const p = outlinePointAt(piece.outline, t)
      const dx = cx - p.x
      const dy = cy - p.y
      const len = Math.hypot(dx, dy) || 1
      const q = { x: p.x + (dx / len) * 0.004, y: p.y + (dy / len) * 0.004 }
      blocks.push(`<line x1="${X(p)}" y1="${Y(p)}" x2="${X(q)}" y2="${Y(q)}" stroke="#111" stroke-width="0.8"/>`)
    }
    for (const d of piece.drills ?? []) {
      blocks.push(`<circle cx="${X(d)}" cy="${Y(d)}" r="2" fill="none" stroke="#111" stroke-width="0.5"/>`)
    }
    x0 += w + 2 * sa + GAP
    maxH = Math.max(maxH, h + 2 * sa)
  }
  const W = (x0 - GAP + M).toFixed(1)
  const H = (maxH + 2 * M).toFixed(1)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n${blocks.join('\n')}\n</svg>`
}
