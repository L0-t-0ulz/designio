/**
 * Flat pattern exporters (pure string generators, unit-testable). The garment is
 * a FRONT + BACK panel; each is a rectangle `panelW × panelH` (cm), and we add a
 * seam allowance for the cut line. SVG is for viewing/printing; DXF for CAD/cutters.
 */

export interface PatternDims {
  /** Full bust circumference (m). */
  bust: number
  /** Length top→hem (m). */
  length: number
  /** Seam allowance (m). */
  seam?: number
}

interface Panel {
  name: string
  w: number // mm
  h: number // mm
}

function panels(d: PatternDims): { panels: Panel[]; sa: number } {
  const w = (d.bust / 2) * 1000
  const h = d.length * 1000
  return { panels: [{ name: 'FRONT', w, h }, { name: 'BACK', w, h }], sa: (d.seam ?? 0.01) * 1000 }
}

export function patternToSVG(d: PatternDims): string {
  const { panels: ps, sa } = panels(d)
  const margin = 20
  const gap = 30
  const cutW = (p: Panel): number => p.w + 2 * sa
  const cutH = (p: Panel): number => p.h + 2 * sa
  const totalW = margin * 2 + cutW(ps[0]) + gap + cutW(ps[1])
  const totalH = margin * 2 + Math.max(cutH(ps[0]), cutH(ps[1])) + 24

  let x = margin
  const parts: string[] = []
  for (const p of ps) {
    const cw = cutW(p)
    const ch = cutH(p)
    const iw = p.w
    const ih = p.h
    const ix = x + sa
    const iy = margin + sa
    parts.push(`
      <g>
        <rect x="${x}" y="${margin}" width="${cw}" height="${ch}" fill="none"
          stroke="#888" stroke-width="1.5" stroke-dasharray="6 4"/>
        <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="#f4f2ee" stroke="#222" stroke-width="1.5"/>
        <line x1="${ix + iw / 2}" y1="${iy + 14}" x2="${ix + iw / 2}" y2="${iy + ih - 14}"
          stroke="#444" stroke-width="1.2"/>
        <polygon points="${ix + iw / 2 - 4},${iy + 22} ${ix + iw / 2 + 4},${iy + 22} ${ix + iw / 2},${iy + 12}" fill="#444"/>
        <text x="${ix + iw / 2}" y="${iy + ih / 2}" font-family="sans-serif" font-size="18"
          text-anchor="middle" fill="#333">${p.name}</text>
        <text x="${ix + iw / 2}" y="${iy + ih + 16}" font-family="sans-serif" font-size="11"
          text-anchor="middle" fill="#666">${Math.round(iw)} × ${Math.round(ih)} mm · SA ${Math.round(sa)} mm</text>
      </g>`)
    x += cw + gap
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}mm" height="${totalH}mm"
  viewBox="0 0 ${totalW} ${totalH}">
  <rect width="${totalW}" height="${totalH}" fill="#fff"/>
  <text x="${margin}" y="${totalH - 8}" font-family="sans-serif" font-size="11" fill="#999">
    DesignIO pattern · solid = sew line · dashed = cut line · arrow = grainline</text>
  ${parts.join('\n')}
</svg>`
}

export function patternToDXF(d: PatternDims): string {
  const { panels: ps, sa } = panels(d)
  const lines: string[] = ['0', 'SECTION', '2', 'ENTITIES']
  const rect = (x: number, y: number, w: number, h: number): void => {
    lines.push('0', 'LWPOLYLINE', '8', 'PATTERN', '90', '4', '70', '1')
    const pts: [number, number][] = [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h]
    ]
    for (const [px, py] of pts) lines.push('10', px.toFixed(2), '20', py.toFixed(2))
  }
  let x = 0
  for (const p of ps) {
    rect(x, 0, p.w + 2 * sa, p.h + 2 * sa) // cut line
    rect(x + sa, sa, p.w, p.h) // sew line
    x += p.w + 2 * sa + 30
  }
  lines.push('0', 'ENDSEC', '0', 'EOF')
  return lines.join('\n')
}
