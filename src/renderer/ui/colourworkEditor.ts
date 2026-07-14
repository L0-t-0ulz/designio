import { el, button } from './controls'
import {
  COLOURWORK_PRESETS,
  MAX_YARNS,
  cloneColourwork,
  paintColourwork,
  validateColourwork,
  type ColourworkChart,
  type ColourworkMode
} from '../fabric/colourwork'

/**
 * The colourwork designer modal — a knitter's colour chart: pick a yarn from
 * the palette, click cells to place it. Fair-isle tiles the whole garment;
 * intarsia paints one placed block on the front (yarn 0 = the garment itself).
 * A live preview paints the actual albedo layer.
 */

const MAX_EDIT = 16

let overlay: HTMLElement | null = null

export function closeColourworkEditor(): void {
  overlay?.remove()
  overlay = null
}

export const colourworkEditorOpen = (): boolean => overlay !== null

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

export function openColourworkEditor(
  initial: ColourworkChart | undefined,
  onApply: (c: ColourworkChart | undefined) => void
): void {
  if (overlay) return
  const chart = cloneColourwork(initial ?? COLOURWORK_PRESETS[0].chart)
  let activeYarn = 1

  overlay = document.createElement('div')
  overlay.className = 'dio-sketch-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Colourwork designer')

  const card = el('div', 'dio-sketch-card dio-draft-card')
  const h = el('h2', undefined, 'Intarsia / colourwork designer')
  const hint = el(
    'p',
    'dio-sketch-hint',
    'Pick a yarn, then click cells to place it. Fair-isle tiles the whole garment (yarn 1 is the ground); intarsia is one placed chest block (yarn 1 = the garment shows through).'
  )

  const presetRow = el('div', 'dio-seg dio-seg-wrap')
  for (const p of COLOURWORK_PRESETS) {
    const b = el('button', 'dio-seg-btn', p.name)
    b.setAttribute('type', 'button')
    b.addEventListener('click', () => {
      const c = cloneColourwork(p.chart)
      chart.mode = c.mode
      chart.palette = c.palette
      chart.cells = c.cells
      activeYarn = Math.min(activeYarn, chart.palette.length - 1)
      redraw()
    })
    presetRow.append(b)
  }

  // mode toggle
  const modeRow = el('div', 'dio-seg')
  const modeBtns: [ColourworkMode, HTMLButtonElement][] = (['fairisle', 'intarsia'] as ColourworkMode[]).map((m) => {
    const b = el('button', 'dio-seg-btn', m === 'fairisle' ? 'Fair-isle (allover)' : 'Intarsia (placed block)')
    b.setAttribute('type', 'button')
    b.addEventListener('click', () => {
      chart.mode = m
      redraw()
    })
    modeRow.append(b)
    return [m, b]
  })

  // palette — a chip per yarn: click to select, its colour input recolours the yarn
  const paletteRow = el('div', 'dio-cw-palette')

  // size steppers
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
  const width = (): number => chart.cells[0].length
  const setWidth = (w: number): void => {
    chart.cells = chart.cells.map((r) => (r.length >= w ? r.slice(0, w) : [...r, ...Array.from({ length: w - r.length }, () => 0)]))
  }
  const setHeight = (n: number): void => {
    chart.cells = chart.cells.length >= n
      ? chart.cells.slice(0, n)
      : [...chart.cells, ...Array.from({ length: n - chart.cells.length }, () => Array.from({ length: width() }, () => 0))]
  }
  const stepRow = el('div', 'dio-draft-steps')
  stepRow.append(stepper('Stitches', width, setWidth), stepper('Rows', () => chart.cells.length, setHeight))

  const grid = el('div', 'dio-draft-grid')
  const preview = document.createElement('canvas')
  preview.className = 'dio-draft-drawdown'
  const quadrants = el('div', 'dio-draft-quadrants')
  quadrants.append(grid, preview)

  const problem = el('div', 'dio-draft-problem', '')
  const applyBtn = button('Apply to garment', () => {
    onApply(cloneColourwork(chart))
    closeColourworkEditor()
  }, true)
  const removeBtn = button('Remove colourwork', () => {
    onApply(undefined)
    closeColourworkEditor()
  })
  const cancelBtn = button('Cancel', () => closeColourworkEditor())
  const actions = el('div', 'dio-actions')
  actions.append(applyBtn, ...(initial ? [removeBtn] : []), cancelBtn)

  function renderPalette(): void {
    paletteRow.replaceChildren()
    chart.palette.forEach((colour, i) => {
      const chip = el('span', 'dio-cw-yarn' + (i === activeYarn ? ' on' : ''))
      const pick = document.createElement('input')
      pick.type = 'color'
      pick.value = hex(colour)
      pick.title = i === 0 ? (chart.mode === 'intarsia' ? 'yarn 1 — the garment shows through' : 'yarn 1 — the ground') : `yarn ${i + 1}`
      pick.addEventListener('input', () => {
        chart.palette[i] = parseInt(pick.value.slice(1), 16)
        redraw()
      })
      chip.addEventListener('click', (e) => {
        if (e.target !== pick) {
          activeYarn = i
          redraw()
        }
      })
      chip.append(pick, el('span', 'dio-draft-step-label', `yarn ${i + 1}`))
      paletteRow.append(chip)
    })
    if (chart.palette.length < MAX_YARNS) {
      const add = el('button', 'dio-seg-btn', '＋ yarn')
      add.setAttribute('type', 'button')
      add.addEventListener('click', () => {
        chart.palette.push(0xd0d0d0)
        activeYarn = chart.palette.length - 1
        redraw()
      })
      paletteRow.append(add)
    }
    if (chart.palette.length > 2) {
      const rm = el('button', 'dio-seg-btn', '− yarn')
      rm.setAttribute('type', 'button')
      rm.title = 'remove the last yarn (its cells become ground)'
      rm.addEventListener('click', () => {
        const gone = chart.palette.length - 1
        chart.palette.pop()
        chart.cells = chart.cells.map((r) => r.map((i) => (i === gone ? 0 : i)))
        activeYarn = Math.min(activeYarn, chart.palette.length - 1)
        redraw()
      })
      paletteRow.append(rm)
    }
  }

  function redraw(): void {
    for (const refresh of stepperVals) refresh()
    for (const [m, b] of modeBtns) b.classList.toggle('on', chart.mode === m)
    renderPalette()
    const w = width()
    const rows = chart.cells.length
    grid.style.gridTemplateColumns = `repeat(${w}, var(--draft-cell))`
    grid.replaceChildren()
    // chart row 0 is the bottom — render top-down
    for (let r = rows - 1; r >= 0; r--) {
      for (let cIdx = 0; cIdx < w; cIdx++) {
        const yarn = chart.cells[r][cIdx]
        const b = el('button', 'dio-draft-cell')
        b.setAttribute('type', 'button')
        b.style.background = chart.mode === 'intarsia' && yarn === 0 ? 'transparent' : hex(chart.palette[yarn])
        b.title = `yarn ${yarn + 1}`
        b.addEventListener('click', () => {
          chart.cells[r][cIdx] = chart.cells[r][cIdx] === activeYarn ? 0 : activeYarn
          redraw()
        })
        grid.append(b)
      }
    }
    const err = validateColourwork(chart)
    problem.textContent = err ?? ''
    applyBtn.disabled = !!err
    // live preview — the actual albedo paint over a neutral garment ground
    const P = 220
    preview.width = P
    preview.height = P
    const ctx = preview.getContext('2d')!
    ctx.fillStyle = '#8f8a84'
    ctx.fillRect(0, 0, P, P)
    if (!err) paintColourwork(ctx, P, chart)
  }
  redraw()

  card.append(h, hint, presetRow, modeRow, paletteRow, stepRow, quadrants, problem, actions)
  overlay.append(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeColourworkEditor()
  })
  window.addEventListener('keydown', function esc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeColourworkEditor()
      window.removeEventListener('keydown', esc)
    }
  })
  document.body.append(overlay)
}
