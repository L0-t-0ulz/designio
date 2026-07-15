import { GLOSSARY, searchGlossary, glossaryByCategory } from './glossary'

/**
 * The **term-glossary** modal — a searchable, category-grouped reference. Reuses the
 * shortcuts-overlay backdrop/card styling (centred modal); the data + filtering live
 * in `./glossary` (pure, unit-tested). Open from Help → Term glossary or `?glossary=1`.
 */
let overlay: HTMLDivElement | null = null

export function glossaryOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeGlossary()
}

export function closeGlossary(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

export function openGlossary(): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Term glossary')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeGlossary()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  h.textContent = 'Term glossary'
  card.appendChild(h)

  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = `Search ${GLOSSARY.length} terms…`
  Object.assign(search.style, { width: '100%', padding: '8px 10px', margin: '0 0 10px', boxSizing: 'border-box' })
  card.appendChild(search)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  card.appendChild(list)

  const render = (): void => {
    list.textContent = ''
    const groups = glossaryByCategory(searchGlossary(search.value))
    if (!groups.length) {
      const p = document.createElement('p')
      p.textContent = 'No matching terms.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }
    for (const g of groups) {
      const hd = document.createElement('h3')
      hd.textContent = g.label
      Object.assign(hd.style, { margin: '12px 0 4px', fontSize: '12px', opacity: '0.65', textTransform: 'uppercase', letterSpacing: '0.05em' })
      list.appendChild(hd)
      const dl = document.createElement('dl')
      dl.style.margin = '0'
      for (const e of g.entries) {
        const dt = document.createElement('dt')
        dt.textContent = e.term
        Object.assign(dt.style, { fontWeight: '700', marginTop: '6px' })
        const dd = document.createElement('dd')
        dd.textContent = e.def
        Object.assign(dd.style, { margin: '2px 0 0', opacity: '0.85', fontSize: '13px', lineHeight: '1.4' })
        dl.appendChild(dt)
        dl.appendChild(dd)
      }
      list.appendChild(dl)
    }
  }
  search.addEventListener('input', render)
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  search.focus()
}
