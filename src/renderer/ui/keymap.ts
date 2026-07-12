/**
 * **Rebindable keyboard shortcuts** — the studio's keymap as data. Every editing
 * shortcut (undo · redo · copy · cut · paste · duplicate · save · open · delete) is a
 * `Binding` the user can rebind from the shortcuts overlay (press `?`, click a key,
 * press the new combo). Persisted in localStorage; unknown/invalid saved data falls
 * back per-action to the defaults. The pure helpers (match / capture / format /
 * parse / conflicts) are unit-tested; only load/save touch the DOM's storage.
 */

export type KeyAction = 'undo' | 'redo' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'save' | 'open' | 'delete'

/** One shortcut: a normalized `key` (lowercase; backspace ⇒ 'delete') + modifiers.
 *  `mod` = ⌘ on mac / Ctrl elsewhere. */
export interface Binding {
  key: string
  mod: boolean
  shift?: boolean
}

export interface KeyActionDef {
  id: KeyAction
  label: string
  /** Call `preventDefault()` when it fires (stops the browser's own ⌘S/⌘D/⌘Z…). */
  prevent: boolean
}

/** The rebindable actions, in overlay display order. */
export const KEY_ACTIONS: KeyActionDef[] = [
  { id: 'undo', label: 'Undo', prevent: true },
  { id: 'redo', label: 'Redo', prevent: true },
  { id: 'copy', label: 'Copy garment', prevent: false },
  { id: 'cut', label: 'Cut garment', prevent: false },
  { id: 'paste', label: 'Paste garment', prevent: false },
  { id: 'duplicate', label: 'Duplicate garment', prevent: true },
  { id: 'save', label: 'Save project', prevent: true },
  { id: 'open', label: 'Open project', prevent: true },
  { id: 'delete', label: 'Delete garment', prevent: false }
]

export type Keymap = Record<KeyAction, Binding>

export const DEFAULT_KEYMAP: Keymap = {
  undo: { key: 'z', mod: true },
  redo: { key: 'z', mod: true, shift: true },
  copy: { key: 'c', mod: true },
  cut: { key: 'x', mod: true },
  paste: { key: 'v', mod: true },
  duplicate: { key: 'd', mod: true },
  save: { key: 's', mod: true },
  open: { key: 'o', mod: true },
  delete: { key: 'delete', mod: false }
}

/** Normalize an event key for binding/matching: lowercase, backspace ⇒ delete, ' ' ⇒ space. */
export function normalizeKey(key: string): string {
  const k = key.toLowerCase()
  return k === 'backspace' ? 'delete' : k === ' ' ? 'space' : k
}

/** The shape of a key event the pure helpers need (a `KeyboardEvent` satisfies it). */
export interface KeyLike {
  key: string
  mod: boolean
  shift: boolean
}

export function matchBinding(e: KeyLike, b: Binding): boolean {
  return normalizeKey(e.key) === b.key && e.mod === b.mod && e.shift === !!b.shift
}

/** The action a key event triggers under this keymap (null = none). */
export function actionFor(map: Keymap, e: KeyLike): KeyAction | null {
  for (const def of KEY_ACTIONS) if (matchBinding(e, map[def.id])) return def.id
  // legacy alias: ⌘/Ctrl+Y redoes unless the user bound Y to something else
  if (normalizeKey(e.key) === 'y' && e.mod && !e.shift) return 'redo'
  return null
}

/** Turn a pressed combo into a Binding — null if it can't be a shortcut
 *  (a bare modifier, Escape, or the reserved `?` help key). */
export function captureBinding(e: KeyLike): Binding | null {
  const k = normalizeKey(e.key)
  if (['shift', 'meta', 'control', 'alt', 'escape', '?'].includes(k)) return null
  // a bare letter/digit with no modifier would fire while nothing is focused — require
  // mod for single characters; named keys (delete, f1, arrowup, space…) may stand alone
  if (k.length === 1 && !e.mod) return null
  return { key: k, mod: e.mod, ...(e.shift ? { shift: true } : {}) }
}

/** Human-readable combo — '⌘⇧Z' on mac, 'Ctrl+Shift+Z' elsewhere. */
export function formatBinding(b: Binding, isMac: boolean): string {
  const name = b.key === 'delete' ? (isMac ? '⌫' : 'Del') : b.key.length === 1 ? b.key.toUpperCase() : b.key[0].toUpperCase() + b.key.slice(1)
  if (isMac) return `${b.mod ? '⌘' : ''}${b.shift ? '⇧' : ''}${name}`
  const parts = [...(b.mod ? ['Ctrl'] : []), ...(b.shift ? ['Shift'] : []), name]
  return parts.join('+')
}

/** Actions whose binding collides with another's (both sides reported). */
export function conflictsIn(map: Keymap): KeyAction[] {
  const seen = new Map<string, KeyAction>()
  const bad = new Set<KeyAction>()
  for (const def of KEY_ACTIONS) {
    const b = map[def.id]
    const sig = `${b.key}|${b.mod ? 1 : 0}|${b.shift ? 1 : 0}`
    const other = seen.get(sig)
    if (other) {
      bad.add(other)
      bad.add(def.id)
    } else seen.set(sig, def.id)
  }
  return [...bad]
}

/** Parse a saved keymap: per-action, a valid saved binding wins, else the default.
 *  Tolerates junk, unknown actions, and malformed bindings. */
export function parseKeymap(text: string | null): Keymap {
  const map: Keymap = { ...DEFAULT_KEYMAP }
  if (!text) return map
  try {
    const raw = JSON.parse(text) as Record<string, Partial<Binding>>
    if (!raw || typeof raw !== 'object') return map
    for (const def of KEY_ACTIONS) {
      const b = raw[def.id]
      if (b && typeof b.key === 'string' && b.key.length > 0 && typeof b.mod === 'boolean') {
        map[def.id] = { key: normalizeKey(b.key), mod: b.mod, ...(b.shift ? { shift: true } : {}) }
      }
    }
  } catch {
    /* corrupt JSON → defaults */
  }
  return map
}

export function serializeKeymap(map: Keymap): string {
  return JSON.stringify(map)
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-keymap'

export function loadKeymap(): Keymap {
  try {
    return parseKeymap(localStorage.getItem(STORE_KEY))
  } catch {
    return { ...DEFAULT_KEYMAP }
  }
}

export function saveKeymap(map: Keymap): void {
  try {
    localStorage.setItem(STORE_KEY, serializeKeymap(map))
  } catch {
    /* storage full/blocked — the session keeps the in-memory map */
  }
}

// ---- the live keymap (shared by the dispatcher in main.ts + the overlay editor) ----
let current: Keymap | null = null

/** The active keymap — loaded once, then edited in place by `rebind`/`resetKeymap`. */
export function keymap(): Keymap {
  return (current ??= loadKeymap())
}

/** Rebind one action (persists). Returns the action it now conflicts with, if any. */
export function rebind(action: KeyAction, b: Binding): KeyAction | null {
  const map = keymap()
  const clash = KEY_ACTIONS.find((d) => d.id !== action && matchBinding({ key: b.key, mod: b.mod, shift: !!b.shift }, map[d.id]))
  map[action] = b
  saveKeymap(map)
  return clash?.id ?? null
}

/** Back to the defaults (persists). */
export function resetKeymap(): void {
  current = { ...DEFAULT_KEYMAP }
  saveKeymap(current)
}
