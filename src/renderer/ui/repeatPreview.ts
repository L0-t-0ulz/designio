import { paintTextile, type TextilePattern } from '../fabric/textile'

/**
 * **Print repeat preview** — the textile repeat at REAL garment scale with a cm
 * ruler, so you judge the gauge before it hits the cloth. The albedo wraps the
 * garment's chest girth, so cm-per-pixel = girth / canvas width — the ruler is
 * honest to the finished garment, not the screen. Pure `rulerTicks` is
 * unit-tested; the overlay draws the same `paintTextile` the garment albedo uses.
 */

export interface RulerTick {
  x: number
  cm: number
  major: boolean
}

/** Tick positions for a ruler `widthPx` wide at `cmPerPx` — every cm, labelled every 5. */
export function rulerTicks(widthPx: number, cmPerPx: number): RulerTick[] {
  if (cmPerPx <= 0) return []
  const out: RulerTick[] = []
  const totalCm = widthPx * cmPerPx
  for (let cm = 0; cm <= Math.floor(totalCm); cm++) {
    out.push({ x: cm / cmPerPx, cm, major: cm % 5 === 0 })
  }
  return out
}

let overlay: HTMLElement | null = null

export function closeRepeatPreview(): void {
  overlay?.remove()
  overlay = null
}

export interface RepeatPreviewOpts {
  pattern: TextilePattern
  baseColor: number
  /** The garment girth (cm) the albedo wraps — calibrates the ruler. */
  girthCm: number
}

/** Open the repeat preview overlay (Esc / click-outside closes). */
export function openRepeatPreview(opts: RepeatPreviewOpts): void {
  closeRepeatPreview()
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  const h = document.createElement('h2')
  h.textContent = `Repeat preview — ${opts.pattern}`
  card.appendChild(h)

  const W = 420
  const RULER = 26
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = W + RULER
  const ctx = canvas.getContext('2d')!
  // the same painter the garment albedo uses, at the same tile count → same gauge
  const art = document.createElement('canvas')
  art.width = art.height = W
  paintTextile(art.getContext('2d')!, W, opts.pattern, opts.baseColor)
  ctx.drawImage(art, 0, 0)
  // cm ruler along the bottom — calibrated to the garment girth the albedo wraps
  const cmPerPx = opts.girthCm / W
  ctx.fillStyle = '#101014'
  ctx.fillRect(0, W, W, RULER)
  ctx.strokeStyle = '#c9cbd4'
  ctx.fillStyle = '#c9cbd4'
  ctx.font = '10px system-ui, sans-serif'
  ctx.textAlign = 'center'
  for (const t of rulerTicks(W, cmPerPx)) {
    ctx.beginPath()
    ctx.moveTo(t.x, W)
    ctx.lineTo(t.x, W + (t.major ? 10 : 5))
    ctx.stroke()
    if (t.major && t.cm > 0) ctx.fillText(String(t.cm), t.x, W + 21)
  }
  card.appendChild(canvas)

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = `Ruler in garment cm (the repeat as it lands on ~${Math.round(opts.girthCm)} cm of cloth) · Esc to close`
  card.appendChild(hint)

  overlay.appendChild(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeRepeatPreview()
  })
  document.body.appendChild(overlay)
}
