/**
 * Autosave + crash recovery — periodically snapshot the working project (the
 * serialized `.dio` doc) into its own localStorage slot, so a crash / accidental
 * close doesn't lose unsaved work. On the next fresh launch the app offers to
 * recover it. The parse / age / should-offer logic is pure so it's unit-tested;
 * the localStorage calls are a thin wrapper.
 */
export interface AutosaveSnapshot {
  /** The serialized `ProjectDoc` (as from `serializeDoc`). */
  doc: string
  /** Epoch ms it was captured. */
  savedAt: number
  name: string
}

const KEY = 'dio-autosave-v1'

export function serializeSnapshot(s: AutosaveSnapshot): string {
  return JSON.stringify(s)
}

export function parseSnapshot(raw: string | null): AutosaveSnapshot | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Partial<AutosaveSnapshot>
    if (o && typeof o.doc === 'string' && o.doc.length > 0 && typeof o.savedAt === 'number') {
      return { doc: o.doc, savedAt: o.savedAt, name: typeof o.name === 'string' ? o.name : 'Untitled' }
    }
  } catch {
    /* corrupt slot → no snapshot */
  }
  return null
}

/** Offer recovery only for a real, recent snapshot (default window: 7 days). */
export function shouldOfferRestore(snap: AutosaveSnapshot | null, now: number, maxAgeMs = 7 * 24 * 3600 * 1000): boolean {
  return !!snap && now >= snap.savedAt && now - snap.savedAt <= maxAgeMs
}

/** A human "x ago" label for a snapshot's age (ms). */
export function describeAge(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

// ---- localStorage-backed API (best-effort; never throws) -------------------
export function writeAutosave(s: AutosaveSnapshot): void {
  try {
    globalThis.localStorage?.setItem(KEY, serializeSnapshot(s))
  } catch {
    /* quota / unavailable — autosave is best-effort */
  }
}

export function readAutosave(): AutosaveSnapshot | null {
  try {
    return parseSnapshot(globalThis.localStorage?.getItem(KEY) ?? null)
  } catch {
    return null
  }
}

export function clearAutosave(): void {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
