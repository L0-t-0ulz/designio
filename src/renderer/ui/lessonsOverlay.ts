import { LESSONS, searchLessons } from './lessons'

/**
 * The **pattern-making lessons** modal — a searchable list of lessons; click one to
 * expand its goal + numbered steps. Reuses the shortcuts-overlay backdrop/card
 * styling. Data + filtering live in `./lessons` (pure, unit-tested). Open from
 * Help → Pattern-making lessons or `?lessons=1`.
 */
let overlay: HTMLDivElement | null = null

export function lessonsOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeLessons()
}

export function closeLessons(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

export function openLessons(): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Pattern-making lessons')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLessons()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  h.textContent = 'Pattern-making lessons'
  card.appendChild(h)

  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = `Search ${LESSONS.length} lessons…`
  Object.assign(search.style, { width: '100%', padding: '8px 10px', margin: '0 0 10px', boxSizing: 'border-box' })
  card.appendChild(search)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  card.appendChild(list)

  const render = (): void => {
    list.textContent = ''
    const found = searchLessons(search.value)
    if (!found.length) {
      const p = document.createElement('p')
      p.textContent = 'No matching lessons.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }
    for (const l of found) {
      const details = document.createElement('details')
      details.style.margin = '8px 0'
      const summary = document.createElement('summary')
      Object.assign(summary.style, { cursor: 'pointer', fontWeight: '700' })
      summary.textContent = `${l.title}  ·  ${l.level}`
      details.appendChild(summary)
      const goal = document.createElement('p')
      goal.textContent = l.goal
      Object.assign(goal.style, { opacity: '0.85', margin: '6px 0' })
      details.appendChild(goal)
      const ol = document.createElement('ol')
      Object.assign(ol.style, { margin: '0', paddingLeft: '20px', fontSize: '13px', lineHeight: '1.5' })
      for (const step of l.steps) {
        const li = document.createElement('li')
        li.textContent = step
        ol.appendChild(li)
      }
      details.appendChild(ol)
      list.appendChild(details)
    }
  }
  search.addEventListener('input', render)
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  search.focus()
}
