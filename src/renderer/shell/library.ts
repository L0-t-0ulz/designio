import { el } from '../ui/controls'
import type { BodyType } from '../avatar/Mannequin'
import { GARMENT_CATEGORIES, garmentsByCategory } from '../garments/registry'
import { FABRIC_FAMILIES, FABRIC_LIBRARY } from '../fabric/FabricLibrary'
import { GARMENT_SIL, fabricSwatchCanvas } from '../ui/thumbnails'
import { PRESETS, type Preset } from '../start/presets'
import { matchesFabric, type FabricFilter, type WeightBucket, type StretchBucket } from './libraryFilter'
import { loadFavourites, pruneFavourites, saveFavourites, toggleFavourite } from '../fabric/favourites'
import { loadRecentFabrics, pruneRecentFabrics } from '../fabric/recentFabrics'

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
  const filterBar = el('div', 'dio-lib-filters')
  const body = el('div', 'dio-lib-body')
  root.append(tabsRow, search, filterBar, body)
  host.append(root)

  let tab: Tab = 'garments'
  let query = ''
  // Structured fabric filters (family / weight / stretch), driven by the chip bar.
  // Starred fabrics, pruned against the live catalogue so a retired fabric can't
  // leave a star pointing at nothing.
  let favourites = pruneFavourites(loadFavourites(), FABRIC_LIBRARY.map((f) => f.id))
  let famFilter = 'all'
  let weightFilter: WeightBucket = 'any'
  let stretchFilter: StretchBucket = 'any'
  const fabricFilter = (): FabricFilter => ({ query, family: famFilter, weight: weightFilter, stretch: stretchFilter })

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

  // A row of exclusive filter chips: picks a value into `set`, then re-renders.
  function chipRow<T>(choices: [string, T][], get: () => T, set: (v: T) => void): HTMLElement {
    const row = el('div', 'dio-lib-chips')
    for (const [label, val] of choices) {
      const b = el('button', 'dio-lib-chip' + (get() === val ? ' on' : ''), label)
      b.addEventListener('click', () => {
        set(val)
        render()
      })
      row.append(b)
    }
    return row
  }
  function buildFilterBar(): void {
    filterBar.replaceChildren()
    if (tab !== 'fabrics') return
    filterBar.append(
      chipRow<string>([['All', 'all'], ...FABRIC_FAMILIES.map((f) => [f.label, f.id] as [string, string])], () => famFilter, (v) => (famFilter = v)),
      chipRow<WeightBucket>([['Any wt', 'any'], ['Light', 'light'], ['Medium', 'medium'], ['Heavy', 'heavy']], () => weightFilter, (v) => (weightFilter = v)),
      chipRow<StretchBucket>([['Any', 'any'], ['Rigid', 'rigid'], ['Stretch', 'stretch']], () => stretchFilter, (v) => (stretchFilter = v))
    )
  }
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

  /** The star pip on a fabric tile. Toggling must not also select the fabric, hence
   *  the stopPropagation — the tile behind it is the selector. */
  const starFor = (id: string): HTMLElement => {
    const on = favourites.includes(id)
    const b = el('button', 'dio-lib-star' + (on ? ' on' : ''), on ? '\u2605' : '\u2606')
    b.type = 'button'
    b.title = on ? 'Remove from favourites' : 'Add to favourites'
    b.setAttribute('aria-pressed', String(on))
    b.setAttribute('aria-label', b.title)
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      const next = toggleFavourite(favourites, id)
      if (next === favourites) return // at the cap — say nothing rather than half-act
      favourites = next
      saveFavourites(favourites)
      render()
    })
    return b
  }

  /** One fabric tile, starrable. */
  const fabricItem = (f: (typeof FABRIC_LIBRARY)[number]): HTMLElement => {
    const node = item(f.name, f.id === a.currentFabric(), (n) => n.append(fabricSwatchCanvas(f)), () => a.selectFabric(f.id))
    node.append(starFor(f.id))
    return node
  }

  function render(): void {
    body.replaceChildren()
    search.style.display = tab === 'avatars' ? 'none' : ''
    buildFilterBar()

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
      const flt = fabricFilter()
      // Starred fabrics first, in the order they were starred — the point of the
      // feature is not scrolling to them. They still appear under their family below,
      // so the catalogue stays complete rather than having holes punched in it.
      // Recents first, then favourites: what you just used is the likeliest next
      // pick, and it is read fresh on every render so a fabric applied from the
      // command palette or a colourway shows up here too.
      const known = FABRIC_LIBRARY.map((f) => f.id)
      const recents = pruneRecentFabrics(loadRecentFabrics(), known)
        .map((id) => FABRIC_LIBRARY.find((f) => f.id === id))
        .filter((f): f is (typeof FABRIC_LIBRARY)[number] => !!f && matchesFabric(f, flt))
      if (recents.length) {
        body.append(cat('\u21ba Recent'))
        const g = grid()
        for (const f of recents) g.append(fabricItem(f))
        body.append(g)
      }
      const faves = favourites
        .map((id) => FABRIC_LIBRARY.find((f) => f.id === id))
        .filter((f): f is (typeof FABRIC_LIBRARY)[number] => !!f && matchesFabric(f, flt))
      if (faves.length) {
        body.append(cat('\u2605 Favourites'))
        const g = grid()
        for (const f of faves) g.append(fabricItem(f))
        body.append(g)
      }
      for (const fam of FABRIC_FAMILIES) {
        const items = FABRIC_LIBRARY.filter((f) => f.family === fam.id && matchesFabric(f, flt))
        if (!items.length) continue
        body.append(cat(fam.label))
        const g = grid()
        for (const f of items) {
          g.append(
            fabricItem(f)
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
