/**
 * The draw-your-own-panel sketch pad — a modal canvas where you sketch a 2D
 * panel outline over a faint body guide (click to place points, drag to
 * freehand). Mirror symmetry is on by default: draw the right half, the left
 * half follows live. "Sew it" hands the closed outline (metres, y up, centred
 * by the builder) to `buildDrawnPanel` via the caller. Esc / Cancel closes.
 */
import { mirrorOutline, outlineArea, type Pt } from './drawnPanel'
import { showToast } from '../ui/toast'

const PX_PER_M = 760 // pad scale: the 640 px-tall canvas spans ~0.84 m
const PAD_W = 520
const PAD_H = 640
const BASE_Y_PX = PAD_H - 28 // canvas y of panel y=0 (the hem baseline)
const MIN_AREA_M2 = 0.01 // reject doodles smaller than ~10×10 cm

let overlay: HTMLElement | null = null

function close(): void {
  overlay?.remove()
  overlay = null
}

/** True while the sketch pad is open (main.ts routes Esc here). */
export const sketchPadOpen = (): boolean => overlay !== null
export const closeSketchPad = close

const toPanel = (px: number, py: number): Pt => ({ x: (px - PAD_W / 2) / PX_PER_M, y: (BASE_Y_PX - py) / PX_PER_M })
const toCanvasX = (x: number): number => PAD_W / 2 + x * PX_PER_M
const toCanvasY = (y: number): number => BASE_Y_PX - y * PX_PER_M

/** The faint torso silhouette the user sketches over (right half, metres). */
const GUIDE: Pt[] = [
  { x: 0.03, y: 0.78 }, // neck
  { x: 0.11, y: 0.72 },
  { x: 0.19, y: 0.68 }, // shoulder
  { x: 0.17, y: 0.52 }, // chest
  { x: 0.13, y: 0.36 }, // waist
  { x: 0.17, y: 0.16 }, // hip
  { x: 0.16, y: 0 },
  { x: 0.09, y: -0.1 } // thigh hint
]

export function openSketchPad(onSew: (outline: Pt[]) => void): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-sketch-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Draw your own panel')

  const card = document.createElement('div')
  card.className = 'dio-sketch-card'
  const h = document.createElement('h2')
  h.textContent = 'Draw your own panel'
  const hint = document.createElement('p')
  hint.className = 'dio-sketch-hint'
  hint.textContent = 'Sketch the panel over the body guide — click to place points, drag to freehand. With mirror on, draw the right half only.'

  const canvas = document.createElement('canvas')
  canvas.className = 'dio-sketch-canvas'
  canvas.width = PAD_W
  canvas.height = PAD_H
  const ctx = canvas.getContext('2d')!

  let mirror = true
  const pts: Pt[] = []

  function redraw(): void {
    ctx.clearRect(0, 0, PAD_W, PAD_H)
    // cm grid + centre axis
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    const grid = 0.05 * PX_PER_M
    for (let x = (PAD_W / 2) % grid; x < PAD_W; x += grid) strokeLine(x, 0, x, PAD_H)
    for (let y = BASE_Y_PX % grid; y < PAD_H; y += grid) strokeLine(0, y, PAD_W, y)
    for (let y = BASE_Y_PX - grid; y > 0; y -= grid) strokeLine(0, y, PAD_W, y)
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    strokeLine(PAD_W / 2, 0, PAD_W / 2, PAD_H)
    // body guide (both halves)
    ctx.strokeStyle = 'rgba(140,160,255,0.28)'
    ctx.lineWidth = 2
    for (const s of [1, -1]) {
      ctx.beginPath()
      GUIDE.forEach((p, i) => {
        const cx = toCanvasX(s * p.x)
        const cy = toCanvasY(p.y)
        i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
      })
      ctx.stroke()
    }
    // the sketch (+ live mirrored preview)
    if (pts.length > 0) {
      drawOutline(pts, 'rgba(120,220,180,0.95)')
      if (mirror) drawOutline(pts.map((p) => ({ x: -p.x, y: p.y })), 'rgba(120,220,180,0.45)')
      // closing hint back to the start (through the axis when mirrored)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = 'rgba(120,220,180,0.4)'
      const first = pts[0]
      const last = pts[pts.length - 1]
      ctx.beginPath()
      ctx.moveTo(toCanvasX(last.x), toCanvasY(last.y))
      ctx.lineTo(toCanvasX(mirror ? -last.x : first.x), toCanvasY(mirror ? last.y : first.y))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(120,220,180,1)'
      for (const p of pts) {
        ctx.beginPath()
        ctx.arc(toCanvasX(p.x), toCanvasY(p.y), 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  function strokeLine(x0: number, y0: number, x1: number, y1: number): void {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
  }
  function drawOutline(o: Pt[], colour: string): void {
    ctx.strokeStyle = colour
    ctx.lineWidth = 2
    ctx.beginPath()
    o.forEach((p, i) => {
      const cx = toCanvasX(p.x)
      const cy = toCanvasY(p.y)
      i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy)
    })
    ctx.stroke()
  }

  function addPoint(e: PointerEvent): void {
    const r = canvas.getBoundingClientRect()
    const p = toPanel(((e.clientX - r.left) * PAD_W) / r.width, ((e.clientY - r.top) * PAD_H) / r.height)
    if (mirror) p.x = Math.max(0, p.x) // right half only — the axis clamps
    const last = pts[pts.length - 1]
    if (last && Math.hypot(p.x - last.x, p.y - last.y) * PX_PER_M < 6) return // drag decimation
    pts.push(p)
    redraw()
  }

  let dragging = false
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true
    canvas.setPointerCapture(e.pointerId)
    addPoint(e)
  })
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) addPoint(e)
  })
  canvas.addEventListener('pointerup', () => (dragging = false))

  // ---- controls ----
  const controls = document.createElement('div')
  controls.className = 'dio-sketch-controls'
  const mk = (label: string, onClick: () => void, primary = false): HTMLButtonElement => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    if (primary) b.classList.add('primary')
    b.addEventListener('click', onClick)
    return b
  }
  const mirrorBtn = mk('Mirror: on', () => {
    mirror = !mirror
    mirrorBtn.textContent = mirror ? 'Mirror: on' : 'Mirror: off'
    redraw()
  })
  const sew = mk('✂  Sew it', () => {
    if (pts.length < 3) {
      showToast('Sketch at least three points first')
      return
    }
    const outline = mirror ? mirrorOutline(pts) : pts.slice()
    if (Math.abs(outlineArea(outline)) < MIN_AREA_M2) {
      showToast('That sketch is too small to sew — draw a larger shape')
      return
    }
    close()
    onSew(outline)
  }, true)
  controls.append(
    mirrorBtn,
    mk('Undo', () => {
      pts.pop()
      redraw()
    }),
    mk('Clear', () => {
      pts.length = 0
      redraw()
    }),
    mk('Cancel', close),
    sew
  )

  card.append(h, hint, canvas, controls)
  overlay.appendChild(card)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })
  document.body.appendChild(overlay)
  redraw()
}
