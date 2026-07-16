/**
 * **In-app vector print editor** — compose a print graphic from simple vector shapes
 * (rect · circle · line · star · text) without uploading art. The shape model + the
 * pure SVG serializer are unit-tested; `ui/vectorEditor` is the little editor that
 * adds shapes over a live preview and hands the SVG to a print / a download. Shapes
 * are authored in a unit square (0…1) so the graphic scales to any print size.
 */
export type VShapeKind = 'rect' | 'circle' | 'line' | 'star' | 'text'

export interface VShape {
  kind: VShapeKind
  /** Centre + size as unit-square fractions (0…1). */
  x: number
  y: number
  w: number
  h: number
  color: number
  rotation: number
  /** For text shapes. */
  text?: string
}

const hex = (c: number): string => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6)

/** The N-point star polygon points (SVG coords) for a star shape. Pure. */
export function starPoints(cx: number, cy: number, rx: number, ry: number, points = 5): string {
  const pts: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2
    const k = i % 2 === 0 ? 1 : 0.42 // outer / inner radius
    pts.push(`${(cx + Math.cos(a) * rx * k).toFixed(2)},${(cy + Math.sin(a) * ry * k).toFixed(2)}`)
  }
  return pts.join(' ')
}

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function shapeSVG(s: VShape, size: number): string {
  const cx = s.x * size
  const cy = s.y * size
  const w = s.w * size
  const h = s.h * size
  const fill = hex(s.color)
  const rot = s.rotation ? ` transform="rotate(${s.rotation} ${cx.toFixed(2)} ${cy.toFixed(2)})"` : ''
  switch (s.kind) {
    case 'rect':
      return `<rect x="${(cx - w / 2).toFixed(2)}" y="${(cy - h / 2).toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="${fill}"${rot}/>`
    case 'circle':
      return `<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${(w / 2).toFixed(2)}" ry="${(h / 2).toFixed(2)}" fill="${fill}"${rot}/>`
    case 'line':
      return `<line x1="${(cx - w / 2).toFixed(2)}" y1="${cy.toFixed(2)}" x2="${(cx + w / 2).toFixed(2)}" y2="${cy.toFixed(2)}" stroke="${fill}" stroke-width="${Math.max(1, h).toFixed(2)}"${rot}/>`
    case 'star':
      return `<polygon points="${starPoints(cx, cy, w / 2, h / 2)}" fill="${fill}"${rot}/>`
    case 'text':
      return `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" fill="${fill}" font-size="${h.toFixed(2)}" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="central"${rot}>${esc(s.text ?? '')}</text>`
  }
}

/** Serialize shapes to a standalone SVG string (transparent background). Pure. */
export function vectorToSVG(shapes: VShape[], size = 200): string {
  const body = shapes.map((s) => shapeSVG(s, size)).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${body}</svg>`
}

/** A sample composition (a gold star over a circle badge + a caption). */
export const DEMO_VECTOR: VShape[] = [
  { kind: 'circle', x: 0.5, y: 0.45, w: 0.7, h: 0.7, color: 0x1d4e89, rotation: 0 },
  { kind: 'star', x: 0.5, y: 0.42, w: 0.5, h: 0.5, color: 0xf0c674, rotation: 0 },
  { kind: 'text', x: 0.5, y: 0.85, w: 0.6, h: 0.13, color: 0x16161a, rotation: 0, text: 'STUDIO' }
]
