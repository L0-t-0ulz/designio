import { describe, it, expect } from 'vitest'
import { expandSett, tartanColorAt, TARTAN_SETTS, TARTAN_KINDS, type TartanSett, type TartanKind } from '../src/renderer/fabric/tartan'

const A = 0x111111
const B = 0x222222
const C = 0x333333
const D = 0x444444

describe('tartan sett — expandSett (reflective)', () => {
  it('flattens stripe thread counts into a colour-per-thread sequence', () => {
    const sett: TartanSett = { stripes: [{ color: A, count: 2 }, { color: B, count: 3 }], symmetric: false }
    expect(expandSett(sett)).toEqual([A, A, B, B, B])
  })

  it('a reflective sett mirrors the interior about the two pivot threads (pivots not doubled)', () => {
    // base = [A,B,C,D] → interior [B,C] reversed [C,B] appended → [A,B,C,D,C,B]
    const sett: TartanSett = { stripes: [{ color: A, count: 1 }, { color: B, count: 1 }, { color: C, count: 1 }, { color: D, count: 1 }] }
    const seq = expandSett(sett)
    expect(seq).toEqual([A, B, C, D, C, B])
    expect(seq.length).toBe(2 * 4 - 2) // 2·base − 2 (the two pivots aren't repeated)
  })

  it('symmetric=false leaves the sett unmirrored', () => {
    const sett: TartanSett = { stripes: [{ color: A, count: 2 }, { color: B, count: 2 }], symmetric: false }
    expect(expandSett(sett)).toEqual([A, A, B, B])
  })

  it('rounds/guards thread counts and short setts', () => {
    expect(expandSett({ stripes: [{ color: A, count: 1.6 }], symmetric: false })).toEqual([A, A])
    expect(expandSett({ stripes: [{ color: A, count: 0 }] })).toEqual([]) // nothing to mirror
  })
})

describe('tartan sett — tartanColorAt (2/2 twill)', () => {
  const threads = [A, B, C, D]

  it('shows the warp on the diagonal (i === j → warp thread i)', () => {
    for (let i = 0; i < 4; i++) expect(tartanColorAt(threads, i, i)).toBe(threads[i])
  })

  it('follows the 2/2 twill float: warp on top where (i − j) mod 4 < 2, else weft', () => {
    // i=0: j=0 → warp(A), j=1 → (−1 mod4=3) weft(threads[1]=B), j=2 → (−2 mod4=2) weft(C), j=3 → (−3 mod4=1) warp(A)
    expect(tartanColorAt(threads, 0, 0)).toBe(A) // warp
    expect(tartanColorAt(threads, 0, 1)).toBe(B) // weft
    expect(tartanColorAt(threads, 0, 2)).toBe(C) // weft
    expect(tartanColorAt(threads, 0, 3)).toBe(A) // warp
  })

  it('is translation-invariant by one sett length in both directions (a true repeat)', () => {
    const n = threads.length
    for (const [i, j] of [[0, 0], [1, 3], [2, 1]] as const) {
      expect(tartanColorAt(threads, i + n, j + n)).toBe(tartanColorAt(threads, i, j))
    }
  })

  it('a single-colour sett is solid everywhere (no twill artefacts)', () => {
    const solid = [A, A, A, A]
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) expect(tartanColorAt(solid, i, j)).toBe(A)
  })

  it('handles an empty thread list without throwing', () => {
    expect(tartanColorAt([], 3, 5)).toBe(0)
  })
})

describe('tartan presets', () => {
  it('every kind has a non-empty sett with positive thread counts + valid colours', () => {
    for (const k of TARTAN_KINDS) {
      const sett = TARTAN_SETTS[k]
      expect(sett.stripes.length).toBeGreaterThan(0)
      for (const st of sett.stripes) {
        expect(st.count).toBeGreaterThan(0)
        expect(st.color).toBeGreaterThanOrEqual(0)
        expect(st.color).toBeLessThanOrEqual(0xffffff)
      }
      expect(expandSett(sett).length).toBeGreaterThan(8) // a usable repeat
    }
  })

  it('registers the added setts (MacLeod, buffalo plaid, Prince of Wales, gingham)', () => {
    for (const k of ['macleod', 'buffalo-plaid', 'prince-of-wales', 'gingham'] as TartanKind[]) {
      expect(TARTAN_KINDS).toContain(k)
      expect(TARTAN_SETTS[k].stripes.length).toBeGreaterThan(0)
      expect(expandSett(TARTAN_SETTS[k]).length).toBeGreaterThan(8)
    }
    // buffalo plaid + gingham are simple two-colour even checks
    expect(new Set(TARTAN_SETTS['buffalo-plaid'].stripes.map((st) => st.color)).size).toBe(2)
    expect(new Set(TARTAN_SETTS.gingham.stripes.map((st) => st.color)).size).toBe(2)
  })
})
