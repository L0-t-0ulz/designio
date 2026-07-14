import { el, button } from './controls'
import {
  DRAFT_PRESETS,
  cloneDraft,
  draftKey,
  drawdown,
  validateDraft,
  MAX_SHAFTS,
  type WeaveDraft
} from '../fabric/weaveDraft'

/**
 * The weave-draft designer modal — a real loom draft laid out the classic way:
 * threading across the top (one column per warp end, one row per shaft), the
 * tie-up in the corner, treadling down the side (one row per pick), and the
 * live **drawdown** — the cloth the draft weaves — in the fourth quadrant.
 * Click a threading/treadling cell to re-assign, a tie-up cell to toggle.
 */

const MAX_EDIT_ENDS = 16

let overlay: HTMLElement | null = null

export function closeWeaveDraftEditor(): void {
  overlay?.remove()
  overlay = null
}

export const weaveDraftEditorOpen = (): boolean => overlay !== null

export function openWeaveDraftEditor(
  initial: WeaveDraft | undefined,
  onApply: (d: WeaveDraft | undefined) => void
): void {
  if (overlay) return
  const draft = cloneDraft(initial ?? DRAFT_PRESETS[0].draft)

  overlay = document.createElement('div')
  overlay.className = 'dio-sketch-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Weave draft designer')

  const card = el('div', 'dio-sketch-card dio-draft-card')
  const h = el('h2', undefined, 'Weave draft designer')
  const hint = el(
    'p',
    'dio-sketch-hint',
    'Threading (top): which shaft each warp end is drawn through. Tie-up (corner): which shafts each treadle lifts. Treadling (side): the pick sequence. The drawdown below is the cloth it weaves.'
  )

  // preset seeds
  const presetRow = el('div', 'dio-seg dio-seg-wrap')
  for (const p of DRAFT_PRESETS) {
    const b = el('button', 'dio-seg-btn', p.name)
    b.setAttribute('type', 'button')
    b.addEventListener('click', () => {
      Object.assign(draft, cloneDraft(p.draft))
      redraw()
    })
    presetRow.append(b)
  }

  // size steppers
  const stepperVals: (() => void)[] = []
  const stepper = (label: string, get: () => number, set: (v: number) => void, min: number, max: number): HTMLElement => {
    const wrap = el('span', 'dio-draft-step')
    const val = el('span', 'dio-draft-step-val', String(get()))
    stepperVals.push(() => { val.textContent = String(get()) })
    const mk = (txt: string, d: number): HTMLButtonElement => {
      const b = el('button', 'dio-seg-btn', txt)
      b.setAttribute('type', 'button')
      b.addEventListener('click', () => {
        set(Math.max(min, Math.min(max, get() + d)))
        redraw()
      })
      return b
    }
    wrap.append(el('span', 'dio-draft-step-label', label), mk('−', -1), val, mk('+', 1))
    return wrap
  }
  const clampInto = (): void => {
    draft.threading = draft.threading.map((s) => Math.min(s, draft.shafts - 1))
    draft.treadling = draft.treadling.map((t) => Math.min(t, draft.treadles - 1))
    draft.tieUp = Array.from({ length: draft.treadles }, (_, t) =>
      Array.from({ length: draft.shafts }, (_, s) => draft.tieUp[t]?.[s] ?? false)
    )
  }
  const resize = (arr: number[], n: number): number[] =>
    arr.length >= n ? arr.slice(0, n) : [...arr, ...Array.from({ length: n - arr.length }, (_, i) => arr[(arr.length + i) % arr.length] ?? 0)]
  const stepRow = el('div', 'dio-draft-steps')
  stepRow.append(
    stepper('Shafts', () => draft.shafts, (v) => { draft.shafts = v; clampInto() }, 2, MAX_SHAFTS),
    stepper('Treadles', () => draft.treadles, (v) => { draft.treadles = v; clampInto() }, 2, MAX_SHAFTS),
    stepper('Ends', () => draft.threading.length, (v) => { draft.threading = resize(draft.threading, v) }, 1, MAX_EDIT_ENDS),
    stepper('Picks', () => draft.treadling.length, (v) => { draft.treadling = resize(draft.treadling, v) }, 1, MAX_EDIT_ENDS)
  )

  // the four quadrants
  const threadingGrid = el('div', 'dio-draft-grid')
  const tieUpGrid = el('div', 'dio-draft-grid')
  const treadlingGrid = el('div', 'dio-draft-grid')
  const ddCanvas = document.createElement('canvas')
  ddCanvas.className = 'dio-draft-drawdown'
  const quadrants = el('div', 'dio-draft-quadrants')
  quadrants.append(threadingGrid, tieUpGrid, ddCanvas, treadlingGrid)

  const problem = el('div', 'dio-draft-problem', '')
  const applyBtn = button('Apply to garment', () => {
    onApply(cloneDraft(draft))
    closeWeaveDraftEditor()
  }, true)
  const removeBtn = button('Remove draft', () => {
    onApply(undefined)
    closeWeaveDraftEditor()
  })
  const cancelBtn = button('Cancel', () => closeWeaveDraftEditor())
  const actions = el('div', 'dio-actions')
  actions.append(applyBtn, ...(initial ? [removeBtn] : []), cancelBtn)

  const cell = (on: boolean, onClick: () => void): HTMLButtonElement => {
    const b = el('button', 'dio-draft-cell' + (on ? ' on' : ''))
    b.setAttribute('type', 'button')
    b.addEventListener('click', () => {
      onClick()
      redraw()
    })
    return b
  }

  function redraw(): void {
    for (const refresh of stepperVals) refresh()
    const ends = draft.threading.length
    const picks = draft.treadling.length
    // threading — shafts rows × ends columns (shaft 1 on the bottom row, weaver style)
    threadingGrid.style.gridTemplateColumns = `repeat(${ends}, var(--draft-cell))`
    threadingGrid.replaceChildren()
    for (let s = draft.shafts - 1; s >= 0; s--) {
      for (let e = 0; e < ends; e++) {
        threadingGrid.append(cell(draft.threading[e] === s, () => { draft.threading[e] = s }))
      }
    }
    // tie-up — shafts rows × treadles columns
    tieUpGrid.style.gridTemplateColumns = `repeat(${draft.treadles}, var(--draft-cell))`
    tieUpGrid.replaceChildren()
    for (let s = draft.shafts - 1; s >= 0; s--) {
      for (let t = 0; t < draft.treadles; t++) {
        tieUpGrid.append(cell(draft.tieUp[t][s], () => { draft.tieUp[t][s] = !draft.tieUp[t][s] }))
      }
    }
    // treadling — picks rows × treadles columns (first pick at the top, weaving down)
    treadlingGrid.style.gridTemplateColumns = `repeat(${draft.treadles}, var(--draft-cell))`
    treadlingGrid.replaceChildren()
    for (let p = 0; p < picks; p++) {
      for (let t = 0; t < draft.treadles; t++) {
        treadlingGrid.append(cell(draft.treadling[p] === t, () => { draft.treadling[p] = t }))
      }
    }
    // drawdown — the woven cloth, tiled 2×2 so the repeat reads
    const err = validateDraft(draft)
    problem.textContent = err ?? ''
    applyBtn.disabled = !!err
    const REPS = 2
    const px = Math.max(4, Math.min(14, Math.floor(180 / Math.max(ends, picks) / REPS)))
    ddCanvas.width = ends * REPS * px
    ddCanvas.height = picks * REPS * px
    const ctx = ddCanvas.getContext('2d')!
    if (err) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(0, 0, ddCanvas.width, ddCanvas.height)
      return
    }
    const dd = drawdown(draft)
    for (let y = 0; y < picks * REPS; y++) {
      for (let x = 0; x < ends * REPS; x++) {
        // warp-up cells dark (the vertical yarn), weft cells light — the classic drawdown
        ctx.fillStyle = dd.up[y % picks][x % ends] ? '#3d4f78' : '#c9cdd6'
        ctx.fillRect(x * px, y * px, px - 1, px - 1)
      }
    }
  }
  redraw()

  card.append(h, hint, presetRow, stepRow, quadrants, problem, actions)
  overlay.append(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeWeaveDraftEditor()
  })
  window.addEventListener('keydown', function esc(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      closeWeaveDraftEditor()
      window.removeEventListener('keydown', esc)
    }
  })
  document.body.append(overlay)
}

/** Label for the panel: the matching preset's name, or "custom". */
export function draftLabel(d: WeaveDraft | undefined): string {
  if (!d) return 'None'
  const key = draftKey(d)
  return DRAFT_PRESETS.find((p) => draftKey(p.draft) === key)?.name ?? 'Custom'
}
