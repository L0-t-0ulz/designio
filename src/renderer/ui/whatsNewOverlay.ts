import { RELEASE_NOTES, loadSeenRelease, markReleasesSeen, releasesSince, type ReleaseNote } from './whatsNew'

/**
 * The **what's-new** modal — the release feed, newest first, with the notes the user
 * has not seen yet called out. Reuses the shortcuts-overlay backdrop/card styling; the
 * feed and the seen/unseen logic live in `./whatsNew` (pure, unit-tested). Opens from
 * Help → What's new, `?whatsnew=1`, or once by itself after an update.
 *
 * Opening marks the feed read, so it announces each update exactly once.
 */
let overlay: HTMLDivElement | null = null

export function whatsNewOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeWhatsNew()
}

export function closeWhatsNew(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

function noteSection(note: ReleaseNote, isNew: boolean): HTMLElement {
  const sec = document.createElement('section')
  sec.style.margin = '14px 0 0'

  const head = document.createElement('div')
  Object.assign(head.style, { display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' })

  const h = document.createElement('h3')
  h.textContent = note.headline
  Object.assign(h.style, { margin: '0', fontSize: '14px' })
  head.appendChild(h)

  if (isNew) {
    const tag = document.createElement('span')
    tag.textContent = 'New'
    Object.assign(tag.style, {
      fontSize: '10px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '1px 6px',
      borderRadius: '999px',
      background: 'var(--dio-accent, #4f8cff)',
      color: '#fff'
    })
    head.appendChild(tag)
  }

  const date = document.createElement('span')
  date.textContent = note.date
  Object.assign(date.style, { marginLeft: 'auto', fontSize: '11px', opacity: '0.55', fontVariantNumeric: 'tabular-nums' })
  head.appendChild(date)

  sec.appendChild(head)

  const ul = document.createElement('ul')
  Object.assign(ul.style, { margin: '6px 0 0', paddingLeft: '18px', fontSize: '13px', lineHeight: '1.45', opacity: '0.85' })
  for (const change of note.changes) {
    const li = document.createElement('li')
    li.textContent = change
    li.style.margin = '2px 0'
    ul.appendChild(li)
  }
  sec.appendChild(ul)
  return sec
}

export function openWhatsNew(): void {
  if (overlay) return

  // which notes are new is decided before the visit is recorded, or nothing is ever new
  const unseen = new Set(releasesSince(loadSeenRelease()).map((n) => n.id))

  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', "What's new")
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWhatsNew()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '620px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' })

  const h = document.createElement('h2')
  h.textContent = "What's new"
  card.appendChild(h)

  const list = document.createElement('div')
  Object.assign(list.style, { overflowY: 'auto', flex: '1' })
  for (const note of RELEASE_NOTES) list.appendChild(noteSection(note, unseen.has(note.id)))
  card.appendChild(list)

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = 'Esc to close · Help → What’s new to read it again'
  card.appendChild(hint)

  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
  card.focus()

  markReleasesSeen()
}
