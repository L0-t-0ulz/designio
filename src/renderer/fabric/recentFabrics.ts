import { cleanRecent, pushRecent } from '../core/recentList'

/**
 * **Recent fabrics** — the last few fabrics applied, offered as a row at the top of
 * the Fabrics tab.
 *
 * This is the other half of the favourites feature and deliberately not the same
 * thing: favourites are a shortlist you curate and can rely on staying put, recents
 * are what you have been doing for the last ten minutes and reorder themselves. A
 * fabric you used once and will not use again belongs in one and not the other.
 */

/** One row's worth. */
export const MAX_RECENT_FABRICS = 8

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/** Record a fabric as just-used. Returns the same list when it was already first. */
export function pushRecentFabric(list: string[], id: string, max = MAX_RECENT_FABRICS): string[] {
  if (!isId(id)) return list
  return pushRecent(list, id, max)
}

/** Drop recents whose fabric no longer exists. */
export function pruneRecentFabrics(ids: string[], knownIds: readonly string[]): string[] {
  const known = new Set(knownIds)
  const kept = ids.filter((id) => known.has(id))
  return kept.length === ids.length ? ids : kept
}

/** Parse stored JSON — junk dropped, duplicates removed, capped. */
export function parseRecentFabrics(raw: string | null, max = MAX_RECENT_FABRICS): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? cleanRecent(parsed, max, isId) : []
  } catch {
    return []
  }
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-recent-fabrics-v1'

export function loadRecentFabrics(): string[] {
  try {
    return parseRecentFabrics(localStorage.getItem(STORE_KEY))
  } catch {
    return []
  }
}

export function saveRecentFabrics(ids: string[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(ids))
  } catch {
    /* storage blocked — the row still works for this session */
  }
}

/** Record a pick against the stored list, persisting only when it actually changed. */
export function recordRecentFabric(id: string): void {
  const before = loadRecentFabrics()
  const after = pushRecentFabric(before, id)
  if (after !== before) saveRecentFabrics(after)
}
