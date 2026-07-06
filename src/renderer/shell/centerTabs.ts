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
  /** Programmatically switch tab (used by the `?view=pattern` deep-link). */
  show: (which: '3d' | 'pattern') => void
}

/**
 * The central dual viewport: a floating tab bar (3D · 2D Pattern) plus a
 * **persistent quick-edit toolbar over the viewport**, shown in *both* 3D and 2D.
 * Size · neckline · sleeve · length · width · hem are one click away either way —
 * 2D and 3D are one design, always in sync.
 */
export function buildCenterTabs(
  center: HTMLElement,
  patternSvg: () => string,
  edit?: PatternEditor
): CenterTabsHandle {
  const tabs = el('div', 'dio-view-tabs')
  const tab3d = el('button', 'dio-view-tab on', '3D')
  const tabPat = el('button', 'dio-view-tab', '2D Pattern')
  tabs.append(tab3d, tabPat)

  // The quick toolbar floats over the viewport (visible in both 3D and 2D).
  const tools = el('div', 'dio-pattern-tools dio-center-tools')

  const pane = el('div', 'dio-pattern-pane dio-hidden')
  const inner = el('div', 'dio-pattern-inner')
  const caption = el('div', 'dio-pattern-cap', 'Edit above — 3D + 2D update live · export SVG / DXF from the File menu.')
  pane.append(inner, caption)

  center.append(tabs, tools, pane)

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
      tools.append(stepper('Length', () => edit.length().toFixed(2), () => edit.nudgeLength(-0.05), () => edit.nudgeLength(0.05)))
    }
    if (sup.ease) {
      tools.append(stepper('Width', () => `${Math.round(edit.ease() * 100)} cm`, () => edit.nudgeEase(-0.005), () => edit.nudgeEase(0.005)))
    }
    if (sup.flare) {
      tools.append(stepper('Hem', () => `${Math.round(edit.flare() * 100)} cm`, () => edit.nudgeFlare(-0.01), () => edit.nudgeFlare(0.01)))
    }
  }

  const render = (): void => {
    inner.innerHTML = patternSvg()
    renderTools()
  }
  const show = (which: '3d' | 'pattern'): void => {
    tab3d.classList.toggle('on', which === '3d')
    tabPat.classList.toggle('on', which === 'pattern')
    pane.classList.toggle('dio-hidden', which !== 'pattern')
    if (which === 'pattern') render()
  }
  tab3d.addEventListener('click', () => show('3d'))
  tabPat.addEventListener('click', () => show('pattern'))

  renderTools() // shown from the start (over the 3D view)

  return {
    refresh: () => {
      renderTools()
      if (!pane.classList.contains('dio-hidden')) inner.innerHTML = patternSvg()
    },
    show
  }
}
