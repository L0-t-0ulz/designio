import { describe, it, expect } from 'vitest'
import { parseProfiles, profileFromBody, removeProfile, serializeProfiles, upsertProfile, type FitProfile } from '../src/renderer/avatar/fitProfiles'
import { bodyToMeasurements } from '../src/renderer/avatar/measure'
import type { BodyParams } from '../src/renderer/avatar/Mannequin'

const body: BodyParams = { bodyType: 'female', height: 1.05, build: 1.1, bust: 1.06, waist: 0.95, hips: 1.02 }

describe('per-customer fit profiles', () => {
  it('captures the live avatar as real cm measurements', () => {
    const p = profileFromBody('  Ana  ', body, 'fp_test')
    expect(p).toEqual({ id: 'fp_test', name: 'Ana', bodyType: 'female', measurements: bodyToMeasurements(body) })
    expect(p.measurements.bust).toBeCloseTo(88 * 1.1 * 1.06, 6)
    expect(profileFromBody('', body, 'x').name).toBe('Unnamed')
  })

  it('round-trips through serialize/parse; junk and malformed entries are dropped', () => {
    const a = profileFromBody('Ana', body, 'fp_a')
    const b = profileFromBody('Ben', { ...body, bodyType: 'male' }, 'fp_b')
    expect(parseProfiles(serializeProfiles([a, b]))).toEqual([a, b])
    expect(parseProfiles(null)).toEqual([])
    expect(parseProfiles('not json')).toEqual([])
    expect(parseProfiles('{"nope":1}')).toEqual([])
    const junk = JSON.stringify([a, { id: 'x' }, { ...b, measurements: { height: 'tall' } }])
    expect(parseProfiles(junk)).toEqual([a]) // only the well-formed entry survives
  })

  it('upsert replaces by id in place; remove filters', () => {
    const a = profileFromBody('Ana', body, 'fp_a')
    const b = profileFromBody('Ben', body, 'fp_b')
    let list: FitProfile[] = []
    list = upsertProfile(list, a)
    list = upsertProfile(list, b)
    expect(list.map((p) => p.id)).toEqual(['fp_a', 'fp_b'])
    list = upsertProfile(list, { ...a, name: 'Ana v2' })
    expect(list[0].name).toBe('Ana v2') // replaced in place, order kept
    expect(list.length).toBe(2)
    expect(removeProfile(list, 'fp_a').map((p) => p.id)).toEqual(['fp_b'])
  })
})
