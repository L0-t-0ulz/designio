import { el } from '../ui/controls'

export interface CenterTabsHandle {
  /** Re-render the 2D pattern if it's the active pane. */
  refresh: () => void
}

/**
 * The central dual viewport: a small floating tab bar (3D · 2D Pattern) over the
 * viewport. "2D Pattern" overlays the flat pattern (reusing the SVG exporter) on a
 * light card; "3D" shows the live viewport underneath.
 */
export function buildCenterTabs(center: HTMLElement, patternSvg: () => string): CenterTabsHandle {
  const tabs = el('div', 'dio-view-tabs')
  const tab3d = el('button', 'dio-view-tab on', '3D')
  const tabPat = el('button', 'dio-view-tab', '2D Pattern')
  tabs.append(tab3d, tabPat)

  const pane = el('div', 'dio-pattern-pane dio-hidden')
  const inner = el('div', 'dio-pattern-inner')
  const caption = el('div', 'dio-pattern-cap', 'Flat pattern — export as SVG / DXF from the File menu.')
  pane.append(inner, caption)

  center.append(tabs, pane)

  const render = (): void => {
    inner.innerHTML = patternSvg()
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
    }
  }
}
