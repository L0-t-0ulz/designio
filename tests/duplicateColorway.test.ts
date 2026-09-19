import { describe, it, expect } from 'vitest'
import { duplicateColorway, uniqueColorwayName, type Colorway } from '../src/renderer/studio/document'

const cw = (id: string, name: string, over: Partial<Colorway> = {}): Colorway =>
  ({ id, name, color: 0x112233, fabricId: 'cotton', ...over }) as Colorway

describe('unique colourway names', () => {
  it('appends "copy" when that is free', () => {
    expect(uniqueColorwayName('Navy', ['Navy'])).toBe('Navy copy')
  })

  it('counts up when it is not', () => {
    expect(uniqueColorwayName('Navy', ['Navy', 'Navy copy'])).toBe('Navy copy 2')
    expect(uniqueColorwayName('Navy', ['Navy', 'Navy copy', 'Navy copy 2'])).toBe('Navy copy 3')
  })

  it('fills a gap rather than always taking the next number up', () => {
    expect(uniqueColorwayName('Navy', ['Navy copy', 'Navy copy 3'])).toBe('Navy copy 2')
  })

  it('does not care about unrelated names', () => {
    expect(uniqueColorwayName('Navy', ['Red', 'Green copy'])).toBe('Navy copy')
  })
})

describe('duplicate colourway', () => {
  const list = (): Colorway[] => [cw('a', 'Navy'), cw('b', 'Sand'), cw('c', 'Olive')]

  it('puts the copy directly after the original, not at the end', () => {
    // the grid is picked from visually; a copy at the far end is hard to find
    expect(duplicateColorway(list(), 'a').map((c) => c.name)).toEqual(['Navy', 'Navy copy', 'Sand', 'Olive'])
    expect(duplicateColorway(list(), 'b').map((c) => c.name)).toEqual(['Navy', 'Sand', 'Sand copy', 'Olive'])
  })

  it('copies the appearance', () => {
    const src = cw('a', 'Navy', { color: 0xabcdef, fabricId: 'denim', sparkle: 'glitter' } as Partial<Colorway>)
    const copy = duplicateColorway([src], 'a')[1]
    expect(copy.color).toBe(0xabcdef)
    expect(copy.fabricId).toBe('denim')
    expect(copy.sparkle).toBe('glitter')
  })

  it('gives the copy its own id', () => {
    const out = duplicateColorway(list(), 'a')
    expect(out[1].id).not.toBe('a')
    expect(new Set(out.map((c) => c.id)).size).toBe(out.length)
  })

  it('deep-copies nested structures, so editing the copy cannot reach the original', () => {
    const src = cw('a', 'Navy', {
      partFabrics: { body: { fabricId: 'wool', color: 1 } },
      yarn: { count: 2, ply: 2, twist: 0.5 }
    } as unknown as Partial<Colorway>)
    const out = duplicateColorway([src], 'a')
    const copy = out[1] as unknown as Record<string, Record<string, unknown>>
    const original = out[0] as unknown as Record<string, Record<string, unknown>>
    expect(copy.partFabrics).not.toBe(original.partFabrics)
    expect(copy.yarn).not.toBe(original.yarn)
    ;(copy.yarn as { ply: number }).ply = 99
    expect((original.yarn as { ply: number }).ply).toBe(2)
  })

  it('leaves the original list untouched', () => {
    const before = list()
    duplicateColorway(before, 'a')
    expect(before).toHaveLength(3)
  })

  it('returns the list unchanged for an unknown id', () => {
    const before = list()
    expect(duplicateColorway(before, 'nope')).toBe(before)
  })

  it('handles an empty list', () => {
    expect(duplicateColorway([], 'a')).toEqual([])
  })

  it('duplicating a duplicate keeps names unambiguous', () => {
    const once = duplicateColorway(list(), 'a')
    const twice = duplicateColorway(once, once[1].id)
    expect(twice.map((c) => c.name)).toEqual(['Navy', 'Navy copy', 'Navy copy copy', 'Sand', 'Olive'])
    expect(new Set(twice.map((c) => c.name)).size).toBe(twice.length)
  })
})
