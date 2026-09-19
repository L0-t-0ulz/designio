/**
 * **Quick colours** — the small swatch row above the full colour library: the colours
 * this designer has actually been using, most recent first.
 *
 * The library is 54 curated references, which is the right size for *finding* a
 * production colour and the wrong size for *returning* to the four you are working
 * in. This row is the second job.
 *
 * Seeded with a handful of staples so it is useful before it knows anything about
 * you, and it becomes personal as you work. The list logic is pure and unit-tested;
 * only load/save touch storage.
 */

/** How many swatches the row holds before the oldest drops off. One row's worth. */
export const MAX_QUICK_COLORS = 10

/**
 * What the row shows before it has learned anything — neutrals plus a few workhorse
 * colours, taken from the named library so every seed is a real production reference
 * (TR-1080 Jet Black, TR-1000 Bright White, TR-1050 Ash Grey, TR-1020 Oat Beige,
 * TR-2000 Chili Red, TR-4040 (navy), TR-3030 (olive), TR-5020 (dusty pink)).
 */
export const QUICK_SEED: number[] = [0x181a1d, 0xf6f6f2, 0x8a8f94, 0xd8ccb4, 0xc0392b, 0x2c3e6b, 0x6b7a4a, 0xc08a95]

/** Clamp to a valid 24-bit colour; anything else is rejected outright. */
function isColor(c: unknown): c is number {
  return typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 0xffffff
}

/**
 * `list` with `hex` at the front, deduped and capped.
 *
 * Re-using a colour moves it to the front rather than adding a second copy — a row
 * of ten swatches showing the same navy four times is worse than useless. Returns
 * the same list unchanged when `hex` is already at the front, so simply re-picking
 * the current colour causes no write.
 */
export function pushQuickColor(list: number[], hex: number, max = MAX_QUICK_COLORS): number[] {
  if (!isColor(hex) || max <= 0) return list
  if (list[0] === hex) return list
  return [hex, ...list.filter((c) => c !== hex)].slice(0, max)
}

/** Parse stored JSON into a usable list, dropping anything that isn't a colour. */
export function parseQuickColors(raw: string | null, max = MAX_QUICK_COLORS): number[] {
  if (!raw) return [...QUICK_SEED].slice(0, max)
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...QUICK_SEED].slice(0, max)
    const clean = [...new Set(parsed.filter(isColor))].slice(0, max)
    // an empty or entirely junk list falls back to the seed rather than an empty row
    return clean.length ? clean : [...QUICK_SEED].slice(0, max)
  } catch {
    return [...QUICK_SEED].slice(0, max)
  }
}

// ---- persistence (the only impure part) ----
const STORE_KEY = 'dio-quick-colors-v1'

export function loadQuickColors(): number[] {
  try {
    return parseQuickColors(localStorage.getItem(STORE_KEY))
  } catch {
    return [...QUICK_SEED]
  }
}

export function saveQuickColors(list: number[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list))
  } catch {
    /* storage blocked — the row still works for this session */
  }
}
