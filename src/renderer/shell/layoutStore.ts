/** Persisted studio-shell layout (pure serialize/parse — no DOM, so it's testable). */
export interface ShellLayout {
  /** [centre %, right %] split sizes. */
  sizes: [number, number]
  /** Right dock visible. */
  rightVisible: boolean
}

export const DEFAULT_LAYOUT: ShellLayout = { sizes: [74, 26], rightVisible: true }

const LS_KEY = 'dio-shell-v1'

/** Parse persisted JSON (or null) into a valid layout, falling back to defaults. */
export function parseLayout(raw: string | null): ShellLayout {
  if (!raw) return { ...DEFAULT_LAYOUT }
  try {
    const o = JSON.parse(raw) as Partial<ShellLayout>
    const sizes =
      Array.isArray(o.sizes) &&
      o.sizes.length === 2 &&
      o.sizes.every((n) => typeof n === 'number' && n > 0 && n < 100)
        ? ([o.sizes[0], o.sizes[1]] as [number, number])
        : ([...DEFAULT_LAYOUT.sizes] as [number, number])
    return { sizes, rightVisible: o.rightVisible !== false }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

export function serializeLayout(l: ShellLayout): string {
  return JSON.stringify(l)
}

/** Read/write the layout from localStorage (browser only). */
export function loadLayout(): ShellLayout {
  try {
    return parseLayout(localStorage.getItem(LS_KEY))
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}
export function saveLayout(l: ShellLayout): void {
  try {
    localStorage.setItem(LS_KEY, serializeLayout(l))
  } catch {
    /* ignore (private mode / no storage) */
  }
}
export function clearLayout(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}
