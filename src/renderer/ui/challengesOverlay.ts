import { CHALLENGES, searchChallenges } from './challenges'

/**
 * The **community challenges** modal — a searchable list of design briefs; each shows
 * its brief + constraints and a "Start this" button that seeds the suggested garment.
 * Reuses the shortcuts-overlay styling. Data lives in `./challenges` (pure, tested).
 * Open from Help → Community challenges or `?challenges=1`.
 */
let overlay: HTMLDivElement | null = null

export function challengesOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeChallenges()
}

export function closeChallenges(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

/** `onStart(garmentId)` is called when a challenge's "Start this" is clicked. */
export function openChallenges(onStart?: (garmentId: string) => void): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Community challenges')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeChallenges()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '640px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  h.textContent = 'Community challenges'
  card.appendChild(h)

  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = `Search ${CHALLENGES.length} challenges…`
  Object.assign(search.style, { width: '100%', padding: '8px 10px', margin: '0 0 10px', boxSizing: 'border-box' })
  card.appendChild(search)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  card.appendChild(list)

  const render = (): void => {
    list.textContent = ''
    const found = searchChallenges(search.value)
    if (!found.length) {
      const p = document.createElement('p')
      p.textContent = 'No matching challenges.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }
    for (const c of found) {
      const box = document.createElement('div')
      Object.assign(box.style, { padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.08)' })
      const t = document.createElement('div')
      t.textContent = `${c.title}  ·  ${c.theme}`
      Object.assign(t.style, { fontWeight: '700' })
      const brief = document.createElement('p')
      brief.textContent = c.brief
      Object.assign(brief.style, { opacity: '0.85', margin: '4px 0' })
      const ul = document.createElement('ul')
      Object.assign(ul.style, { margin: '4px 0', paddingLeft: '18px', fontSize: '13px', opacity: '0.8' })
      for (const con of c.constraints) {
        const li = document.createElement('li')
        li.textContent = con
        ul.appendChild(li)
      }
      const btn = document.createElement('button')
      btn.className = 'dio-btn'
      btn.textContent = `Start with a ${c.startGarment}`
      btn.addEventListener('click', () => {
        onStart?.(c.startGarment)
        closeChallenges()
      })
      box.append(t, brief, ul, btn)
      list.appendChild(box)
    }
  }
  search.addEventListener('input', render)
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  search.focus()
}
