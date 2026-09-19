/**
 * **Most-recently-used lists** — the shared shape behind the quick-colour strip and
 * the recent-fabrics row.
 *
 * Extracted when the second one turned up rather than copied: the awkward parts (a
 * re-pick must *move* rather than duplicate, and re-picking the current item must not
 * cause a write) are exactly the parts that get subtly different in a second
 * hand-written copy.
 */

/**
 * `list` with `item` at the front, deduped and capped.
 *
 * Returns the **same array reference** when nothing would change — that is, when
 * `item` is already at the front — so callers can skip persisting and re-rendering by
 * identity rather than by comparing contents.
 */
export function pushRecent<T>(list: T[], item: T, max: number): T[] {
  if (!Number.isFinite(max) || max <= 0) return list
  if (list[0] === item) return list
  return [item, ...list.filter((x) => x !== item)].slice(0, max)
}

/** Unique items, order preserved, capped — for cleaning a list read back from storage. */
export function cleanRecent<T>(items: T[], max: number, valid: (v: unknown) => v is T): T[] {
  if (!Number.isFinite(max) || max <= 0) return []
  return [...new Set(items.filter(valid))].slice(0, max)
}
