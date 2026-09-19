/**
 * **Favourite fabrics** — the handful a designer keeps coming back to, starred so
 * they sit at the top of the Fabrics tab instead of being hunted for among thirty-nine
 * every time.
 *
 * The list logic is pure and unit-tested; only load/save touch storage. Fabric ids are
 * opaque here — the catalogue is deliberately not imported, so the tests don't depend
 * on which fabrics happen to ship.
 */

/** Plenty for "the ones I keep using"; past this it stops being a shortlist. */
export const MAX_FAVOURITES = 24

const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0

export function isFavourite(ids: string[], id: string): boolean {
  return ids.includes(id)
}

/**
 * `ids` with `id` starred or un-starred.
 *
 * New favourites go on the **end**: the row is a stable shortlist you learn the shape
 * of, and re-ordering it under the user every time they star something would make it
 * unreadable. Returns the same array when nothing changes (already at the cap).
 */
export function toggleFavourite(ids: string[], id: string, max = MAX_FAVOURITES): string[] {
  if (!isId(id)) return ids
  if (ids.includes(id)) return ids.filter((x) => x !== id)
  if (ids.length >= max) return ids
  return [...ids, id]
}

/** Drop favourites whose fabric no longer exists, so a retired fabric can't leave a
 *  dead star in the list forever. */
export function pruneFavourites(ids: string[], knownIds: readonly string[]): string[] {
  const known = new Set(knownIds)
  const kept = ids.filter((id) => known.has(id))
  return kept.length === ids.length ? ids : kept
}

/** Parse stored JSON into a clean list — junk dropped, duplicates removed, capped. */
export function parseFavourites(raw: string | null, max = MAX_FAVOURITES): string[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter(isId))].slice(0, max)
  } catch {
    return []
  }
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-favourite-fabrics-v1'

export function loadFavourites(): string[] {
  try {
    return parseFavourites(localStorage.getItem(STORE_KEY))
  } catch {
    return []
  }
}

export function saveFavourites(ids: string[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(ids))
  } catch {
    /* storage blocked — stars still work for this session */
  }
}
