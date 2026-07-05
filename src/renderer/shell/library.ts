import { el } from '../ui/controls'
import type { BodyType } from '../avatar/Mannequin'
import { GARMENT_CATEGORIES, garmentsByCategory } from '../garments/registry'
import { FABRIC_FAMILIES, FABRIC_LIBRARY } from '../fabric/FabricLibrary'
import { GARMENT_SIL, fabricSwatchCanvas } from '../ui/thumbnails'
import { PRESETS, type Preset } from '../start/presets'

type Tab = 'garments' | 'fabrics' | 'avatars' | 'presets'

export interface LibraryActions {
  selectGarment: (id: string) => void
  selectFabric: (id: string) => void
  setFigure: (t: BodyType) => void
  applyPreset: (p: Preset) => void
  currentGarment: () => string
  currentFabric: () => string
  currentBodyType: () => BodyType
}

export interface LibraryHandle {
  refresh: () => void
}

const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/**
 * The left Library: a tabbed, searchable asset browser (Garments · Fabrics ·
 * Avatars · Presets) fed from the real registries. Clicking an item applies it to
 * the scene via the shared panel API (so the docked panel stays in sync).
 */
export function buildLibrary(host: HTMLElement, a: LibraryActions): LibraryHandle {
  host.replaceChildren()
  const root = el('div', 'dio-lib')
  const tabsRow = el('div', 'dio-lib-tabs')
  const search = el('input', 'dio-lib-search') as HTMLInputElement
  search.type = 'search'
  search.placeholder = 'Search…'
  const body = el('div', 'dio-lib-body')
  root.append(tabsRow, search, body)
  host.append(root)

  let tab: Tab = 'garments'
  let query = ''

  const tabs: [Tab, string][] = [
    ['garments', 'Garments'],
    ['fabrics', 'Fabrics'],
    ['avatars', 'Avatars'],
    ['presets', 'Presets']
  ]
  const tabBtns = new Map<Tab, HTMLElement>()
  for (const [id, label] of tabs) {
    const b = el('button', 'dio-lib-tab', label)
    b.addEventListener('click', () => {
      tab = id
      for (const [t, n] of tabBtns) n.classList.toggle('on', t === id)
      render()
    })
    tabBtns.set(id, b)
    tabsRow.append(b)
  }
  tabBtns.get(tab)!.classList.add('on')
  search.addEventListener('input', () => {
    query = search.value.trim().toLowerCase()
    render()
  })

  const match = (name: string): boolean => !query || name.toLowerCase().includes(query)
  const cat = (label: string): HTMLElement => el('div', 'dio-lib-cat', label)
  const grid = (): HTMLElement => el('div', 'dio-lib-grid')

  const item = (name: string, on: boolean, fill: (n: HTMLElement) => void, onClick: () => void): HTMLElement => {
    const node = el('div', 'dio-lib-item' + (on ? ' on' : ''))
    fill(node)
    node.append(el('div', 'dio-lib-name', name))
    node.title = name
    node.addEventListener('click', () => {
      onClick()
      render()
    })
    return node
  }

  function render(): void {
    body.replaceChildren()
    search.style.display = tab === 'avatars' ? 'none' : ''

    if (tab === 'garments') {
      for (const c of GARMENT_CATEGORIES) {
        const items = garmentsByCategory(c.id).filter((d) => match(d.name))
        if (!items.length) continue
        body.append(cat(c.label))
        const g = grid()
        for (const def of items) {
          g.append(
            item(def.name, def.id === a.currentGarment(), (n) => {
              n.innerHTML = `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL[def.icon ?? 'top']}"/></svg>`
            }, () => a.selectGarment(def.id))
          )
        }
        body.append(g)
      }
    } else if (tab === 'fabrics') {
      for (const fam of FABRIC_FAMILIES) {
        const items = FABRIC_LIBRARY.filter((f) => f.family === fam.id && match(f.name))
        if (!items.length) continue
        body.append(cat(fam.label))
        const g = grid()
        for (const f of items) {
          g.append(
            item(f.name, f.id === a.currentFabric(), (n) => n.append(fabricSwatchCanvas(f)), () =>
              a.selectFabric(f.id)
            )
          )
        }
        body.append(g)
      }
    } else if (tab === 'avatars') {
      const g = grid()
      const figs: [BodyType, string][] = [
        ['female', 'Female'],
        ['male', 'Male']
      ]
      for (const [t, label] of figs) {
        g.append(
          item(label, t === a.currentBodyType(), (n) => {
            n.innerHTML = `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL.top}"/></svg>`
          }, () => a.setFigure(t))
        )
      }
      body.append(g)
    } else {
      const g = grid()
      for (const p of PRESETS.filter((p) => match(p.name))) {
        g.append(
          item(p.name, false, (n) => {
            const chip = el('canvas')
            chip.width = 120
            chip.height = 40
            const ctx = chip.getContext('2d')!
            ctx.fillStyle = hex(p.config.color ?? 0x808080)
            ctx.fillRect(0, 0, 120, 40)
            chip.style.cssText = 'width:100%;height:40px;border-radius:6px;display:block'
            n.append(chip)
          }, () => a.applyPreset(p))
        )
      }
      body.append(g)
    }

    if (!body.children.length) body.append(el('div', 'dio-lib-empty', 'No matches'))
  }

  render()
  return { refresh: render }
}
