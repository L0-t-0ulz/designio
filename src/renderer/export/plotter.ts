import type { PatternPanel } from './garmentPattern'
import { nestMarker } from './marker'

/**
 * **HPGL / PLT plotter output** — the language garment CAD plotters (Gerber, Lectra,
 * Investronica and the pen/knife plotters that copy them) still speak. A cutting room
 * with a plotter wants a `.plt`, not an SVG.
 *
 * HPGL is a terse command language: `PU` picks the pen up and moves, `PD` puts it
 * down and draws, and every command ends in a semicolon. Coordinates are integers in
 * **plotter units** of 1/40 mm.
 *
 * Pure string generation, so it is unit-tested against the format rather than eyeballed.
 */

/** HPGL's fixed device resolution: 1 plotter unit = 0.025 mm. */
export const PLOTTER_UNITS_PER_MM = 40

export interface Pt {
  x: number
  y: number
}

/** A panel placed on the sheet, in mm, with its outline already in panel-local space. */
export interface PlacedPanel {
  name: string
  outline: Pt[]
  /** Offset of the panel's local origin on the sheet, mm. */
  dx: number
  dy: number
  /** Quarter-turn the panel is plotted at. */
  rotated?: boolean
}

/** Millimetres → plotter units, rounded to the integer grid the device works on. */
export function toPlotterUnits(mm: number): number {
  return Math.round(mm * PLOTTER_UNITS_PER_MM)
}

/**
 * Place a point on the sheet.
 *
 * **HPGL's origin is bottom-left with Y increasing upward**, while pattern space is
 * top-left with Y down. Without the flip every plot comes out mirrored — which a
 * cutting room only discovers after cutting a left front as a right front.
 */
export function placePoint(p: Pt, panel: PlacedPanel, sheetHeightMm: number): { x: number; y: number } {
  const local = panel.rotated ? { x: -p.y, y: p.x } : p
  const x = local.x + panel.dx
  const y = local.y + panel.dy
  return { x: toPlotterUnits(x), y: toPlotterUnits(sheetHeightMm - y) }
}

/** One closed outline as `PU`/`PD` commands. Returns '' for a degenerate outline. */
export function outlineToHPGL(panel: PlacedPanel, sheetHeightMm: number): string {
  if (panel.outline.length < 2) return '' // a point is not a cut line
  const pts = panel.outline.map((p) => placePoint(p, panel, sheetHeightMm))
  const first = pts[0]
  const rest = pts.slice(1).map((p) => `${p.x},${p.y}`)
  // close the loop explicitly: a plotter does not assume a polygon is closed
  rest.push(`${first.x},${first.y}`)
  return `PU${first.x},${first.y};PD${rest.join(',')};`
}

export interface PlotterOptions {
  /** Sheet height (mm) — needed to flip into HPGL's bottom-left origin. */
  sheetHeightMm: number
  /** Pen to select. Plotters map pens to tools; 1 is the conventional draw pen. */
  pen?: number
}

/**
 * A complete HPGL document for a set of placed panels.
 *
 * `IN` initialises the device (resetting any state a previous job left behind), `SP`
 * selects the pen, and the job ends with the pen up and parked so the plotter does
 * not hold a tool down on the media.
 */
export function panelsToHPGL(panels: PlacedPanel[], opts: PlotterOptions): string {
  const pen = Math.max(1, Math.round(opts.pen ?? 1))
  const body = panels
    .map((p) => outlineToHPGL(p, opts.sheetHeightMm))
    .filter((s) => s.length > 0)
    .join('\n')
  return [`IN;`, `SP${pen};`, body, `PU;`, `SP0;`].filter((s) => s.length > 0).join('\n') + '\n'
}

/** Bounds of a panel outline, mm. */
function bounds(outline: Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of outline) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Lay the panels out side by side, in draft order, the way the pattern sheet does —
 * one row, a fixed gap between pieces, each repeated for its cut quantity.
 *
 * Deliberately not nested: this is the "plot the pattern" export, where a pattern
 * cutter wants the pieces recognisable and in order. Nesting to a fabric roll is a
 * different job with different goals.
 */
export function layoutPanelsInRow(panels: readonly PatternPanel[], gapMm = 20, marginMm = 10): { placed: PlacedPanel[]; widthMm: number; heightMm: number } {
  const placed: PlacedPanel[] = []
  let x = marginMm
  let tallest = 0
  for (const panel of panels) {
    const b = bounds(panel.outline)
    if (!Number.isFinite(b.minX)) continue // no geometry to plot
    const w = b.maxX - b.minX
    const h = b.maxY - b.minY
    for (let i = 0; i < Math.max(1, Math.floor(panel.cut)); i++) {
      placed.push({ name: panel.name, outline: panel.outline, dx: x - b.minX, dy: marginMm - b.minY })
      x += w + gapMm
      tallest = Math.max(tallest, h)
    }
  }
  return { placed, widthMm: Math.max(marginMm * 2, x - gapMm + marginMm), heightMm: tallest + marginMm * 2 }
}

/** The pattern as a ready-to-send `.plt`. */
export function patternToHPGL(panels: readonly PatternPanel[]): string {
  const { placed, heightMm } = layoutPanelsInRow(panels)
  return panelsToHPGL(placed, { sheetHeightMm: heightMm })
}

// ---- roll-width nesting ------------------------------------------------------

/** Standard bolt widths, cm. A roll export is only useful if it matches real stock. */
export const ROLL_WIDTHS_CM = [90, 110, 140, 150, 160, 180] as const

export interface RollPlot {
  /** The roll this was nested for, cm. */
  widthCm: number
  /** Marker length the nest consumes, cm. */
  lengthCm: number
  /** Fraction of the strip covered by pattern, 0…1. */
  efficiency: number
  /** The HPGL document. */
  hpgl: string
}

/**
 * Nest the pattern across a fabric roll and emit it as HPGL, so the plot can be laid
 * straight onto the goods.
 *
 * This is the counterpart to `patternToHPGL`, and the difference is the point: that
 * one plots the draft in order for a pattern cutter, this one packs the pieces to
 * waste as little fabric as possible for a cutting room. Same panels, different job.
 *
 * Nesting is reused from `nestMarker` rather than reimplemented, so the plot and the
 * yardage figure on the cost sheet can never disagree about how the pieces lie.
 */
export function patternToRollHPGL(panels: readonly PatternPanel[], rollWidthCm: number, gapCm = 1): RollPlot {
  const layout = nestMarker([...panels], Math.max(1, rollWidthCm), gapCm)
  const heightMm = layout.lengthCm * 10
  const placedPanels: PlacedPanel[] = layout.placements.map((pl) => {
    const panel = panels[pl.panel]
    const b = bounds(panel.outline)
    // The nest works in bounding boxes; the plot needs the real outline moved to where
    // the box landed. A rotated piece is turned about its own origin first, so the
    // offset has to compensate for where that puts the shape.
    const dx = pl.rot ? pl.x * 10 + b.maxY : pl.x * 10 - b.minX
    const dy = pl.rot ? pl.y * 10 - b.minX : pl.y * 10 - b.minY
    return { name: pl.name, outline: panel.outline, dx, dy, rotated: pl.rot }
  })
  return {
    widthCm: layout.widthCm,
    lengthCm: layout.lengthCm,
    efficiency: layout.efficiency,
    hpgl: panelsToHPGL(placedPanels, { sheetHeightMm: heightMm })
  }
}
