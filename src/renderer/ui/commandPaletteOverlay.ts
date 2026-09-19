import type { BodyType } from '../avatar/Mannequin'
import { FABRIC_LIBRARY } from '../fabric/FabricLibrary'
import { GARMENTS } from '../garments/registry'
import { PRESETS, type Preset } from '../start/presets'
import { TEMPLATES, type DesignTemplate } from './templates'
import { PALETTE_LIMIT, paletteByKind, searchPalette, stepSelection, type PaletteItem } from './commandPalette'

/**
 * The **command-palette** modal — type a name, get everything in the studio that
 * matches, across all the pickers at once; ↑/↓ to walk it, Enter to apply, Esc to
 * leave. Reuses the shortcuts-overlay backdrop/card styling.
 *
 * Ranking and grouping live in `./commandPalette` (pure, unit-tested); this file
 * builds the items from the real registries and wires the keyboard.
 */
export interface PaletteActions {
  selectGarment: (id: string) => void
  selectFabric: (id: string) => void
  setFigure: (t: BodyType) => void
  applyPreset: (p: Preset) => void
  applyTemplate: (t: DesignTemplate) => void
}

let overlay: HTMLDivElement | null = null

export function commandPaletteOpen(): boolean {
  return overlay !== null
}

export function closeCommandPalette(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
}

/** Everything the palette can reach, built fresh each open so a newly registered
 *  fabric or template is findable without a reload. */
function buildItems(a: PaletteActions): PaletteItem[] {
  const items: PaletteItem[] = []
  for (const g of GARMENTS) {
    items.push({ kind: 'garment', id: g.id, name: g.name, hint: g.category, run: () => a.selectGarment(g.id) })
  }
  for (const f of FABRIC_LIBRARY) {
    items.push({ kind: 'fabric', id: f.id, name: f.name, hint: f.family, run: () => a.selectFabric(f.id) })
  }
  for (const t of ['female', 'male'] as BodyType[]) {
    items.push({ kind: 'avatar', id: t, name: t === 'female' ? 'Female figure' : 'Male figure', hint: 'body type', run: () => a.setFigure(t) })
  }
  for (const p of PRESETS) {
    items.push({ kind: 'preset', id: p.id, name: p.name, hint: 'preset look', run: () => a.applyPreset(p) })
  }
  for (const t of TEMPLATES) {
    items.push({ kind: 'template', id: t.id, name: t.name, hint: 'template', run: () => a.applyTemplate(t) })
  }
  return items
}

export function openCommandPalette(a: PaletteActions): void {
  if (overlay) return
  const all = buildItems(a)

  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Find anything')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCommandPalette()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '560px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' })

  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Find a garment, fabric, preset…'
  search.setAttribute('aria-label', 'Find anything')
  Object.assign(search.style, { width: '100%', padding: '10px 12px', margin: '0 0 8px', boxSizing: 'border-box', fontSize: '15px' })
  card.appendChild(search)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  list.setAttribute('role', 'listbox')
  card.appendChild(list)

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = '↑↓ to move · Enter to apply · Esc to close'
  card.appendChild(hint)

  // `results` is the flat, ranked list the selection indexes into; the rendered rows
  // are grouped, so each row records its position in that flat list.
  let results: PaletteItem[] = []
  let selected = 0
  const rows: HTMLElement[] = []

  const paint = (): void => {
    for (let i = 0; i < rows.length; i++) {
      const on = i === selected
      rows[i].setAttribute('aria-selected', String(on))
      rows[i].style.background = on ? 'var(--dio-accent, #4f8cff)' : 'transparent'
      rows[i].style.color = on ? '#fff' : 'inherit'
      if (on) rows[i].scrollIntoView({ block: 'nearest' })
    }
  }

  const apply = (): void => {
    const item = results[selected]
    if (!item) return
    closeCommandPalette()
    item.run()
  }

  const render = (): void => {
    results = searchPalette(search.value, all, PALETTE_LIMIT)
    selected = results.length ? 0 : -1
    list.textContent = ''
    rows.length = 0

    if (!results.length) {
      const p = document.createElement('p')
      p.textContent = 'Nothing matches.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }

    for (const group of paletteByKind(results)) {
      const hd = document.createElement('h3')
      hd.textContent = group.label
      Object.assign(hd.style, { margin: '10px 0 2px', fontSize: '11px', opacity: '0.6', textTransform: 'uppercase', letterSpacing: '0.06em' })
      list.appendChild(hd)
      for (const item of group.items) {
        const at = results.indexOf(item)
        const row = document.createElement('div')
        row.setAttribute('role', 'option')
        Object.assign(row.style, { display: 'flex', alignItems: 'baseline', gap: '8px', padding: '5px 8px', borderRadius: '5px', cursor: 'pointer' })
        const nm = document.createElement('span')
        nm.textContent = item.name
        row.appendChild(nm)
        if (item.hint) {
          const hn = document.createElement('span')
          hn.textContent = item.hint
          Object.assign(hn.style, { marginLeft: 'auto', fontSize: '11px', opacity: '0.6' })
          row.appendChild(hn)
        }
        row.addEventListener('mouseenter', () => {
          selected = at
          paint()
        })
        row.addEventListener('click', apply)
        list.appendChild(row)
        rows[at] = row
      }
    }
    paint()
  }

  // Bound to the card, not the document: the studio's own shortcut dispatcher already
  // ignores events from inputs, so the palette's keys cannot leak into the scene.
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return closeCommandPalette()
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault()
      selected = stepSelection(selected, 1, results.length)
      return paint()
    }
    if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault()
      selected = stepSelection(selected, -1, results.length)
      return paint()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      apply()
    }
  })

  search.addEventListener('input', render)
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  search.focus()
}
