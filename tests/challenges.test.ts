import { describe, it, expect } from 'vitest'
import { CHALLENGES, searchChallenges, getChallenge } from '../src/renderer/ui/challenges'
import { GARMENT_IDS } from '../src/renderer/garments/registry'

describe('community challenges', () => {
  it('every challenge is well-formed with a real start garment', () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(6)
    const ids = new Set(GARMENT_IDS)
    for (const c of CHALLENGES) {
      expect(c.id && c.title && c.theme && c.brief).toBeTruthy()
      expect(c.constraints.length).toBeGreaterThanOrEqual(2)
      expect(ids.has(c.startGarment)).toBe(true) // seeds a real garment
    }
  })

  it('has unique ids', () => {
    const ids = CHALLENGES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('search matches title/theme/brief/constraints', () => {
    expect(searchChallenges('monochrome').some((c) => c.id === 'monochrome')).toBe(true)
    expect(searchChallenges('EVENING').some((c) => c.id === 'evening')).toBe(true)
    expect(searchChallenges('pockets').some((c) => c.id === 'utility')).toBe(true) // from a constraint
    expect(searchChallenges('')).toHaveLength(CHALLENGES.length)
    expect(searchChallenges('zzznope')).toEqual([])
  })

  it('getChallenge finds by id', () => {
    expect(getChallenge('knit')?.startGarment).toBe('cardigan')
    expect(getChallenge('nope')).toBeUndefined()
  })
})
