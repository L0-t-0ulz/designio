/** Persisted studio-shell layout (pure serialize/parse — no DOM, so it's testable). */
/** How tightly the docked panels pack their controls. */
export type PanelDensity = 'comfortable' | 'compact'

export const PANEL_DENSITIES: PanelDensity[] = ['comfortable', 'compact']

/** Studio colour scheme. */
export type Theme = 'dark' | 'light'

export const THEMES: Theme[] = ['dark', 'light']

export interface ShellLayout {
  /** [left %, centre %, right %] weights (normalised to the visible columns at build). */
  sizes: [number, number, number]
  /** Left Library column visible. */
  leftVisible: boolean
  /** Right dock visible. */
  rightVisible: boolean
  /** Control spacing in the docked panels — 'compact' fits more on a short screen. */
  density: PanelDensity
  /** Colour scheme. */
  theme: Theme
}

export const DEFAULT_LAYOUT: ShellLayout = { sizes: [18, 56, 26], leftVisible: true, rightVisible: true, density: 'comfortable', theme: 'dark' }

const LS_KEY = 'dio-shell-v2'

const isDensity = (d: unknown): d is PanelDensity => PANEL_DENSITIES.includes(d as PanelDensity)
const isTheme = (t: unknown): t is Theme => THEMES.includes(t as Theme)

const validSizes = (s: unknown): s is [number, number, number] =>
  Array.isArray(s) && s.length === 3 && s.every((n) => typeof n === 'number' && n > 0 && n < 100)

/** Parse persisted JSON (or null) into a valid layout, falling back to defaults. */
export function parseLayout(raw: string | null): ShellLayout {
  if (!raw) return clone(DEFAULT_LAYOUT)
  try {
    const o = JSON.parse(raw) as Partial<ShellLayout>
    return {
      sizes: validSizes(o.sizes) ? [o.sizes[0], o.sizes[1], o.sizes[2]] : [...DEFAULT_LAYOUT.sizes],
      leftVisible: o.leftVisible !== false,
      rightVisible: o.rightVisible !== false,
      // a layout saved before density existed, or with a junk value, gets the default
      density: isDensity(o.density) ? o.density : DEFAULT_LAYOUT.density,
      theme: isTheme(o.theme) ? o.theme : DEFAULT_LAYOUT.theme
    }
  } catch {
    return clone(DEFAULT_LAYOUT)
  }
}

export function serializeLayout(l: ShellLayout): string {
  return JSON.stringify(l)
}

function clone(l: ShellLayout): ShellLayout {
  return { sizes: [...l.sizes], leftVisible: l.leftVisible, rightVisible: l.rightVisible, density: l.density, theme: l.theme }
}

/** Read/write the layout from localStorage (browser only). */
export function loadLayout(): ShellLayout {
  try {
    return parseLayout(localStorage.getItem(LS_KEY))
  } catch {
    return clone(DEFAULT_LAYOUT)
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
