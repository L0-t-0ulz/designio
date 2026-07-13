import type { Pt } from './drawnPanel'
import { ARRANGEMENT_POINTS, type PlacedPanel, type SeamDef } from './arrangement'

/**
 * Internal shapes & notches — darts, internal cut-outs, drill holes and seam
 * notches authored on a panel. Darts and cut-outs remove REAL lattice fabric
 * (`panelGrid` holes): a cut-out renders as a see-through hole, and a dart's
 * wedge is stitched closed (`dartStitches`) so the panel takes up fabric and
 * bows into 3D shape — the physical behaviour of a sewn dart. Notches and
 * drill holes are pattern MARKS (they guide cutting/sewing, not the sim) and
 * land on the flat-pattern export.
 */

/** A dart: a wedge of fabric from `base` (on/near an edge) narrowing to `apex`,
 *  removed from the lattice and stitched closed. */
export interface Dart {
  apex: Pt
  /** Centre of the wedge mouth (usually on the panel edge). */
  base: Pt
  /** Full width of the wedge mouth (m) — the fabric take-up. */
  width: number
}

/** The dart's wedge polygon (a triangle: apex + the two mouth corners,
 *  perpendicular to the apex→base axis). */
export function dartWedge(d: Dart): Pt[] {
  const ax = d.base.x - d.apex.x
  const ay = d.base.y - d.apex.y
  const len = Math.hypot(ax, ay) || 1
  // unit perpendicular to the dart axis
  const px = -ay / len
  const py = ax / len
  const h = d.width / 2
  return [
    d.apex,
    { x: d.base.x + px * h, y: d.base.y + py * h },
    { x: d.base.x - px * h, y: d.base.y - py * h }
  ]
}

/** A seam notch (alignment tick) at a normalised position along an edge, or a
 *  drill hole (small marked circle) at a point — flat-pattern marks only. */
export interface PanelMarks {
  /** Notch positions as fractions [0..1] along the piece outline's perimeter. */
  notches?: number[]
  /** Drill-hole centres (panel space, m). */
  drills?: Pt[]
}

/** Point at a normalised arc position along a closed outline (for notch marks). */
export function outlinePointAt(outline: Pt[], t: number): Pt {
  const n = outline.length
  let total = 0
  const seg: number[] = []
  for (let i = 0; i < n; i++) {
    const d = Math.hypot(outline[(i + 1) % n].x - outline[i].x, outline[(i + 1) % n].y - outline[i].y)
    seg.push(d)
    total += d
  }
  let target = ((t % 1) + 1) % 1 * total
  for (let i = 0; i < n; i++) {
    if (target <= seg[i] || i === n - 1) {
      const k = seg[i] > 0 ? target / seg[i] : 0
      const a = outline[i]
      const b = outline[(i + 1) % n]
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
    target -= seg[i]
  }
  return outline[0]
}

/**
 * The demo (`?internalShapes=demo`): the arrangement bodice with two waist
 * darts stitched closed on the front (real take-up — the waist pulls in and
 * the panel bows over the bust line) and a keyhole cut-out on the back.
 */
export function demoInternalShapes(): { panels: PlacedPanel[]; seams: SeamDef[] } {
  const top = 0.48
  const hem = 0.06
  const waistY = 0.28
  // hem wide enough to skim the hips — a hem ring narrower than the body reads
  // as clip-through where the stretch pulls the cloth flat against the skin
  const face = (): Pt[] => [
    { x: -0.17, y: top },
    { x: 0.17, y: top },
    { x: 0.14, y: waistY },
    { x: 0.19, y: hem },
    { x: -0.19, y: hem },
    { x: -0.14, y: waistY }
  ]
  // shallow darts: visible take-up without pulling the hem skin-tight (a
  // deeper dart reads as body clip-through at the concave waist kink)
  const darts: Dart[] = [
    { apex: { x: -0.07, y: 0.4 }, base: { x: -0.07, y: hem }, width: 0.025 },
    { apex: { x: 0.07, y: 0.4 }, base: { x: 0.07, y: hem }, width: 0.025 }
  ]
  // keyhole cut-out, upper back — near the pinned top band so gravity doesn't
  // collapse the unsupported ring into a slit
  const keyhole: Pt[] = Array.from({ length: 14 }, (_, k) => {
    const a = (k / 14) * Math.PI * 2
    return { x: 0.03 * Math.sin(a), y: 0.43 + 0.035 * Math.cos(a) }
  })
  const panels: PlacedPanel[] = [
    { outline: face(), at: ARRANGEMENT_POINTS.front, sewnHoles: darts.map(dartWedge) },
    { outline: face(), at: ARRANGEMENT_POINTS.back, holes: [keyhole] }
  ]
  const seams: SeamDef[] = [
    { a: 0, aSide: 'right', b: 1, bSide: 'left' },
    { a: 1, aSide: 'right', b: 0, bSide: 'left' }
  ]
  return { panels, seams }
}
