import { describe, it, expect } from 'vitest'
import {
  MAX_FAVOURITES,
  isFavourite,
  parseFavourites,
  pruneFavourites,
  toggleFavourite
} from '../src/renderer/fabric/favourites'

describe('starring a fabric', () => {
  it('adds and removes', () => {
    expect(toggleFavourite([], 'denim')).toEqual(['denim'])
    expect(toggleFavourite(['denim'], 'denim')).toEqual([])
  })

  it('appends rather than reordering, so the shortlist stays stable', () => {
    // a row that reshuffles every time you star something is unreadable
    expect(toggleFavourite(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
  })

  it('un-starring the middle leaves the rest in order', () => {
    expect(toggleFavourite(['a', 'b', 'c'], 'b')).toEqual(['a', 'c'])
  })

  it('never mutates the list it was given', () => {
    const before = ['a']
    toggleFavourite(before, 'b')
    toggleFavourite(before, 'a')
    expect(before).toEqual(['a'])
  })

  it('stops at the cap, returning the same list rather than half-acting', () => {
    const full = Array.from({ length: MAX_FAVOURITES }, (_, i) => `f${i}`)
    expect(toggleFavourite(full, 'one-more')).toBe(full)
    // ...but un-starring still works when full
    expect(toggleFavourite(full, 'f0')).toHaveLength(MAX_FAVOURITES - 1)
  })

  it('honours a caller-supplied cap', () => {
    expect(toggleFavourite(['a', 'b'], 'c', 2)).toEqual(['a', 'b'])
    expect(toggleFavourite(['a'], 'b', 2)).toEqual(['a', 'b'])
  })

  it('rejects a junk id', () => {
    const before = ['a']
    for (const bad of ['', null as unknown as string, 7 as unknown as string]) {
      expect(toggleFavourite(before, bad)).toBe(before)
    }
  })

  it('isFavourite reports membership', () => {
    expect(isFavourite(['a', 'b'], 'b')).toBe(true)
    expect(isFavourite(['a'], 'z')).toBe(false)
  })
})

describe('pruning against the catalogue', () => {
  it('drops a favourite whose fabric no longer exists', () => {
    expect(pruneFavourites(['a', 'gone', 'b'], ['a', 'b', 'c'])).toEqual(['a', 'b'])
  })

  it('returns the same list when everything still exists, so nothing is rewritten', () => {
    const ids = ['a', 'b']
    expect(pruneFavourites(ids, ['a', 'b', 'c'])).toBe(ids)
  })

  it('copes with an empty catalogue or an empty list', () => {
    expect(pruneFavourites(['a'], [])).toEqual([])
    expect(pruneFavourites([], ['a'])).toEqual([])
  })
})

describe('stored favourites', () => {
  it('reads a stored list back in order', () => {
    expect(parseFavourites('["denim","silk"]')).toEqual(['denim', 'silk'])
  })

  it('starts empty when nothing is stored', () => {
    expect(parseFavourites(null)).toEqual([])
  })

  it('drops junk entries and duplicates', () => {
    expect(parseFavourites('["a",1,null,"",​"a","b"]'.replace('​', ''))).toEqual(['a', 'b'])
  })

  it('survives unparseable or non-array data', () => {
    for (const raw of ['not json', '{"a":1}', 'null', '42']) expect(parseFavourites(raw)).toEqual([])
  })

  it('honours the cap on read', () => {
    expect(parseFavourites('["a","b","c"]', 2)).toEqual(['a', 'b'])
  })
})
