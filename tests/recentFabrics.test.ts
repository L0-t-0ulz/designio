import { describe, it, expect } from 'vitest'
import {
  MAX_RECENT_FABRICS,
  parseRecentFabrics,
  pruneRecentFabrics,
  pushRecentFabric
} from '../src/renderer/fabric/recentFabrics'

describe('recent fabrics', () => {
  it('puts the newest first — the opposite of favourites, on purpose', () => {
    expect(pushRecentFabric(['denim'], 'silk')).toEqual(['silk', 'denim'])
  })

  it('re-using a fabric moves it to the front', () => {
    expect(pushRecentFabric(['a', 'b', 'c'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('does nothing when it is already the most recent', () => {
    const list = ['a', 'b']
    expect(pushRecentFabric(list, 'a')).toBe(list)
  })

  it('caps at one row', () => {
    let list: string[] = []
    for (let i = 0; i < MAX_RECENT_FABRICS + 3; i++) list = pushRecentFabric(list, `f${i}`)
    expect(list).toHaveLength(MAX_RECENT_FABRICS)
    expect(list[0]).toBe(`f${MAX_RECENT_FABRICS + 2}`)
    expect(list).not.toContain('f0')
  })

  it('rejects a junk id', () => {
    const list = ['a']
    for (const bad of ['', null as unknown as string, 3 as unknown as string]) {
      expect(pushRecentFabric(list, bad)).toBe(list)
    }
  })

  it('prunes fabrics that no longer exist', () => {
    expect(pruneRecentFabrics(['a', 'gone'], ['a', 'b'])).toEqual(['a'])
  })

  it('returns the same list when nothing is stale', () => {
    const ids = ['a']
    expect(pruneRecentFabrics(ids, ['a', 'b'])).toBe(ids)
  })

  it('reads a stored list, dropping junk and duplicates', () => {
    expect(parseRecentFabrics('["a",2,"a","b",null]')).toEqual(['a', 'b'])
  })

  it('starts empty, and survives bad data', () => {
    for (const raw of [null, 'not json', '{"a":1}', '5', 'null']) expect(parseRecentFabrics(raw)).toEqual([])
  })

  it('honours the cap on read', () => {
    expect(parseRecentFabrics('["a","b","c"]', 2)).toEqual(['a', 'b'])
  })
})
