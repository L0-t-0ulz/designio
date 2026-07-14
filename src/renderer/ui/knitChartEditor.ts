import { el, button } from './controls'
import {
  KNIT_PRESETS,
  cloneChart,
  knitHeight,
  validateChart,
  type KnitChart,
  type KnitStitch
} from '../fabric/knitChart'

/**
 * The knit-chart designer modal — a stitch chart the way a hand-knitter reads
 * one: a cell per stitch, bottom row knitted first, click a cell to cycle
 * knit → purl → cable-left → cable-right. A live shaded preview shows the
 * tiling surface the chart knits.
 */

const CYCLE: Record<KnitStitch, KnitStitch> = { k: 'p', p: 'cl', cl: 'cr', cr: 'k' }
const GLYPH: Record<KnitStitch, string> = { k: '', p: '•', cl: '﹨', cr: '⟋' }
const TITLE: Record<KnitStitch, string> = { k: 'knit', p: 'purl', cl: 'cable, crossing left', cr: 'cable, crossing right' }
const MAX_EDIT = 16

let overlay: HTMLElement | null = null

export function closeKnitChartEditor(): void {
  overlay?.remove()
  overlay = null
}

export const knitChartEditorOpen = (): boolean => overlay !== null

export function openKnitChartEditor(
  initial: KnitChart | undefined,
  onApply: (c: KnitChart | undefined) => void
): void {
  if (overlay) return
  const chart = cloneChart(initial ?? KNIT_PRESETS[0].chart)

  overlay = document.createElement('div')
  overlay.className = 'dio-sketch-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Knit stitch designer')

  const card = el('div', 'dio-sketch-card dio-draft-card')
  const h = el('h2', undefined, 'Knit stitch designer')
  const hint = el(
    'p',
    'dio-sketch-hint',
    'One cell per stitch — click to cycle knit (plain) → purl (•) → cable left (﹨) → cable right (⟋). The bottom row knits first; the chart tiles across the garment.'
  )

  const presetRow = el('div', 'dio-seg dio-seg-wrap')
  for (const p of KNIT_PRESETS) {
    const b = el('button', 'dio-seg-btn', p.name)
    b.setAttribute('type', 'button')
    b.addEventListener('click', () => {
      chart.rows = cloneChart(p.chart).rows
      redraw()
    })
    presetRow.append(b)
  }

  // size steppers — stitches (wales) × rows (courses)
  const stepperVals: (() => void)[] = []
  const stepper = (label: string, get: () => number, set: (v: number) => void): HTMLElement => {
    const wrap = el('span', 'dio-draft-step')
    const val = el('span', 'dio-draft-step-val', String(get()))
    stepperVals.push(() => { val.textContent = String(get()) })
    const mk = (txt: string, d: number): HTMLButtonElement => {
      const b = el('button', 'dio-seg-btn', txt)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        set(Math.max(1, Math.min(MAX_EDIT, get() + d)))
        redraw()
      })
      return b
    }
    wrap.append(el('span', 'dio-draft-step-label', label), mk('−', -1), val, mk('+', 1))
    return wrap
  }
  const width = (): number => chart.rows[0].length
  const setWidth = (w: number): void => {
    chart.rows = chart.rows.map((r) => (r.length >= w ? r.slice(0, w) : [...r, ...Array.from({ length: w - r.length }, (_, i) => r[i % r.length])]))
  }
  const setHeight = (n: number): void => {
    chart.rows = chart.rows.length >= n
      ? chart.rows.slice(0, n)
      : [...chart.rows, ...Array.from({ length: n - chart.rows.length }, (_, i) => [...chart.rows[i % chart.rows.length]])]
  }
  const stepRow = el('div', 'dio-draft-steps')
  stepRow.append(
    stepper('Stitches', width, setWidth),
    stepper('Rows', () => chart.rows.length, setHeight)
  )

  const grid = el('div', 'dio-draft-grid')
  const preview = document.createElement('canvas')
  preview.className = 'dio-draft-drawdown'
  const quadrants = el('div', 'dio-draft-quadrants')
  quadrants.append(grid, preview)

  const problem = el('div', 'dio-draft-problem', '')
  const applyBtn = button('Apply to garment', () => {
    onApply(cloneChart(chart))
    closeKnitChartEditor()
  }, true)
  const removeBtn = button('Remove chart', () => {
    onApply(undefined)
    closeKnitChartEditor()
  })
  const cancelBtn = button('Cancel', () => closeKnitChartEditor())
  const actions = el('div', 'dio-actions')
  actions.append(applyBtn, ...(initial ? [removeBtn] : []), cancelBtn)

  function redraw(): void {
    for (const refresh of stepperVals) refresh()
    const wales = width()
    const courses = chart.rows.length
    grid.style.gridTemplateColumns = `repeat(${wales}, var(--draft-cell))`
    grid.replaceChildren()
    // chart row 0 is the bottom — render top-down
    for (let c = courses - 1; c >= 0; c--) {
      for (let w = 0; w < wales; w++) {
        const s = chart.rows[c][w]
        const b = el('button', 'dio-draft-cell dio-knit-' + s, GLYPH[s])
        b.setAttribute('type', 'button')
        b.title = TITLE[s]
        b.addEventListener('click', () => {
          chart.rows[c][w] = CYCLE[chart.rows[c][w]]
          redraw()
        })
        grid.append(b)
      }
    }
    const err = validateChart(chart)
    problem.textContent = err ?? ''
    applyBtn.disabled = !!err
    // shaded height preview, tiled 2×2 repeats
    const REPS = 2
    const cell = Math.max(6, Math.min(16, Math.floor(200 / Math.max(wales, courses) / REPS)))
    const pxW = wales * REPS * cell
    const pxH = courses * REPS * cell
    preview.width = pxW
    preview.height = pxH
    const ctx = preview.getContext('2d')!
    if (err) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(0, 0, pxW, pxH)
      return
    }
    const img = ctx.createImageData(pxW, pxH)
    for (let y = 0; y < pxH; y++) {
      for (let x = 0; x < pxW; x++) {
        // v runs bottom-up in chart space; canvas y runs top-down
        const hgt = knitHeight(chart, x / pxW, 1 - y / pxH, wales * REPS, courses * REPS)
        const tone = Math.round(40 + 190 * hgt)
        const i = (y * pxW + x) * 4
        img.data[i] = tone
        img.data[i + 1] = tone
        img.data[i + 2] = tone + 8
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }
  redraw()

  card.append(h, hint, presetRow, stepRow, quadrants, problem, actions)
  overlay.append(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeKnitChartEditor()
  })
  window.addEventListener('keydown', function esc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeKnitChartEditor()
      window.removeEventListener('keydown', esc)
    }
  })
  document.body.append(overlay)
}
