import { describe, it, expect } from 'vitest'
import { MAX_QUICK_COLORS, QUICK_SEED, parseQuickColors, pushQuickColor } from '../src/renderer/fabric/quickColors'

describe('quick colour list', () => {
  it('puts a new colour at the front', () => {
    expect(pushQuickColor([0x111111, 0x222222], 0x333333)).toEqual([0x333333, 0x111111, 0x222222])
  })

  it('moves a re-used colour to the front instead of duplicating it', () => {
    // ten swatches showing the same navy four times is worse than useless
    expect(pushQuickColor([0x111111, 0x222222, 0x333333], 0x333333)).toEqual([0x333333, 0x111111, 0x222222])
  })

  it('does no work when the colour is already at the front', () => {
    const list = [0x111111, 0x222222]
    expect(pushQuickColor(list, 0x111111)).toBe(list) // same reference → no write, no re-render
  })

  it('caps the list, dropping the oldest', () => {
    let list: number[] = []
    for (let i = 0; i < MAX_QUICK_COLORS + 5; i++) list = pushQuickColor(list, i)
    expect(list).toHaveLength(MAX_QUICK_COLORS)
    expect(list[0]).toBe(MAX_QUICK_COLORS + 4) // newest
    expect(list).not.toContain(0) // oldest gone
  })

  it('honours a caller-supplied cap, and rejects a nonsense one', () => {
    expect(pushQuickColor([1, 2, 3], 4, 2)).toEqual([4, 1])
    const list = [1, 2]
    expect(pushQuickColor(list, 3, 0)).toBe(list)
    expect(pushQuickColor(list, 3, -1)).toBe(list)
  })

  it('refuses anything that is not a 24-bit colour', () => {
    const list = [0x111111]
    for (const bad of [-1, 0x1000000, 1.5, NaN, Infinity, '#fff' as unknown as number, null as unknown as number]) {
      expect(pushQuickColor(list, bad)).toBe(list)
    }
    expect(pushQuickColor(list, 0x000000)).toEqual([0x000000, 0x111111]) // black is valid
    expect(pushQuickColor(list, 0xffffff)).toEqual([0xffffff, 0x111111]) // and so is white
  })
})

describe('stored quick colours', () => {
  it('falls back to the seed when there is nothing stored', () => {
    expect(parseQuickColors(null)).toEqual(QUICK_SEED)
  })

  it('reads a stored list back', () => {
    expect(parseQuickColors('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('drops junk entries but keeps the good ones', () => {
    expect(parseQuickColors('[1,"x",-5,2,16777216,null,3]')).toEqual([1, 2, 3])
  })

  it('dedupes a stored list', () => {
    expect(parseQuickColors('[1,1,2,1]')).toEqual([1, 2])
  })

  it('falls back to the seed rather than showing an empty row', () => {
    // an empty strip of swatches looks broken
    for (const raw of ['[]', '["x",null]', 'not json', '{"a":1}', 'null']) {
      expect(parseQuickColors(raw)).toEqual(QUICK_SEED)
    }
  })

  it('honours the cap when reading', () => {
    expect(parseQuickColors('[1,2,3,4,5]', 3)).toEqual([1, 2, 3])
    expect(parseQuickColors(null, 3)).toEqual(QUICK_SEED.slice(0, 3))
  })

  it('never hands out the seed array itself for a caller to mutate', () => {
    const got = parseQuickColors(null)
    got.push(0x123456)
    expect(parseQuickColors(null)).toEqual(QUICK_SEED)
  })

  it('the seed is a usable row of real colours', () => {
    expect(QUICK_SEED.length).toBeGreaterThanOrEqual(6)
    expect(QUICK_SEED.length).toBeLessThanOrEqual(MAX_QUICK_COLORS)
    expect(new Set(QUICK_SEED).size).toBe(QUICK_SEED.length)
    for (const c of QUICK_SEED) {
      expect(Number.isInteger(c)).toBe(true)
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(0xffffff)
    }
  })
})
