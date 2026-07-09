/**
 * A dismissible keyboard-shortcuts cheat-sheet (press **?**, Esc/click to close).
 * Self-mounting; `toggleShortcuts()` opens/closes it, `closeShortcuts()` force-closes.
 */
const SHORTCUTS: [string, string][] = [
  ['⌘ / Ctrl + Z', 'Undo'],
  ['⌘ / Ctrl + ⇧ + Z · ⌘/Ctrl + Y', 'Redo'],
  ['⌘ / Ctrl + C', 'Copy garment'],
  ['⌘ / Ctrl + X', 'Cut garment'],
  ['⌘ / Ctrl + V', 'Paste garment'],
  ['⌘ / Ctrl + D', 'Duplicate garment'],
  ['⌘ / Ctrl + S', 'Save project'],
  ['⌘ / Ctrl + O', 'Open project'],
  ['Backspace / Delete', 'Delete garment'],
  ['?', 'Show / hide this help']
]

let overlay: HTMLElement | null = null

function close(): void {
  overlay?.remove()
  overlay = null
}

/** True while the overlay is open. */
export function shortcutsOpen(): boolean {
  return overlay !== null
}

/** Force-close the overlay (e.g. on Esc). */
export function closeShortcuts(): void {
  close()
}

/** Open the overlay, or close it if already open. */
export function toggleShortcuts(): void {
  if (overlay) {
    close()
    return
  }
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Keyboard shortcuts')

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  const h = document.createElement('h2')
  h.textContent = 'Keyboard shortcuts'
  card.appendChild(h)

  const list = document.createElement('dl')
  list.className = 'dio-shortcuts-list'
  for (const [key, desc] of SHORTCUTS) {
    const dt = document.createElement('dt')
    dt.textContent = key
    const dd = document.createElement('dd')
    dd.textContent = desc
    list.append(dt, dd)
  }
  card.appendChild(list)

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = 'Press ? or Esc to close'
  card.appendChild(hint)

  overlay.appendChild(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close()
  })
  document.body.appendChild(overlay)
}
