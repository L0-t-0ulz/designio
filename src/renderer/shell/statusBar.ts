import { el } from '../ui/controls'

export interface StatusHandles {
  setFps: (fps: number) => void
  setSelection: (text: string) => void
  setSim: (running: boolean) => void
}

/** Bottom status bar: simulate toggle · sim state · selection · units · fps. */
export function buildStatusBar(host: HTMLElement, onToggleSim: () => void, running: boolean): StatusHandles {
  host.replaceChildren()
  const simBtn = el('button', 'dio-status-btn')
  const sim = el('span', 'dio-status-item')
  const sel = el('span', 'dio-status-item', 'No selection')
  const spacer = el('span', 'dio-status-spacer')
  const units = el('span', 'dio-status-item', 'Units: m')
  const fps = el('span', 'dio-status-item dio-status-fps', '— fps')

  const setSim = (r: boolean): void => {
    simBtn.textContent = r ? '❙❙ Pause' : '▶ Play'
    sim.textContent = r ? 'Simulating' : 'Paused'
  }
  setSim(running)
  simBtn.addEventListener('click', onToggleSim)

  host.append(simBtn, sim, sel, spacer, units, fps)
  return {
    setFps: (n) => (fps.textContent = `${Math.round(n)} fps`),
    setSelection: (t) => (sel.textContent = t),
    setSim
  }
}
