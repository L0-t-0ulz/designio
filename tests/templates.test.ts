import { describe, it, expect } from 'vitest'
import { TEMPLATES, applyTemplateToLayer, searchTemplates, getTemplate } from '../src/renderer/ui/templates'
import { GARMENT_IDS } from '../src/renderer/garments/registry'
import { getFabric } from '../src/renderer/fabric/FabricLibrary'
import { defaultLayer } from '../src/renderer/studio/document'

describe('template marketplace', () => {
  it('every template references a real garment + fabric', () => {
    const ids = new Set(GARMENT_IDS)
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(8)
    for (const t of TEMPLATES) {
      expect(ids.has(t.garment)).toBe(true)
      expect(getFabric(t.fabricId).id).toBe(t.fabricId) // real fabric (getFabric falls back on unknown)
      expect(typeof t.color).toBe('number')
    }
  })

  it('has unique ids', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('applyTemplateToLayer sets garment + fabric + colour + finish', () => {
    const l = defaultLayer('top')
    l.textile = 'camo' // a stale finish that should be cleared
    applyTemplateToLayer(l, getTemplate('plaid-skirt')!)
    expect(l.garmentType).toBe('skirt')
    expect(l.fabricId).toBe('wool-flannel')
    expect(l.textile).toBe('plaid') // template finish applied
    // a template with no textile clears the stale one
    applyTemplateToLayer(l, getTemplate('lbd')!)
    expect(l.garmentType).toBe('sheath')
    expect(l.textile).toBeUndefined()
    expect(l.sparkle).toBeUndefined()
  })

  it('applies a sparkle finish where the template has one', () => {
    const l = defaultLayer('top')
    applyTemplateToLayer(l, getTemplate('gala-gown')!)
    expect(l.sparkle).toBe('sequins')
  })

  it('search matches name + category', () => {
    expect(searchTemplates('black').some((t) => t.id === 'lbd')).toBe(true)
    expect(searchTemplates('outerwear').every((t) => t.category === 'Outerwear')).toBe(true)
    expect(searchTemplates('')).toHaveLength(TEMPLATES.length)
  })
})
