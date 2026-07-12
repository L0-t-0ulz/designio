/**
 * The keyboard-shortcuts overlay (press **?**, Esc/click to close) — now also the
 * **shortcut editor**: click any key chip, press a new combo, and the action is
 * rebound (persisted via `ui/keymap`). Conflicting combos are rejected with a hint;
 * "Reset to defaults" restores the stock map. Fixed keys (?, Esc) aren't editable.
 */
import { KEY_ACTIONS, captureBinding, formatBinding, keymap, matchBinding, rebind, resetKeymap, type KeyAction } from './keymap'

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

const isMac = navigator.platform.toLowerCase().includes('mac')

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

  const chips = new Map<KeyAction, HTMLButtonElement>()
  const syncChips = (): void => {
    for (const def of KEY_ACTIONS) {
      const chip = chips.get(def.id)!
      chip.textContent = formatBinding(keymap()[def.id], isMac)
      chip.classList.remove('recording')
    }
  }

  for (const def of KEY_ACTIONS) {
    const dt = document.createElement('dt')
    const chip = document.createElement('button')
    chip.type = 'button'
    chip.className = 'dio-shortcut-chip'
    chip.title = 'Click, then press a new key combo (Esc cancels)'
    chips.set(def.id, chip)
    dt.appendChild(chip)
    const dd = document.createElement('dd')
    dd.textContent = def.label
    list.append(dt, dd)

    chip.addEventListener('click', () => {
      syncChips() // cancel any other in-progress recording
      chip.textContent = 'Press keys…'
      chip.classList.add('recording')
      const onCapture = (e: KeyboardEvent): void => {
        e.preventDefault()
        e.stopPropagation()
        const like = { key: e.key, mod: e.metaKey || e.ctrlKey, shift: e.shiftKey }
        if (e.key === 'Escape') {
          done()
          return
        }
        const b = captureBinding(like)
        if (!b) return // a bare modifier — keep listening for the full combo
        const clash = KEY_ACTIONS.find((d) => d.id !== def.id && matchBinding({ key: b.key, mod: b.mod, shift: !!b.shift }, keymap()[d.id]))
        if (clash) {
          chip.textContent = `Used by ${clash.label}`
          setTimeout(syncChips, 1200)
          cleanup()
          return
        }
        rebind(def.id, b)
        done()
      }
      const cleanup = (): void => document.removeEventListener('keydown', onCapture, true)
      const done = (): void => {
        cleanup()
        syncChips()
      }
      document.addEventListener('keydown', onCapture, true)
    })
  }

  // fixed (non-editable) keys
  for (const [key, desc] of [
    ['?', 'Show / hide this help'],
    ['Esc', 'Close overlays']
  ]) {
    const dt = document.createElement('dt')
    dt.textContent = key
    const dd = document.createElement('dd')
    dd.textContent = desc
    list.append(dt, dd)
  }

  card.appendChild(list)
  syncChips()

  const hint = document.createElement('p')
  hint.className = 'dio-shortcuts-hint'
  hint.textContent = 'Click a key to rebind it · Press ? or Esc to close'
  card.appendChild(hint)

  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'dio-shortcuts-reset'
  reset.textContent = 'Reset to defaults'
  reset.addEventListener('click', () => {
    resetKeymap()
    syncChips()
  })
  card.appendChild(reset)

  overlay.appendChild(card)
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) close()
  })
  document.body.appendChild(overlay)
}
