import { describe, it, expect } from 'vitest'
import { dropIndex, moveItem, selectionAfterMove } from '../src/renderer/studio/reorder'

const list = (): string[] => ['a', 'b', 'c', 'd']

describe('moveItem', () => {
  it('moves an item down the list', () => {
    expect(moveItem(list(), 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves an item up the list', () => {
    expect(moveItem(list(), 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves to the ends', () => {
    expect(moveItem(list(), 0, 3)).toEqual(['b', 'c', 'd', 'a'])
    expect(moveItem(list(), 3, 0)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('never mutates the input', () => {
    const before = list()
    moveItem(before, 0, 3)
    expect(before).toEqual(['a', 'b', 'c', 'd'])
  })

  it('returns the very same array when nothing would change, so a stray drag is free', () => {
    const before = list()
    expect(moveItem(before, 1, 1)).toBe(before)
    expect(moveItem(before, -1, 2)).toBe(before)
    expect(moveItem(before, 0, 9)).toBe(before)
    expect(moveItem(before, 9, 0)).toBe(before)
    expect(moveItem([], 0, 0)).toEqual([])
  })

  it('rejects non-integer indices rather than splicing at NaN', () => {
    const before = list()
    expect(moveItem(before, 1.5, 2)).toBe(before)
    expect(moveItem(before, NaN, 2)).toBe(before)
  })

  it('keeps every item — a reorder must never lose or clone one', () => {
    const out = moveItem(list(), 0, 3)
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('selectionAfterMove', () => {
  it('follows the row that was dragged', () => {
    expect(selectionAfterMove(0, 0, 2)).toBe(2)
    expect(selectionAfterMove(3, 3, 1)).toBe(1)
  })

  it('shifts a row the drag passed over, downward', () => {
    // 'a' (0) moves to 2, so what was at 1 and 2 each shift up one
    expect(selectionAfterMove(1, 0, 2)).toBe(0)
    expect(selectionAfterMove(2, 0, 2)).toBe(1)
  })

  it('shifts a row the drag passed over, upward', () => {
    // 'd' (3) moves to 1, so what was at 1 and 2 each shift down one
    expect(selectionAfterMove(1, 3, 1)).toBe(2)
    expect(selectionAfterMove(2, 3, 1)).toBe(3)
  })

  it('leaves a row outside the moved span alone', () => {
    expect(selectionAfterMove(3, 0, 2)).toBe(3)
    expect(selectionAfterMove(0, 3, 1)).toBe(0)
  })

  it('does nothing when the item did not move', () => {
    for (const s of [0, 1, 2, 3]) expect(selectionAfterMove(s, 2, 2)).toBe(s)
  })

  it('agrees with actually performing the move', () => {
    // the property that matters: the selected item is still the selected item
    const items = list()
    for (let from = 0; from < items.length; from++) {
      for (let to = 0; to < items.length; to++) {
        for (let sel = 0; sel < items.length; sel++) {
          const moved = moveItem(items, from, to)
          expect(moved[selectionAfterMove(sel, from, to)]).toBe(items[sel])
        }
      }
    }
  })
})

describe('dropIndex', () => {
  it('drops before a row when the pointer is in its upper half', () => {
    expect(dropIndex(2, false, 5)).toBe(2)
  })

  it('drops after a row when the pointer is in its lower half', () => {
    expect(dropIndex(2, true, 5)).toBe(3)
  })

  it('clamps past the end of the list', () => {
    expect(dropIndex(4, true, 5)).toBe(4)
  })

  it('clamps at the start', () => {
    expect(dropIndex(-3, false, 5)).toBe(0)
  })

  it('is 0 for an empty list', () => {
    expect(dropIndex(0, true, 0)).toBe(0)
  })
})
