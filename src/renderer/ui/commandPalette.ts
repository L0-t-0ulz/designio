/**
 * **Command palette** — one search box over every picker in the studio (garments ·
 * fabrics · avatars · presets · templates), so a designer who knows the name of a
 * thing does not have to remember which tab it lives behind.
 *
 * The ranking and grouping are pure (no DOM, no registries) so they're unit-tested;
 * `ui/commandPaletteOverlay` builds the items from the real registries and renders
 * the modal. Keeping the registries out of here is what lets the tests describe
 * ranking with three-item fixtures instead of the whole catalog.
 */
export type PaletteKind = 'garment' | 'fabric' | 'avatar' | 'preset' | 'template'

/** Display order of the groups — also the tie-break order when scores are equal. */
export const PALETTE_KINDS: { id: PaletteKind; label: string }[] = [
  { id: 'garment', label: 'Garments' },
  { id: 'fabric', label: 'Fabrics' },
  { id: 'avatar', label: 'Avatars' },
  { id: 'preset', label: 'Presets' },
  { id: 'template', label: 'Templates' }
]

export interface PaletteItem {
  kind: PaletteKind
  id: string
  name: string
  /** Secondary text (category, fabric family…) — shown, and searched at a penalty. */
  hint?: string
  run: () => void
}

/** How many results the modal shows before it stops. */
export const PALETTE_LIMIT = 40

/** Cost of matching in `hint` rather than `name`, so a name match always wins. */
const HINT_PENALTY = 10

const norm = (s: string): string => s.trim().toLowerCase()

/** Every character of `q` appears in `s`, in order (not necessarily adjacent). */
function isSubsequence(s: string, q: string): boolean {
  let i = 0
  for (const ch of s) if (ch === q[i] && ++i === q.length) return true
  return q.length === 0
}

/**
 * How well `text` matches `query` — lower is better, null is no match. The bands are
 * ordered by how much of the match the user actually typed at the front of a word,
 * which is what makes "den" put Denim above "Broderie anglaise".
 */
export function scoreText(text: string, query: string): number | null {
  const t = norm(text)
  const q = norm(query)
  if (!q) return 0
  if (t === q) return 0
  if (t.startsWith(q)) return 1
  if (t.split(/[\s-]+/).some((w) => w.startsWith(q))) return 2
  if (t.includes(q)) return 3
  return isSubsequence(t, q) ? 4 : null
}

/** An item's score: its name, else its hint at a penalty. null is no match. */
export function scoreItem(item: PaletteItem, query: string): number | null {
  const byName = scoreText(item.name, query)
  if (byName !== null) return byName
  const byHint = item.hint ? scoreText(item.hint, query) : null
  return byHint === null ? null : byHint + HINT_PENALTY
}

/**
 * Matching items, best first. Ties break on the shorter name (a closer match to what
 * was typed), then on group order, then alphabetically — so the list never reshuffles
 * between identical queries.
 *
 * An empty query lists everything rather than nothing: opening the palette should show
 * what there is to pick from.
 */
export function searchPalette(query: string, items: PaletteItem[], limit = PALETTE_LIMIT): PaletteItem[] {
  const kindOrder = new Map(PALETTE_KINDS.map((k, i) => [k.id, i]))
  const scored: { item: PaletteItem; score: number }[] = []
  for (const item of items) {
    const score = scoreItem(item, query)
    if (score !== null) scored.push({ item, score })
  }
  scored.sort(
    (a, b) =>
      a.score - b.score ||
      a.item.name.length - b.item.name.length ||
      (kindOrder.get(a.item.kind) ?? 0) - (kindOrder.get(b.item.kind) ?? 0) ||
      a.item.name.localeCompare(b.item.name)
  )
  return scored.slice(0, Math.max(0, limit)).map((s) => s.item)
}

/** Group results for display, in `PALETTE_KINDS` order, dropping empty groups and
 *  preserving each group's ranking. */
export function paletteByKind(items: PaletteItem[]): { id: PaletteKind; label: string; items: PaletteItem[] }[] {
  return PALETTE_KINDS.map((k) => ({ ...k, items: items.filter((i) => i.kind === k.id) })).filter((g) => g.items.length > 0)
}

/**
 * Move a selection by `delta`, wrapping at both ends. An empty list has no selection.
 *
 * `current` outside the list — -1 for "nothing selected", or an index left over from a
 * longer previous result set — is not treated as a position to count from: stepping
 * forward lands on the first row and stepping back on the last, which is what pressing
 * ↑ before ↓ should do.
 */
export function stepSelection(current: number, delta: number, count: number): number {
  if (count <= 0) return -1
  if (current < 0 || current >= count) return delta >= 0 ? 0 : count - 1
  return (((current + delta) % count) + count) % count
}
