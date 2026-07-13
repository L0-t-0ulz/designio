/**
 * The **camera bookmarks** panel — recall or delete a saved view, or save the current
 * one. Reuses the shortcuts-overlay modal styling. Esc / click-outside closes.
 */
export interface BookmarkItem {
  id: string
  name: string
}
export interface CameraBookmarksOpts {
  items: BookmarkItem[]
  onSaveCurrent: () => void
  onRecall: (id: string) => void
  onDelete: (id: string) => void
  /** Built-in anatomy framings (face · bust · waist · hem · back) — recalled by name. */
  anatomy?: { name: string; go: () => void }[]
}

let overlay: HTMLElement | null = null

export function closeCameraBookmarks(): void {
  overlay?.remove()
  overlay = null
}
export function cameraBookmarksOpen(): boolean {
  return overlay !== null
}

export function openCameraBookmarks(opts: CameraBookmarksOpts): void {
  closeCameraBookmarks()
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Camera bookmarks')

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  const h = document.createElement('h2')
  h.textContent = 'Camera bookmarks'
  card.appendChild(h)

  const save = document.createElement('button')
  save.className = 'dio-btn primary'
  save.textContent = 'Save current view'
  save.addEventListener('click', () => {
    opts.onSaveCurrent()
    closeCameraBookmarks()
  })
  card.appendChild(save)

  // Anatomy framings — one-click shots computed from the live measurements.
  if (opts.anatomy?.length) {
    const row = document.createElement('div')
    row.className = 'dio-actions'
    row.style.flexWrap = 'wrap'
    for (const shot of opts.anatomy) {
      const b = document.createElement('button')
      b.className = 'dio-btn'
      b.textContent = shot.name
      b.style.flex = '1 1 30%'
      b.addEventListener('click', () => {
        shot.go()
        closeCameraBookmarks()
      })
      row.appendChild(b)
    }
    card.appendChild(row)
  }

  if (opts.items.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'dio-shortcuts-hint'
    empty.textContent = 'No saved views yet.'
    card.appendChild(empty)
  } else {
    const list = document.createElement('ul')
    list.className = 'dio-history-list'
    for (const it of opts.items) {
      const li = document.createElement('li')
      const name = document.createElement('span')
      name.textContent = it.name
      const recall = document.createElement('button')
      recall.className = 'dio-btn'
      recall.textContent = 'Go to'
      recall.addEventListener('click', () => {
        opts.onRecall(it.id)
        closeCameraBookmarks()
      })
      const del = document.createElement('button')
      del.className = 'dio-btn'
      del.textContent = 'Delete'
      del.addEventListener('click', () => {
        opts.onDelete(it.id)
        li.remove()
      })
      li.append(name, recall, del)
      list.appendChild(li)
    }
    card.appendChild(list)
  }

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = 'Esc or click outside to close'
  card.appendChild(hint)

  overlay.appendChild(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeCameraBookmarks()
  })
  document.body.appendChild(overlay)
}
