/**
 * **Layer reordering** — moving a garment up or down the stack, as pure index math.
 *
 * Layer order is wearing order (what sits over what), so a drag has to move both the
 * layer *and* the selection: the designer expects the row they dragged to still be
 * the selected one when they let go, wherever it landed.
 */

/** `list` with the item at `from` moved to `to`. Out-of-range indices, and a move to
 *  where it already is, return the list unchanged (same reference) so a stray drag
 *  costs nothing. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return list
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list
  const out = [...list]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item)
  return out
}

/**
 * Where a selection at `selected` ends up after the item at `from` moves to `to`.
 *
 * Three cases, and the middle one is the one that's easy to get wrong:
 *  - the dragged row itself follows the drag,
 *  - a row the drag passed over shifts one place the other way,
 *  - a row outside the moved span doesn't move at all.
 */
export function selectionAfterMove(selected: number, from: number, to: number): number {
  if (from === to) return selected
  if (selected === from) return to
  if (from < selected && selected <= to) return selected - 1 // dragged downward past it
  if (to <= selected && selected < from) return selected + 1 // dragged upward past it
  return selected
}

/**
 * The index a drop lands on, given the row it was dropped over and whether it was
 * dropped on that row's lower half.
 *
 * Dropping below the last row appends; the result is always a valid index into a list
 * of `count` items.
 */
export function dropIndex(overIndex: number, after: boolean, count: number): number {
  if (count <= 0) return 0
  const raw = overIndex + (after ? 1 : 0)
  return Math.max(0, Math.min(count - 1, raw))
}
