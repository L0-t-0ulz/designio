import { describe, it, expect } from 'vitest'
import { parseSnapshot, serializeSnapshot, shouldOfferRestore, describeAge, type AutosaveSnapshot } from '../src/renderer/studio/autosave'

const snap = (over: Partial<AutosaveSnapshot> = {}): AutosaveSnapshot => ({ doc: '{"version":1}', savedAt: 1000, name: 'Untitled', ...over })

describe('autosave + crash recovery', () => {
  it('round-trips a snapshot through serialize/parse', () => {
    const s = snap({ doc: '{"version":1,"layers":[]}', savedAt: 42, name: 'My dress' })
    expect(parseSnapshot(serializeSnapshot(s))).toEqual(s)
  })

  it('rejects missing / corrupt / empty-doc slots', () => {
    expect(parseSnapshot(null)).toBeNull()
    expect(parseSnapshot('not json')).toBeNull()
    expect(parseSnapshot('{"savedAt":1}')).toBeNull() // no doc
    expect(parseSnapshot('{"doc":"","savedAt":1}')).toBeNull() // empty doc
    expect(parseSnapshot('{"doc":"x"}')).toBeNull() // no savedAt
  })

  it('defaults a missing name to Untitled', () => {
    expect(parseSnapshot('{"doc":"{}","savedAt":5}')!.name).toBe('Untitled')
  })

  it('offers restore only for a real, recent snapshot', () => {
    const now = 10_000_000
    expect(shouldOfferRestore(null, now)).toBe(false)
    expect(shouldOfferRestore(snap({ savedAt: now - 1000 }), now)).toBe(true) // 1s ago
    expect(shouldOfferRestore(snap({ savedAt: now - 8 * 24 * 3600 * 1000 }), now)).toBe(false) // 8 days → stale
    expect(shouldOfferRestore(snap({ savedAt: now + 5000 }), now)).toBe(false) // future clock skew
  })

  it('describes an age in human units', () => {
    expect(describeAge(3_000)).toBe('just now')
    expect(describeAge(90_000)).toBe('2 minutes ago')
    expect(describeAge(60_000)).toBe('1 minute ago')
    expect(describeAge(2 * 3600_000)).toBe('2 hours ago')
    expect(describeAge(3 * 24 * 3600_000)).toBe('3 days ago')
  })
})
