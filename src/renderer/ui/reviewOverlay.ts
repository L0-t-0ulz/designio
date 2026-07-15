import { ReviewStore } from '../studio/reviewPins'

/**
 * The **design review** modal — a comments panel over the design: add a comment,
 * mark each open/resolved, and watch the open count fall to zero. Reuses the
 * shortcuts-overlay styling. The pin data + status live in `studio/reviewPins`
 * (pure, tested). Open from View → Design review… or `?review=1`.
 */
let overlay: HTMLDivElement | null = null

export function reviewModalOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeReview()
}

export function closeReview(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

export function openReview(store: ReviewStore): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Design review')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeReview()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '560px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  card.appendChild(h)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1', margin: '4px 0 12px' })
  card.appendChild(list)

  // add-comment form
  const form = document.createElement('div')
  Object.assign(form.style, { display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '10px' })
  const text = document.createElement('textarea')
  text.placeholder = 'Add a review comment…'
  Object.assign(text.style, { width: '100%', minHeight: '46px', padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical' })
  const bottom = document.createElement('div')
  Object.assign(bottom.style, { display: 'flex', gap: '8px', alignItems: 'center' })
  const author = document.createElement('input')
  author.type = 'text'
  author.placeholder = 'Your name'
  author.value = 'You'
  Object.assign(author.style, { flex: '1', padding: '7px 10px', boxSizing: 'border-box' })
  const addBtn = document.createElement('button')
  addBtn.className = 'dio-btn'
  addBtn.textContent = 'Add comment'
  const submit = (): void => {
    if (!text.value.trim()) return
    store.add(text.value, author.value)
    text.value = ''
    render()
    text.focus()
  }
  addBtn.addEventListener('click', submit)
  text.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit()
  })
  bottom.append(author, addBtn)
  form.append(text, bottom)
  card.appendChild(form)

  const render = (): void => {
    const open = store.openCount
    h.textContent = store.isEmpty ? 'Design review' : `Design review — ${open} open`
    list.textContent = ''
    if (store.isEmpty) {
      const p = document.createElement('p')
      p.textContent = 'No comments yet. Add the first review note below.'
      p.style.opacity = '0.6'
      list.appendChild(p)
      return
    }
    for (const pin of store.list()) {
      const row = document.createElement('div')
      const resolved = pin.status === 'resolved'
      Object.assign(row.style, { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,.08)', opacity: resolved ? '0.55' : '1' })
      const dot = document.createElement('span')
      Object.assign(dot.style, { width: '10px', height: '10px', borderRadius: '50%', flex: '0 0 auto', marginTop: '5px', background: resolved ? '#4caf50' : '#e0a83e' })
      const body = document.createElement('div')
      Object.assign(body.style, { flex: '1' })
      const t = document.createElement('div')
      t.textContent = pin.text
      if (resolved) t.style.textDecoration = 'line-through'
      const meta = document.createElement('div')
      meta.textContent = `${pin.author}${pin.point ? ' · pinned' : ''}`
      Object.assign(meta.style, { fontSize: '11px', opacity: '0.6', marginTop: '2px' })
      body.append(t, meta)
      const toggle = document.createElement('button')
      toggle.className = 'dio-btn'
      toggle.textContent = resolved ? 'Reopen' : 'Resolve'
      toggle.addEventListener('click', () => {
        if (resolved) store.reopen(pin.id)
        else store.resolve(pin.id)
        render()
      })
      const del = document.createElement('button')
      del.className = 'dio-btn'
      del.textContent = '✕'
      del.title = 'Delete comment'
      del.addEventListener('click', () => {
        store.remove(pin.id)
        render()
      })
      row.append(dot, body, toggle, del)
      list.appendChild(row)
    }
  }
  render()

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  text.focus()
}
