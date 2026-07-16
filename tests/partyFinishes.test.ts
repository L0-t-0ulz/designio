import { describe, it, expect } from 'vitest'
import { PARTY_FINISHES, PARTY_FINISH_NAMES, getPartyFinish, applyPartyFinish, type PartyTarget } from '../src/renderer/fabric/partyFinishes'

describe('party headwear finishes', () => {
  it('every preset has a unique name + label + at least one finish', () => {
    expect(new Set(PARTY_FINISH_NAMES).size).toBe(PARTY_FINISHES.length)
    for (const p of PARTY_FINISHES) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.finish.sparkle || p.finish.iridescent).toBeTruthy()
    }
  })

  it('applying a preset sets its finishes + festive colour, clearing the unused finish', () => {
    const t: PartyTarget = { sparkle: 'beading', iridescent: 'iridescent', color: 0x111111 }
    applyPartyFinish(t, getPartyFinish('gold-glam')!)
    expect(t.sparkle).toBe('foil')
    expect(t.iridescent).toBeUndefined() // gold-glam has no iridescent → cleared
    expect(t.color).toBe(0xd4af37) // festive gold applied
  })

  it('a preset without a colour leaves the current colour untouched', () => {
    const t: PartyTarget = { color: 0x445566 }
    applyPartyFinish(t, getPartyFinish('disco')!)
    expect(t.sparkle).toBe('sequins')
    expect(t.iridescent).toBe('holographic')
    expect(t.color).toBe(0x445566) // disco defines no colour
  })

  it('an unknown finish name resolves to undefined', () => {
    expect(getPartyFinish('nope')).toBeUndefined()
  })
})
