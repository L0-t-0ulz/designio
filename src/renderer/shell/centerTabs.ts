import { el } from '../ui/controls'

/** Live edits made from the 2D pane — the *same* garment they drive in 3D. */
export interface PatternEditor {
  length: () => number // 0…1 proportion
  ease: () => number // metres
  flare: () => number // metres
  size: () => string
  supports: () => { length: boolean; ease: boolean; flare: boolean }
  nudgeLength: (d: number) => void
  nudgeEase: (d: number) => void
  nudgeFlare: (d: number) => void
  nudgeSize: (d: number) => void
}

export interface CenterTabsHandle {
  /** Re-render the 2D pattern + its edit tools if the pane is showing. */
  refresh: () => void
  /** Programmatically switch tab (used by the `?view=pattern` deep-link). */
  show: (which: '3d' | 'pattern') => void
}

/**
 * The central dual viewport: a floating tab bar (3D · 2D Pattern) over the
 * viewport. **2D and 3D are one design** — the 2D pane isn't just a render, it
 * carries live edit tools (size · length · width · hem) that drive the same
 * garment, so you can design entirely in 2D and the 3D stays in sync (and back).
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

  const pane = el('div', 'dio-pattern-pane dio-hidden')
  const tools = el('div', 'dio-pattern-tools')
  const inner = el('div', 'dio-pattern-inner')
  const caption = el('div', 'dio-pattern-cap', 'Edit here — the 3D updates live · export as SVG / DXF from the File menu.')
  pane.append(tools, inner, caption)

  center.append(tabs, pane)

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

  const renderTools = (): void => {
    tools.replaceChildren()
    if (!edit) return
    const sup = edit.supports()
    tools.append(
      stepper('Size', () => edit.size(), () => edit.nudgeSize(-1), () => edit.nudgeSize(1), '◀', '▶')
    )
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

  return {
    refresh: () => {
      if (!pane.classList.contains('dio-hidden')) render()
    },
    show
  }
}
