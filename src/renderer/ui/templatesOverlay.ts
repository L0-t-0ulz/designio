import { TEMPLATES, searchTemplates, type DesignTemplate } from './templates'

/**
 * The **template marketplace** modal — a searchable gallery of starter templates;
 * each shows a colour chip + name + category, and "Use this" applies it. Reuses the
 * shortcuts-overlay styling. Data + apply live in `./templates` (pure, tested).
 * Open from File → Templates or `?templates=1`.
 */
let overlay: HTMLDivElement | null = null

export function templatesModalOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeTemplates()
}

export function closeTemplates(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

/** `onUse(template)` fires when a template's "Use this" is clicked. */
export function openTemplates(onUse?: (t: DesignTemplate) => void): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Template marketplace')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTemplates()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  h.textContent = 'Templates'
  card.appendChild(h)

  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = `Search ${TEMPLATES.length} templates…`
  Object.assign(search.style, { width: '100%', padding: '8px 10px', margin: '0 0 10px', boxSizing: 'border-box' })
  card.appendChild(search)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  card.appendChild(list)

  const render = (): void => {
    list.textContent = ''
    const found = searchTemplates(search.value)
    if (!found.length) {
      const p = document.createElement('p')
      p.textContent = 'No matching templates.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }
    for (const t of found) {
      const row = document.createElement('div')
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.08)' })
      const chip = document.createElement('span')
      Object.assign(chip.style, { width: '26px', height: '26px', borderRadius: '6px', flex: '0 0 auto', background: '#' + (t.color >>> 0).toString(16).padStart(6, '0').slice(-6), outline: '1px solid rgba(0,0,0,.25)' })
      const label = document.createElement('span')
      label.textContent = `${t.name}  ·  ${t.category}`
      Object.assign(label.style, { flex: '1' })
      const btn = document.createElement('button')
      btn.className = 'dio-btn'
      btn.textContent = 'Use this'
      btn.addEventListener('click', () => {
        onUse?.(t)
        closeTemplates()
      })
      row.append(chip, label, btn)
      list.appendChild(row)
    }
  }
  search.addEventListener('input', render)
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  search.focus()
}
