import * as THREE from 'three'
import { el } from '../ui/controls'

export interface ObjectBrowserHandle {
  refresh: () => void
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/**
 * Lists the current garment's pieces (name + fabric swatch + visibility toggle).
 * Wired to live meshes — toggling flips `mesh.visible` directly.
 */
export function buildObjectBrowser(
  host: HTMLElement,
  getPieces: () => { name: string; mesh: THREE.Mesh }[],
  fabricColor: () => number
): ObjectBrowserHandle {
  host.replaceChildren()
  const root = el('div', 'dio-objbrowser')
  root.append(el('div', 'dio-objbrowser-title', 'Objects'))
  const list = el('div')
  root.append(list)
  host.append(root)

  const render = (): void => {
    list.replaceChildren()
    const pieces = getPieces()
    if (!pieces.length) {
      list.append(el('div', 'dio-lib-empty', 'No garment'))
      return
    }
    for (const p of pieces) {
      const row = el('div', 'dio-obj-item' + (p.mesh.visible ? '' : ' hidden'))
      const swatch = el('div', 'dio-obj-swatch')
      swatch.style.background = hex(fabricColor())
      const name = el('div', 'dio-obj-name', p.name)
      const vis = el('button', 'dio-obj-vis', p.mesh.visible ? '👁' : '⦸')
      vis.title = 'Show / hide'
      vis.setAttribute('aria-label', `Toggle visibility of ${p.name}`)
      vis.addEventListener('click', () => {
        p.mesh.visible = !p.mesh.visible
        render()
      })
      row.append(swatch, name, vis)
      list.append(row)
    }
  }
  render()
  return { refresh: render }
}
