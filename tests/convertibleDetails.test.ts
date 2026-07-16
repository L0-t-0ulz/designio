import { describe, it, expect } from 'vitest'
import { convertibleDetailsFor, convertibleNote } from '../src/renderer/garment/convertibleDetails'

describe('convertible details', () => {
  it('derives the convertible details a construction supports', () => {
    const all = convertibleDetailsFor({ hasSleeves: true, hasLegs: true, hood: true, collar: true })
    expect(all.map((d) => d.name)).toEqual(['Roll-up sleeve', 'Zip-off leg', 'Stowaway hood', 'Convertible collar'])
    for (const d of all) {
      expect(d.states).toHaveLength(2) // two worn configs
      expect(d.hardware.length).toBeGreaterThan(0)
    }
  })

  it('only offers details the garment can support', () => {
    expect(convertibleDetailsFor({ hasLegs: true }).map((d) => d.name)).toEqual(['Zip-off leg'])
    expect(convertibleDetailsFor({}).length).toBe(0) // a plain garment converts nothing
    expect(convertibleDetailsFor({ hasSleeves: true }).some((d) => d.name === 'Roll-up sleeve')).toBe(true)
  })

  it('each convertible detail names its hardware', () => {
    expect(convertibleDetailsFor({ hasLegs: true })[0].hardware).toContain('zip')
    expect(convertibleDetailsFor({ hasSleeves: true })[0].hardware).toContain('tab')
  })

  it('summarises the details into a tech-pack note', () => {
    const note = convertibleNote(convertibleDetailsFor({ hasSleeves: true, hasLegs: true }))
    expect(note).toContain('roll-up sleeve')
    expect(note).toContain('trousers ↔ shorts')
    expect(convertibleNote([])).toBe('') // nothing convertible → no note
  })
})
