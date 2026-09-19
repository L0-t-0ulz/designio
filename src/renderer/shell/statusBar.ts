import { createElement, Pause, Play } from 'lucide'
import { el } from '../ui/controls'

export interface StatusHandles {
  setFps: (fps: number) => void
  setSelection: (text: string) => void
  setSim: (running: boolean) => void
}

/** A one-click camera framing offered as a button in the bar. */
export interface QuickView {
  /** Button face — one or two characters; the bar is tight. */
  label: string
  /** Tooltip / accessible name. */
  title: string
  run: () => void
}

/** Bottom status bar: simulate toggle · sim state · selection · quick views · units · fps. */
export function buildStatusBar(
  host: HTMLElement,
  onToggleSim: () => void,
  running: boolean,
  initialSelection = 'No selection',
  quickViews: QuickView[] = []
): StatusHandles {
  host.replaceChildren()
  const simBtn = el('button', 'dio-status-btn')
  const sim = el('span', 'dio-status-item')
  const sel = el('span', 'dio-status-item', initialSelection)
  const spacer = el('span', 'dio-status-spacer')
  const units = el('span', 'dio-status-item', 'Units: m')
  const fps = el('span', 'dio-status-item dio-status-fps', '— fps')

  const setSim = (r: boolean): void => {
    simBtn.replaceChildren(createElement(r ? Pause : Play), document.createTextNode(r ? ' Pause' : ' Play'))
    simBtn.setAttribute('aria-label', r ? 'Pause simulation' : 'Play simulation')
    sim.textContent = r ? 'Simulating' : 'Paused'
  }
  setSim(running)
  simBtn.addEventListener('click', onToggleSim)

  host.append(simBtn, sim, sel, spacer)

  // Quick camera framings (front / back / sides). Omitted entirely when none are
  // supplied, so the bar is unchanged for callers that don't offer them.
  if (quickViews.length) {
    const group = el('span', 'dio-status-views')
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', 'Camera framing')
    for (const v of quickViews) {
      const b = el('button', 'dio-status-btn dio-status-view', v.label)
      b.title = v.title
      b.setAttribute('aria-label', v.title)
      b.addEventListener('click', v.run)
      group.append(b)
    }
    host.append(group)
  }

  host.append(units, fps)
  return {
    setFps: (n) => (fps.textContent = `${Math.round(n)} fps`),
    setSelection: (t) => (sel.textContent = t),
    setSim
  }
}
