import { createElement, Copy, Eye, EyeOff, Plus, Trash2 } from 'lucide'
import { el } from '../ui/controls'
import type { LayerSummary } from '../studio/GarmentStack'

export interface ObjectBrowserHandle {
  refresh: () => void
  /** Show/hide the whole browser (Simple/Pro view). */
  setVisible: (v: boolean) => void
}

export interface ObjBrowserActions {
  /** One row per garment layer worn on the body. */
  list: () => LayerSummary[]
  onSelect: (i: number) => void
  onToggleVisible: (i: number) => void
  onAdd: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/**
 * The Object Browser: the garments worn on the mannequin, one row each — select
 * (drives the Property Editor), toggle visibility, and add / duplicate / delete.
 */
export function buildObjectBrowser(host: HTMLElement, a: ObjBrowserActions): ObjectBrowserHandle {
  host.replaceChildren()
  const root = el('div', 'dio-objbrowser')
  const head = el('div', 'dio-objbrowser-head')
  head.append(el('div', 'dio-objbrowser-title', 'Garments'))
  const tools = el('div', 'dio-obj-tools')
  const toolBtn = (icon: Parameters<typeof createElement>[0], title: string, run: () => void): HTMLElement => {
    const b = el('button', 'dio-obj-tool')
    b.append(createElement(icon))
    b.title = title
    b.setAttribute('aria-label', title)
    b.addEventListener('click', run)
    return b
  }
  tools.append(
    toolBtn(Plus, 'Add garment', a.onAdd),
    toolBtn(Copy, 'Duplicate selected', a.onDuplicate),
    toolBtn(Trash2, 'Delete selected', a.onDelete)
  )
  head.append(tools)
  root.append(head)
  const list = el('div')
  root.append(list)
  host.append(root)

  const render = (): void => {
    list.replaceChildren()
    const rows = a.list()
    if (!rows.length) {
      list.append(el('div', 'dio-lib-empty', 'No garments'))
      return
    }
    rows.forEach((r, i) => {
      const row = el('div', 'dio-obj-item' + (r.visible ? '' : ' hidden') + (r.active ? ' active' : ''))
      const swatch = el('div', 'dio-obj-swatch')
      swatch.style.background = hex(r.color)
      const name = el('div', 'dio-obj-name')
      name.append(el('span', undefined, r.name), el('span', 'dio-obj-sub', ` · ${r.pieces} piece${r.pieces === 1 ? '' : 's'}`))
      name.style.cursor = 'pointer'
      name.addEventListener('click', () => a.onSelect(i))
      swatch.style.cursor = 'pointer'
      swatch.addEventListener('click', () => a.onSelect(i))
      const vis = el('button', 'dio-obj-vis')
      vis.append(createElement(r.visible ? Eye : EyeOff))
      vis.title = r.visible ? 'Hide' : 'Show'
      vis.setAttribute('aria-label', `${r.visible ? 'Hide' : 'Show'} ${r.name}`)
      vis.addEventListener('click', () => {
        a.onToggleVisible(i)
        render()
      })
      row.append(swatch, name, vis)
      list.append(row)
    })
  }
  render()
  return {
    refresh: render,
    setVisible: (v) => (root.style.display = v ? '' : 'none')
  }
}
