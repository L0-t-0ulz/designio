/**
 * **Marker making** — nest the flat pattern panels into the fabric width and report
 * the real **marker length** + **efficiency**, the way a cutting room (or CLO /
 * Gerber / Lectra) plans fabric. The spec pack's old yardage was `area ÷ width`,
 * which assumes zero waste (a 100%-efficient marker that never exists); this lays
 * the actual panels out and measures the length they consume.
 *
 * The nest is a **first-fit-decreasing-height shelf pack** of each panel's bounding
 * box (× its cut count) — a rectangle approximation of the marker, so the length is
 * a realistic *upper bound* (true shape-nesting interlocks the panels tighter). Pure
 * geometry, so it's unit-tested; the manufacturing pack prints the numbers + a preview.
 */
import type { Pt, PatternPanel } from './garmentPattern'
import { escapeHtml as esc } from './html'

export interface MarkerPlacement {
  name: string
  /** Top-left in cm, origin top-left of the marker strip. */
  x: number
  y: number
  /** Placed size in cm (already oriented). */
  w: number
  h: number
  /** True if the panel was rotated 90° to nest. */
  rot: boolean
}

export interface MarkerLayout {
  /** Fabric cuttable width, cm. */
  widthCm: number
  /** Marker length consumed, cm. */
  lengthCm: number
  placements: MarkerPlacement[]
  /** Total true panel area (× cut), cm². */
  panelAreaCm2: number
  /** panelArea ÷ (width × length), 0…1. */
  efficiency: number
}

/** Shoelace area of a closed polygon (mm) → cm². */
function polyAreaCm2(o: Pt[]): number {
  let a = 0
  for (let i = 0; i < o.length; i++) {
    const j = (i + 1) % o.length
    a += o[i].x * o[j].y - o[j].x * o[i].y
  }
  return Math.abs(a) / 2 / 100 // mm² → cm²
}

/**
 * Nest the panels into a `widthCm`-wide strip and measure the marker. Each panel is
 * oriented smaller-side-across-the-width (portrait) to pack more per row, unless that
 * side still overflows the fabric width, then laid flat. `gapCm` is the buffer between
 * pieces.
 */
export function nestMarker(panels: PatternPanel[], widthCm: number, gapCm = 1): MarkerLayout {
  const pieces: { name: string; w: number; h: number; rot: boolean; area: number }[] = []
  let panelAreaCm2 = 0
  for (const p of panels) {
    const area = polyAreaCm2(p.outline)
    const wcm = p.wmm / 10
    const hcm = p.hmm / 10
    // portrait: put the shorter side across the width so more pieces fit per row
    let w = Math.min(wcm, hcm)
    let h = Math.max(wcm, hcm)
    let rot = w !== wcm
    if (w > widthCm) {
      // even portrait overflows the fabric — lay it as authored (would be cut on the fold)
      w = wcm
      h = hcm
      rot = false
    }
    for (let i = 0; i < Math.max(1, p.cut); i++) {
      pieces.push({ name: p.name, w, h, rot, area })
      panelAreaCm2 += area
    }
  }

  // First-fit decreasing-height shelf packing: tallest first, each piece dropped into
  // the first existing shelf whose leftover width AND height accept it (so small pieces
  // backfill a taller shelf's gap), else a new shelf below all the others.
  pieces.sort((a, b) => b.h - a.h)
  const placements: MarkerPlacement[] = []
  const shelves: { y: number; height: number; x: number }[] = []
  for (const pc of pieces) {
    let shelf = shelves.find((s) => s.x + pc.w <= widthCm && pc.h <= s.height)
    if (!shelf) {
      const y = shelves.length ? Math.max(...shelves.map((s) => s.y + s.height)) + gapCm : 0
      shelf = { y, height: pc.h, x: 0 }
      shelves.push(shelf)
    }
    placements.push({ name: pc.name, x: shelf.x, y: shelf.y, w: pc.w, h: pc.h, rot: pc.rot })
    shelf.x += pc.w + gapCm
  }
  const lengthCm = shelves.length ? Math.max(...shelves.map((s) => s.y + s.height)) : 0
  const efficiency = lengthCm > 0 ? Math.min(1, panelAreaCm2 / (widthCm * lengthCm)) : 0
  return { widthCm, lengthCm, placements, panelAreaCm2, efficiency }
}


/** A preview of the nested marker (fabric strip + placed panels), as an inline SVG in cm units. */
export function markerSVG(m: MarkerLayout): string {
  const rects = m.placements
    .map((p) => {
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      const fs = Math.max(2.4, Math.min(p.w, p.h) * 0.28)
      return `<g><rect x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.w.toFixed(1)}" height="${p.h.toFixed(1)}" rx="0.8" fill="#eef1f6" stroke="#9aa4b2" stroke-width="0.3"/><text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" font-size="${fs.toFixed(1)}" text-anchor="middle" dominant-baseline="central" fill="#5b6472">${esc(p.name)}${p.rot ? ' ⟳' : ''}</text></g>`
    })
    .join('')
  return `<svg viewBox="0 0 ${m.widthCm.toFixed(1)} ${Math.max(1, m.lengthCm).toFixed(1)}" preserveAspectRatio="xMidYMin meet" width="100%">
    <rect x="0" y="0" width="${m.widthCm.toFixed(1)}" height="${Math.max(1, m.lengthCm).toFixed(1)}" fill="#fbfbfc" stroke="#d0d5dd" stroke-width="0.4"/>
    ${rects}
  </svg>`
}
