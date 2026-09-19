import { el } from '../ui/controls'
import type { PathTraceQuality } from '../core/pathTracePlan'

/** Live edits from the quick toolbar — the *same* garment they drive in 3D + 2D. */
export interface PatternEditor {
  length: () => number // 0…1 proportion
  ease: () => number // metres
  flare: () => number // metres
  size: () => string
  neckline: () => string
  sleeve: () => string
  supports: () => { length: boolean; ease: boolean; flare: boolean; neckline: boolean; sleeve: boolean }
  nudgeLength: (d: number) => void
  nudgeEase: (d: number) => void
  nudgeFlare: (d: number) => void
  nudgeSize: (d: number) => void
  nudgeNeckline: (d: number) => void
  nudgeSleeve: (d: number) => void
  /** Pin a pattern note at (x, y) in the SVG's mm space. */
  addNote: (x: number, y: number, text: string) => void
  /** Remove every pattern note. */
  clearNotes: () => void
}

export interface CenterTabsHandle {
  /** Re-render the quick tools (+ the 2D pattern if it's showing). */
  refresh: () => void
  /** Programmatically switch tab (used by the `?view=pattern` / `?view=render` deep-links). */
  show: (which: '3d' | 'pattern' | 'render') => void
  /** Open the Render tab in path-traced mode + kick off a hero render (the `?pathtrace=` deep-link). */
  pathTrace: (quality?: PathTraceQuality) => void
}

/** Progress + cancel handle a path trace reports to. */
export interface PathTraceRun {
  width: number
  quality: PathTraceQuality
  onProgress: (frac: number) => void
  signal: { cancelled: boolean }
}

/** Drives the Render tab: capture a high-res still + save it as a PNG. */
export interface RenderApi {
  /** A PNG data URL of the current view, supersampled to `width` px wide. */
  capture: (width: number) => string
  /** Save a PNG data URL to disk. */
  save: (dataUrl: string) => void | Promise<void>
  /** Rack focus: null = depth-of-field off; 0…1 sweeps near → subject → far. */
  focusPull?: (t: number | null) => void
  /** Offline path-traced hero render — converges async, resolves to a PNG data URL. */
  pathTrace?: (run: PathTraceRun) => Promise<string>
}

const PT_QUALITIES: { label: string; value: PathTraceQuality }[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'High', value: 'high' },
  { label: 'Ultra', value: 'ultra' }
]

const RES: { label: string; width: number }[] = [
  { label: 'HD', width: 1280 },
  { label: '2K', width: 2048 },
  { label: '4K', width: 3840 }
]

/**
 * The central dual viewport: a floating tab bar (3D · 2D Pattern) plus a
 * **persistent quick-edit toolbar over the viewport**, shown in *both* 3D and 2D.
 * Size · neckline · sleeve · length · width · hem are one click away either way —
 * 2D and 3D are one design, always in sync.
 */
export function buildCenterTabs(
  center: HTMLElement,
  patternSvg: (opts?: { grid?: boolean }) => string,
  edit?: PatternEditor,
  render?: RenderApi
): CenterTabsHandle {
  const tabs = el('div', 'dio-view-tabs')
  const tab3d = el('button', 'dio-view-tab on', '3D')
  const tabPat = el('button', 'dio-view-tab', '2D Pattern')
  tabs.append(tab3d, tabPat)
  const tabRender = el('button', 'dio-view-tab', 'Render')
  if (render) tabs.append(tabRender)

  // The quick toolbar floats over the viewport (visible in both 3D and 2D).
  const tools = el('div', 'dio-pattern-tools dio-center-tools')

  const pane = el('div', 'dio-pattern-pane dio-hidden')
  const inner = el('div', 'dio-pattern-inner')
  const caption = el('div', 'dio-pattern-cap', 'Edit above — 3D + 2D update live · export SVG / DXF from the File menu.')

  // Measured background, off by default so the sheet stays clean for a screenshot.
  let gridOn = false
  const gridBtn = el('button', 'dio-status-btn dio-pattern-grid-btn', 'Grid')
  gridBtn.title = 'Show a centimetre grid and ruler behind the panels'
  gridBtn.setAttribute('aria-pressed', 'false')
  gridBtn.addEventListener('click', () => {
    gridOn = !gridOn
    gridBtn.setAttribute('aria-pressed', String(gridOn))
    gridBtn.classList.toggle('on', gridOn)
    renderPattern()
  })
  caption.append(document.createTextNode(' '), gridBtn)
  pane.append(inner, caption)

  // ---- Render pane: a high-res still of the current view + resolution + save ----
  const rpane = el('div', 'dio-render-pane dio-hidden')
  const rbar = el('div', 'dio-render-bar')
  const rres = el('div', 'dio-render-res')
  const rimg = el('img', 'dio-render-img') as HTMLImageElement
  const rstage = el('div', 'dio-render-stage')
  rstage.append(rimg)
  const rsave = el('button', 'dio-render-save', 'Save PNG')
  // Path-traced hero-render progress overlay (a label + a thin bar over the stage).
  const rprog = el('div', 'dio-render-progress dio-hidden')
  const rproglabel = el('span', 'dio-render-proglabel', 'Path tracing…')
  const rprogbar = el('div', 'dio-render-progbar')
  const rprogfill = el('div', 'dio-render-progfill')
  rprogbar.append(rprogfill)
  rprog.append(rproglabel, rprogbar)
  rstage.append(rprog)
  let curUrl = ''
  let curWidth = RES[1].width
  let ptOn = false
  let ptQuality: PathTraceQuality = 'high'
  let ptRun: { cancelled: boolean } | null = null
  const setProgress = (frac: number): void => {
    rprogfill.style.width = `${Math.round(frac * 100)}%`
    rproglabel.textContent = `Path tracing… ${Math.round(frac * 100)}%`
  }
  const capture = async (): Promise<void> => {
    if (!render) return
    // Cancel any path trace already in flight (a new resolution/quality supersedes it).
    if (ptRun) ptRun.cancelled = true
    if (ptOn && render.pathTrace) {
      const signal = { cancelled: false }
      ptRun = signal
      setProgress(0)
      rprog.classList.remove('dio-hidden')
      try {
        const url = await render.pathTrace({ width: curWidth, quality: ptQuality, onProgress: setProgress, signal })
        if (!signal.cancelled) {
          curUrl = url
          rimg.src = url
        }
      } catch (err) {
        if (!signal.cancelled) rproglabel.textContent = 'Path trace failed — see console'
        console.error('Path trace failed:', err)
      } finally {
        if (ptRun === signal) {
          ptRun = null
          rprog.classList.add('dio-hidden')
        }
      }
    } else {
      rpane.classList.add('dio-render-busy')
      // let the "Rendering…" state paint before the (blocking) supersample
      requestAnimationFrame(() => {
        curUrl = render.capture(curWidth)
        rimg.src = curUrl
        rpane.classList.remove('dio-render-busy')
      })
    }
  }
  const resButtons: HTMLButtonElement[] = RES.map((r) => {
    const b = el('button', 'dio-render-resbtn' + (r.width === curWidth ? ' on' : ''), `${r.label} · ${r.width}px`) as HTMLButtonElement
    b.addEventListener('click', () => {
      curWidth = r.width
      resButtons.forEach((x, i) => x.classList.toggle('on', RES[i].width === curWidth))
      capture()
    })
    return b
  })
  rres.append(...resButtons)
  rsave.addEventListener('click', () => curUrl && render?.save(curUrl))
  const rhint = el('span', 'dio-render-hint', 'Orbit the 3D view to frame your shot, then Render.')
  // Focus pull — DOF toggle + a rack-focus slider (near → subject → far), re-rendered live.
  const focusWrap = el('div', 'dio-render-focus')
  const focusBtn = el('button', 'dio-render-resbtn', 'Focus pull') as HTMLButtonElement
  const focusRange = el('input', 'dio-render-focusrange dio-hidden') as HTMLInputElement
  focusRange.type = 'range'
  focusRange.min = '0'
  focusRange.max = '1'
  focusRange.step = '0.02'
  focusRange.value = '0.5'
  let focusOn = false
  focusBtn.addEventListener('click', () => {
    focusOn = !focusOn
    focusBtn.classList.toggle('on', focusOn)
    focusRange.classList.toggle('dio-hidden', !focusOn)
    render?.focusPull?.(focusOn ? parseFloat(focusRange.value) : null)
    capture()
  })
  focusRange.addEventListener('change', () => {
    render?.focusPull?.(parseFloat(focusRange.value))
    capture()
  })
  focusWrap.append(focusBtn, focusRange)
  // Path-traced hero render — a toggle + Draft/High/Ultra quality selector (offline GI still).
  const ptWrap = el('div', 'dio-render-pt-wrap')
  const ptBtn = el('button', 'dio-render-resbtn dio-render-ptbtn', '✦ Path traced') as HTMLButtonElement
  const ptQualGroup = el('div', 'dio-render-res dio-render-ptqual dio-hidden')
  const ptQualBtns: HTMLButtonElement[] = PT_QUALITIES.map((q) => {
    const b = el('button', 'dio-render-resbtn' + (q.value === ptQuality ? ' on' : ''), q.label) as HTMLButtonElement
    b.addEventListener('click', () => {
      ptQuality = q.value
      ptQualBtns.forEach((x, i) => x.classList.toggle('on', PT_QUALITIES[i].value === ptQuality))
      if (ptOn) void capture()
    })
    return b
  })
  ptQualGroup.append(...ptQualBtns)
  ptBtn.addEventListener('click', () => {
    ptOn = !ptOn
    ptBtn.classList.toggle('on', ptOn)
    ptQualGroup.classList.toggle('dio-hidden', !ptOn)
    void capture()
  })
  ptWrap.append(ptBtn, ptQualGroup)
  rbar.append(rres, focusWrap, ...(render?.pathTrace ? [ptWrap] : []), rhint, rsave)
  rpane.append(rbar, rstage)

  center.append(tabs, tools, pane, rpane)

  const stepper = (
    label: string,
    value: () => string,
    dec: () => void,
    inc: () => void,
    decSym = '−',
    incSym = '+'
  ): HTMLElement => {
    const wrap = el('div', 'dio-pat-step')
    wrap.append(el('span', 'dio-pat-step-label', label))
    const grp = el('div', 'dio-pat-step-grp')
    const bd = el('button', 'dio-pat-step-btn', decSym)
    const val = el('span', 'dio-pat-step-val', value())
    const bi = el('button', 'dio-pat-step-btn', incSym)
    bd.addEventListener('click', () => {
      dec()
      renderTools()
    })
    bi.addEventListener('click', () => {
      inc()
      renderTools()
    })
    grp.append(bd, val, bi)
    wrap.append(grp)
    return wrap
  }

  const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

  const renderTools = (): void => {
    tools.replaceChildren()
    if (!edit) return
    const sup = edit.supports()
    tools.append(stepper('Size', () => edit.size(), () => edit.nudgeSize(-1), () => edit.nudgeSize(1), '◀', '▶'))
    if (sup.neckline) {
      tools.append(stepper('Neck', () => cap(edit.neckline()), () => edit.nudgeNeckline(-1), () => edit.nudgeNeckline(1), '◀', '▶'))
    }
    if (sup.sleeve) {
      tools.append(stepper('Sleeve', () => cap(edit.sleeve()), () => edit.nudgeSleeve(-1), () => edit.nudgeSleeve(1), '◀', '▶'))
    }
    if (sup.length) {
      tools.append(stepper('Length', () => `${Math.round(edit.length() * 100)}%`, () => edit.nudgeLength(-0.05), () => edit.nudgeLength(0.05)))
    }
    if (sup.ease) {
      tools.append(stepper('Width', () => `${(edit.ease() * 100).toFixed(1)} cm`, () => edit.nudgeEase(-0.005), () => edit.nudgeEase(0.005)))
    }
    if (sup.flare) {
      tools.append(stepper('Hem', () => `${(edit.flare() * 100).toFixed(1)} cm`, () => edit.nudgeFlare(-0.01), () => edit.nudgeFlare(0.01)))
    }
    if (!pane.classList.contains('dio-hidden')) {
      // 2D-only: pin/clear pattern notes
      const noteBtn = el('button', 'dio-pat-step-btn dio-pat-note-btn', '+ Note')
      noteBtn.addEventListener('click', () => {
        noteArmed = true
        noteBtn.textContent = 'Click the pattern…'
      })
      const clearBtn = el('button', 'dio-pat-step-btn', 'Clear notes')
      clearBtn.addEventListener('click', () => {
        edit.clearNotes()
        renderPattern()
      })
      const wrapN = el('div', 'dio-pat-step')
      wrapN.append(noteBtn, clearBtn)
      tools.append(wrapN)
    }
  }

  const renderPattern = (): void => {
    inner.innerHTML = patternSvg({ grid: gridOn })
    renderTools()
  }

  // Pattern notes — arm the tool, click the pattern, type, Enter. Coordinates map
  // through the inline SVG's viewBox so notes live in the pattern's mm space.
  let noteArmed = false
  inner.addEventListener('click', (ev) => {
    if (!noteArmed || !edit) return
    const svg = inner.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vb = svg.viewBox.baseVal
    const mmX = ((ev.clientX - rect.left) / rect.width) * vb.width + vb.x
    const mmY = ((ev.clientY - rect.top) / rect.height) * vb.height + vb.y
    noteArmed = false
    const input = document.createElement('input')
    input.className = 'dio-pat-note-input'
    input.placeholder = 'Note…  (Enter to pin)'
    input.style.left = ev.clientX + 'px'
    input.style.top = ev.clientY + 'px'
    document.body.appendChild(input)
    input.focus()
    const closeInput = (): void => input.remove()
    input.addEventListener('keydown', (ke) => {
      if (ke.key === 'Escape') closeInput()
      if (ke.key === 'Enter') {
        const text = input.value.trim()
        closeInput()
        if (text) {
          edit.addNote(mmX, mmY, text)
          renderPattern()
        }
      }
    })
    input.addEventListener('blur', closeInput)
  })
  const show = (which: '3d' | 'pattern' | 'render'): void => {
    tab3d.classList.toggle('on', which === '3d')
    tabPat.classList.toggle('on', which === 'pattern')
    tabRender.classList.toggle('on', which === 'render')
    pane.classList.toggle('dio-hidden', which !== 'pattern')
    rpane.classList.toggle('dio-hidden', which !== 'render')
    tools.classList.toggle('dio-hidden', which === 'render') // hide edit tools over a render
    if (which === 'pattern') renderPattern()
    if (which === 'render') capture()
  }
  tab3d.addEventListener('click', () => show('3d'))
  tabPat.addEventListener('click', () => show('pattern'))
  tabRender.addEventListener('click', () => show('render'))

  renderTools() // shown from the start (over the 3D view)

  return {
    refresh: () => {
      renderTools()
      if (!pane.classList.contains('dio-hidden')) inner.innerHTML = patternSvg({ grid: gridOn })
    },
    show,
    pathTrace: (quality?: PathTraceQuality) => {
      if (quality) {
        ptQuality = quality
        ptQualBtns.forEach((x, i) => x.classList.toggle('on', PT_QUALITIES[i].value === ptQuality))
      }
      if (!ptOn) {
        ptOn = true
        ptBtn.classList.add('on')
        ptQualGroup.classList.remove('dio-hidden')
      }
      show('render') // switches to the render pane + kicks off the (path-traced) capture
    }
  }
}
