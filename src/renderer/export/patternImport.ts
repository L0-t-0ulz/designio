/**
 * Import an existing flat pattern — parse a DXF (as produced by our exporters, or
 * a standard AAMA/DXF cutter file) back into panels, so a pattern round-trips: you
 * can read what you exported (or a supplier's file) and view it in the 2D pane.
 * Only the `LWPOLYLINE`/`POLYLINE` outlines are read (CUT / SEW / PRINT layers).
 * Pure (no DOM) so the parser is unit-tested.
 */
export interface Pt {
  x: number
  y: number
}

export interface ImportedPanel {
  layer: string
  points: Pt[]
  closed: boolean
}

export interface ImportedNote {
  x: number
  y: number
  text: string
}

export interface ImportedPattern {
  /** Pattern notes read from the DXF ANNOTATION layer (round-trips the export). */
  notes?: ImportedNote[]
  panels: ImportedPanel[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

/** Parse a DXF string into its closed polyline panels (by layer) + overall bounds. */
export function parsePatternDXF(dxf: string): ImportedPattern {
  const raw = dxf.split(/\r?\n/)
  const panels: ImportedPanel[] = []
  const notes: ImportedNote[] = []
  let cur: ImportedPanel | null = null
  let curText: { layer: string; x: number; y: number; text: string } | null = null
  let pendingX: number | null = null
  const flush = (): void => {
    if (cur && cur.points.length) panels.push(cur)
    cur = null
    pendingX = null
  }
  // DXF is a stream of (group code, value) line pairs.
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const code = raw[i].trim()
    const val = raw[i + 1].trim()
    if (code === '0') {
      flush()
      if (curText && curText.layer === 'ANNOTATION' && curText.text) notes.push({ x: curText.x, y: curText.y, text: curText.text })
      curText = val === 'TEXT' ? { layer: '0', x: 0, y: 0, text: '' } : null
      if (val === 'LWPOLYLINE' || val === 'POLYLINE') cur = { layer: '0', points: [], closed: false }
    } else if (curText) {
      if (code === '8') curText.layer = val
      else if (code === '10') curText.x = parseFloat(val)
      else if (code === '20') curText.y = parseFloat(val)
      else if (code === '1') curText.text = val
    } else if (!cur) {
      continue
    } else if (code === '8') {
      cur.layer = val
    } else if (code === '70') {
      cur.closed = (parseInt(val, 10) & 1) === 1
    } else if (code === '10') {
      pendingX = parseFloat(val)
    } else if (code === '20' && pendingX !== null) {
      cur.points.push({ x: pendingX, y: parseFloat(val) })
      pendingX = null
    }
  }
  flush()
  if (curText && curText.layer === 'ANNOTATION' && curText.text) notes.push({ x: curText.x, y: curText.y, text: curText.text })

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of panels) {
    for (const pt of p.points) {
      minX = Math.min(minX, pt.x)
      minY = Math.min(minY, pt.y)
      maxX = Math.max(maxX, pt.x)
      maxY = Math.max(maxY, pt.y)
    }
  }
  if (!panels.length) {
    minX = minY = maxX = maxY = 0
  }
  return { panels, bounds: { minX, minY, maxX, maxY }, notes: notes.length ? notes : undefined }
}

/** A one-line summary of an imported pattern (panel count + overall size in cm). */
export function patternSummary(p: ImportedPattern): string {
  const n = p.panels.length
  const w = ((p.bounds.maxX - p.bounds.minX) / 10).toFixed(0)
  const h = ((p.bounds.maxY - p.bounds.minY) / 10).toFixed(0)
  return n ? `${n} panel${n === 1 ? '' : 's'} · ${w}×${h} cm` : 'no panels found'
}

const LAYER_STYLE: Record<string, { stroke: string; dash: string }> = {
  CUT: { stroke: '#c9a227', dash: '5 4' }, // seam-allowance cut line (gold, dashed)
  PATTERN: { stroke: '#c9a227', dash: '5 4' },
  SEW: { stroke: '#3a3f4b', dash: '' }, // sew line (solid)
  PRINT: { stroke: '#7c6ff0', dash: '3 3' } // placed print box
}

/** Render an imported pattern to an SVG (mm units → the 2D pane preview). */
export function importedPatternToSVG(p: ImportedPattern): string {
  if (!p.panels.length) return '<svg xmlns="http://www.w3.org/2000/svg"/>'
  const pad = 20
  const w = p.bounds.maxX - p.bounds.minX + 2 * pad
  const h = p.bounds.maxY - p.bounds.minY + 2 * pad
  const ox = p.bounds.minX - pad
  const oy = p.bounds.minY - pad
  const body = p.panels
    .map((pl) => {
      const st = LAYER_STYLE[pl.layer] ?? { stroke: '#8a8f9c', dash: '' }
      const pts = pl.points.map((pt) => `${(pt.x - ox).toFixed(1)},${(pt.y - oy).toFixed(1)}`).join(' ')
      const tag = pl.closed ? 'polygon' : 'polyline'
      return `<${tag} points="${pts}" fill="none" stroke="${st.stroke}" stroke-width="1.2"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}/>`
    })
    .join('')
  const noteMarks = (p.notes ?? [])
    .map(
      (n) => `<g><circle cx="${(n.x - ox).toFixed(1)}" cy="${(n.y - oy).toFixed(1)}" r="4" fill="#6b5bd6"/><text x="${(n.x - ox + 8).toFixed(1)}" y="${(n.y - oy - 8).toFixed(1)}" font-family="sans-serif" font-size="12" fill="#4b3fb3">${n.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></g>`
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" width="100%" height="100%">${body}${noteMarks}</svg>`
}
