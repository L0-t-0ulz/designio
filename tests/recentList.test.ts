import { describe, it, expect } from 'vitest'
import { cleanRecent, pushRecent } from '../src/renderer/core/recentList'

const isStr = (v: unknown): v is string => typeof v === 'string'

describe('shared most-recently-used list', () => {
  it('puts a new item at the front', () => {
    expect(pushRecent(['b', 'c'], 'a', 5)).toEqual(['a', 'b', 'c'])
  })

  it('moves a re-picked item rather than duplicating it', () => {
    expect(pushRecent(['a', 'b', 'c'], 'c', 5)).toEqual(['c', 'a', 'b'])
  })

  it('returns the same reference when the item is already first', () => {
    // callers use identity to skip persisting and re-rendering
    const list = ['a', 'b']
    expect(pushRecent(list, 'a', 5)).toBe(list)
  })

  it('caps, dropping the oldest', () => {
    expect(pushRecent(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b'])
  })

  it('refuses a nonsense cap rather than emptying the list', () => {
    const list = ['a']
    for (const max of [0, -1, NaN, Infinity]) expect(pushRecent(list, 'b', max)).toBe(list)
  })

  it('never mutates the input', () => {
    const before = ['a', 'b']
    pushRecent(before, 'c', 5)
    expect(before).toEqual(['a', 'b'])
  })

  it('works for numbers as well as strings', () => {
    expect(pushRecent([2, 3], 1, 5)).toEqual([1, 2, 3])
  })
})

describe('cleaning a stored list', () => {
  it('drops invalid entries and duplicates, preserving order', () => {
    expect(cleanRecent(['a', 1 as unknown as string, 'a', 'b'], 5, isStr)).toEqual(['a', 'b'])
  })

  it('caps', () => {
    expect(cleanRecent(['a', 'b', 'c'], 2, isStr)).toEqual(['a', 'b'])
  })

  it('returns nothing for a nonsense cap', () => {
    for (const max of [0, -1, NaN]) expect(cleanRecent(['a'], max, isStr)).toEqual([])
  })
})
