import { describe, it, expect } from 'vitest'
import { GLOSSARY, GLOSSARY_CATEGORIES, searchGlossary, glossaryByCategory, type GlossaryCategory } from '../src/renderer/ui/glossary'

describe('term glossary', () => {
  it('every entry is well-formed and in a known category', () => {
    const cats = new Set<GlossaryCategory>(GLOSSARY_CATEGORIES.map((c) => c.id))
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(20)
    for (const e of GLOSSARY) {
      expect(e.term.trim().length).toBeGreaterThan(0)
      expect(e.def.trim().length).toBeGreaterThan(10)
      expect(cats.has(e.category)).toBe(true)
    }
  })

  it('has no duplicate terms', () => {
    const terms = GLOSSARY.map((e) => e.term.toLowerCase())
    expect(new Set(terms).size).toBe(terms.length)
  })

  it('search matches the term OR the definition, case-insensitively', () => {
    expect(searchGlossary('dart').some((e) => e.term === 'Dart')).toBe(true)
    expect(searchGlossary('DART').some((e) => e.term === 'Dart')).toBe(true)
    // a word that only appears in a definition still matches
    const byDef = searchGlossary('diagonal')
    expect(byDef.length).toBeGreaterThan(0)
    expect(byDef.some((e) => e.term === 'Bias' || e.term === 'Twill')).toBe(true)
    // an empty query returns everything
    expect(searchGlossary('').length).toBe(GLOSSARY.length)
    // no match → empty
    expect(searchGlossary('zzzznotaterm')).toEqual([])
  })

  it('groups by category in the canonical order, dropping empty groups', () => {
    const groups = glossaryByCategory()
    const total = groups.reduce((n, g) => n + g.entries.length, 0)
    expect(total).toBe(GLOSSARY.length)
    // every group non-empty, and each entry sits under its own category
    for (const g of groups) {
      expect(g.entries.length).toBeGreaterThan(0)
      expect(g.entries.every((e) => e.category === g.id)).toBe(true)
    }
    // filtered grouping only surfaces the matching category
    const filtered = glossaryByCategory(searchGlossary('foil'))
    expect(filtered.every((g) => g.entries.every((e) => /foil/i.test(e.term) || /foil/i.test(e.def)))).toBe(true)
  })
})
