import { el } from './controls'

/**
 * A small 2D schematic of the (unwrapped) pattern: FRONT and BACK panels side by
 * side, with their side edges drawn as seams. Updates as the pattern params
 * change. This is the flat "pattern piece" view of the 3D garment.
 */
export function patternSchematic(): { root: HTMLElement; update: (panelW: number, panelH: number) => void } {
  const root = el('div', 'dio-schematic')

  const update = (panelW: number, panelH: number): void => {
    const H = 118
    const scale = H / panelH
    const W = Math.max(24, panelW * scale)
    const gap = 18
    const pad = 10
    const svgW = W * 2 + gap + pad * 2
    const svgH = H + 34
    const seam = '#7c8cff'
    const cm = (m: number): string => `${Math.round(m * 100)}`

    const panel = (x: number, name: string): string => `
      <rect x="${x}" y="${pad}" width="${W}" height="${H}" rx="4"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
      <line x1="${x}" y1="${pad}" x2="${x}" y2="${pad + H}" stroke="${seam}" stroke-width="2.5"/>
      <line x1="${x + W}" y1="${pad}" x2="${x + W}" y2="${pad + H}" stroke="${seam}" stroke-width="2.5"/>
      <text x="${x + W / 2}" y="${pad + H / 2}" fill="#c9cde0" font-size="11"
        text-anchor="middle" dominant-baseline="middle">${name}</text>`

    root.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
        ${panel(pad, 'FRONT')}
        ${panel(pad + W + gap, 'BACK')}
        <text x="${svgW / 2}" y="${svgH - 8}" fill="#9aa0b5" font-size="10.5"
          text-anchor="middle">${cm(panelW)}×${cm(panelH)} cm panels · side seams (●) sewn</text>
      </svg>`
  }

  return { root, update }
}
