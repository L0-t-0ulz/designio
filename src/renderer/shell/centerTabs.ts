import { el } from '../ui/controls'

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
}

export interface CenterTabsHandle {
  /** Re-render the quick tools (+ the 2D pattern if it's showing). */
  refresh: () => void
  /** Programmatically switch tab (used by the `?view=pattern` / `?view=render` deep-links). */
  show: (which: '3d' | 'pattern' | 'render') => void
}

/** Drives the Render tab: capture a high-res still + save it as a PNG. */
export interface RenderApi {
  /** A PNG data URL of the current view, supersampled to `width` px wide. */
  capture: (width: number) => string
  /** Save a PNG data URL to disk. */
  save: (dataUrl: string) => void | Promise<void>
}

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
  patternSvg: () => string,
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
  pane.append(inner, caption)

  // ---- Render pane: a high-res still of the current view + resolution + save ----
  const rpane = el('div', 'dio-render-pane dio-hidden')
  const rbar = el('div', 'dio-render-bar')
  const rres = el('div', 'dio-render-res')
  const rimg = el('img', 'dio-render-img') as HTMLImageElement
  const rstage = el('div', 'dio-render-stage')
  rstage.append(rimg)
  const rsave = el('button', 'dio-render-save', 'Save PNG')
  let curUrl = ''
  let curWidth = RES[1].width
  const capture = (): void => {
    if (!render) return
    rpane.classList.add('dio-render-busy')
    // let the "Rendering…" state paint before the (blocking) supersample
    requestAnimationFrame(() => {
      curUrl = render.capture(curWidth)
      rimg.src = curUrl
      rpane.classList.remove('dio-render-busy')
    })
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
  rbar.append(rres, rhint, rsave)
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
  }

  const renderPattern = (): void => {
    inner.innerHTML = patternSvg()
    renderTools()
  }
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
      if (!pane.classList.contains('dio-hidden')) inner.innerHTML = patternSvg()
    },
    show
  }
}
