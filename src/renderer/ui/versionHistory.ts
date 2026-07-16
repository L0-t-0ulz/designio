/**
 * A dismissible **version-history** panel — lists a project's saved snapshots
 * (newest first) with Restore / Delete, plus a "Save current as a version" button.
 * Reuses the shortcuts-overlay modal styling. Esc / click-outside closes.
 */
export interface HistoryItem {
  id: string
  label: string
  at: number
}

export interface VersionHistoryOpts {
  items: HistoryItem[]
  onSaveVersion: () => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
  /** Diff a snapshot against the working design → human-readable change lines. */
  onCompare?: (id: string) => string[]
  /** Diff one snapshot against another (version-to-version) → change lines. */
  onCompareTwo?: (aId: string, bId: string) => string[]
}

let overlay: HTMLElement | null = null

export function closeVersionHistory(): void {
  overlay?.remove()
  overlay = null
}
export function versionHistoryOpen(): boolean {
  return overlay !== null
}

const ago = (at: number, now: number): string => {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return `${Math.round(h / 24)} d ago`
}

/** Open (replacing any existing) the version-history panel. `now` is injectable for tests. */
export function openVersionHistory(opts: VersionHistoryOpts, now = Date.now()): void {
  closeVersionHistory()
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Version history')

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  const h = document.createElement('h2')
  h.textContent = 'Version history'
  card.appendChild(h)

  const save = document.createElement('button')
  save.className = 'dio-btn primary'
  save.textContent = 'Save current as a version'
  save.addEventListener('click', () => {
    opts.onSaveVersion()
    closeVersionHistory()
  })
  card.appendChild(save)

  if (opts.items.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'dio-shortcuts-hint'
    empty.textContent = 'No saved versions yet.'
    card.appendChild(empty)
  } else {
    const list = document.createElement('ul')
    list.className = 'dio-history-list'
    for (const it of opts.items) {
      const li = document.createElement('li')
      const meta = document.createElement('span')
      meta.textContent = `${it.label} · ${ago(it.at, now)}`
      const restore = document.createElement('button')
      restore.className = 'dio-btn'
      restore.textContent = 'Restore'
      restore.addEventListener('click', () => {
        opts.onRestore(it.id)
        closeVersionHistory()
      })
      const del = document.createElement('button')
      del.className = 'dio-btn'
      del.textContent = 'Delete'
      del.addEventListener('click', () => {
        opts.onDelete(it.id)
        li.remove()
      })
      li.append(meta, restore, del)
      if (opts.onCompare || opts.onCompareTwo) {
        const cmp = document.createElement('button')
        cmp.className = 'dio-btn'
        cmp.textContent = 'Compare'
        // "Compare with" — the current design, or any OTHER saved version
        const against = document.createElement('select')
        against.className = 'dio-history-against'
        against.append(new Option('the current design', '__current__'))
        if (opts.onCompareTwo) for (const other of opts.items) if (other.id !== it.id) against.append(new Option(other.label, other.id))
        const diff = document.createElement('ul')
        diff.className = 'dio-history-diff'
        cmp.addEventListener('click', () => {
          if (diff.childElementCount) {
            diff.replaceChildren()
            return
          }
          const target = against.value
          const lines = target === '__current__' ? (opts.onCompare?.(it.id) ?? []) : (opts.onCompareTwo?.(it.id, target) ?? [])
          const empty = target === '__current__' ? 'No changes vs the current design' : 'No changes vs that version'
          for (const line of lines.length ? lines : [empty]) {
            const d = document.createElement('li')
            d.textContent = line
            diff.appendChild(d)
          }
        })
        // changing the comparison target clears a shown diff so it re-computes
        against.addEventListener('change', () => diff.replaceChildren())
        li.append(cmp, against)
        li.appendChild(diff)
      }
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
    if (e.target === overlay) closeVersionHistory()
  })
  document.body.appendChild(overlay)
}
