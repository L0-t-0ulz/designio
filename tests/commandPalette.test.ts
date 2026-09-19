import { describe, it, expect } from 'vitest'
import {
  PALETTE_KINDS,
  paletteByKind,
  scoreItem,
  scoreText,
  searchPalette,
  stepSelection,
  type PaletteItem,
  type PaletteKind
} from '../src/renderer/ui/commandPalette'

const item = (kind: PaletteKind, name: string, hint?: string): PaletteItem => ({
  kind,
  id: `${kind}:${name}`,
  name,
  hint,
  run: () => {}
})

describe('command-palette ranking', () => {
  it('scores by how much of a word the query covers, best first', () => {
    expect(scoreText('Denim', 'denim')).toBe(0) // exact
    expect(scoreText('Denim', 'den')).toBe(1) // prefix
    expect(scoreText('Stretch denim', 'den')).toBe(2) // a later word's prefix
    expect(scoreText('Broderie anglaise', 'ais')).toBe(3) // mid-word
    expect(scoreText('Boiled wool', 'bdw')).toBe(4) // subsequence
    expect(scoreText('Denim', 'zzz')).toBeNull()
  })

  it('is case- and whitespace-insensitive, and an empty query matches everything', () => {
    expect(scoreText('Denim', '  DENIM ')).toBe(0)
    expect(scoreText('Denim', '')).toBe(0)
    expect(scoreText('anything', '   ')).toBe(0)
  })

  it('hyphenated names match on either part', () => {
    expect(scoreText('Enzyme-wash', 'wash')).toBe(2)
    expect(scoreText('Enzyme-wash', 'enzyme')).toBe(1)
  })

  it('a name match always beats a hint match', () => {
    const byName = item('fabric', 'Denim', 'cotton')
    const byHint = item('fabric', 'Chambray', 'denim-like')
    expect(scoreItem(byName, 'denim')).toBeLessThan(scoreItem(byHint, 'denim') as number)
  })

  it('finds an item by its hint when the name says nothing', () => {
    expect(scoreItem(item('garment', 'Anorak', 'outerwear'), 'outerwear')).not.toBeNull()
    expect(scoreItem(item('garment', 'Anorak'), 'outerwear')).toBeNull()
  })

  it('ranks prefix above later-word above subsequence', () => {
    // "Broderie anglaise" does match "den" — bro-D-E-rie a-N-glaise — but only as a
    // scattered subsequence, so it sorts below the two real hits rather than vanishing
    const items = [item('fabric', 'Broderie anglaise'), item('fabric', 'Denim'), item('fabric', 'Stretch denim')]
    expect(searchPalette('den', items).map((i) => i.name)).toEqual(['Denim', 'Stretch denim', 'Broderie anglaise'])
  })

  it('breaks ties on the shorter name, then group order, then alphabetically', () => {
    // all three are exact-prefix matches; shortest name wins
    const items = [item('fabric', 'Wool crepe'), item('fabric', 'Wool'), item('fabric', 'Wool flannel')]
    expect(searchPalette('wool', items).map((i) => i.name)).toEqual(['Wool', 'Wool crepe', 'Wool flannel'])

    // equal score and equal length: the group order in PALETTE_KINDS decides
    const sameLen = [item('preset', 'Tee'), item('garment', 'Tee')]
    expect(searchPalette('tee', sameLen).map((i) => i.kind)).toEqual(['garment', 'preset'])
  })

  it('is stable — the same query never reshuffles', () => {
    const items = [item('fabric', 'Wool'), item('garment', 'Wool coat'), item('preset', 'Wool suit')]
    expect(searchPalette('wool', items)).toEqual(searchPalette('wool', items))
  })

  it('lists everything for an empty query, and honours the limit', () => {
    const items = [item('fabric', 'A'), item('fabric', 'B'), item('fabric', 'C')]
    expect(searchPalette('', items)).toHaveLength(3)
    expect(searchPalette('', items, 2)).toHaveLength(2)
    expect(searchPalette('', items, 0)).toHaveLength(0)
    expect(searchPalette('', items, -5)).toHaveLength(0)
  })

  it('returns nothing when nothing matches', () => {
    expect(searchPalette('zzzz', [item('fabric', 'Denim')])).toEqual([])
  })

  it('groups in PALETTE_KINDS order, drops empty groups, and keeps each ranking', () => {
    const results = [item('preset', 'P1'), item('garment', 'G1'), item('preset', 'P2')]
    const groups = paletteByKind(results)
    expect(groups.map((g) => g.id)).toEqual(['garment', 'preset'])
    expect(groups[1].items.map((i) => i.name)).toEqual(['P1', 'P2'])
    expect(paletteByKind([])).toEqual([])
  })

  it('every kind has a group, so no result can be rendered into nowhere', () => {
    const kinds: PaletteKind[] = ['garment', 'fabric', 'avatar', 'preset', 'template']
    for (const k of kinds) expect(PALETTE_KINDS.some((g) => g.id === k)).toBe(true)
    expect(PALETTE_KINDS).toHaveLength(kinds.length)
  })
})

describe('command-palette selection', () => {
  it('wraps at both ends', () => {
    expect(stepSelection(0, 1, 3)).toBe(1)
    expect(stepSelection(2, 1, 3)).toBe(0)
    expect(stepSelection(0, -1, 3)).toBe(2)
  })

  it('stays at -1 when there is nothing to select', () => {
    expect(stepSelection(-1, 1, 0)).toBe(-1)
    expect(stepSelection(-1, -1, 0)).toBe(-1)
  })

  it('recovers from a stale -1 selection once results arrive', () => {
    expect(stepSelection(-1, 1, 3)).toBe(0)
    expect(stepSelection(-1, -1, 3)).toBe(2)
  })
})
