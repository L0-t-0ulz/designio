import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { fitEase } from '../src/renderer/export/ease'
import type { TubeSpec } from '../src/renderer/cloth/Garment'

const M = buildMannequin().measurements
const TAU = Math.PI * 2
const circ = (r: number): number => TAU * r * 100

// A body tube straddling shoulder → below the hip by default; override per case.
const spec = (o: Partial<TubeSpec>): TubeSpec =>
  ({ rings: 10, radial: 20, topY: M.shoulderY, bottomY: 0.4, radiusTop: 0.16, radiusBottom: 0.2, ...o } as TubeSpec)

const ease = (s: Partial<TubeSpec>) => fitEase({ body: [spec(s)] }, M)
const row = (rows: ReturnType<typeof ease>, label: string) => rows.find((r) => r.label === label)

describe('fit ease (garment − body girth) — chest + waist', () => {
  it('a cinched shoulder-anchored dress reports chest + waist (no hip)', () => {
    const rows = ease({ neckline: 'scoop', radiusWaist: M.waistR + 0.01 })
    expect(rows.map((r) => r.label)).toEqual(['Chest', 'Waist'])
  })

  it('chest ease = garment top girth − body chest girth (and adds up)', () => {
    const chest = row(ease({ neckline: 'crew', radiusTop: M.chestR + 0.02 }), 'Chest')!
    expect(Math.abs(chest.easeCm - circ(0.02))).toBeLessThan(0.2) // ≈ 12.6 cm
    expect(chest.easeCm).toBeCloseTo(chest.garmentCm - chest.bodyCm, 1)
  })

  it('a cinched waist eases less than the chest', () => {
    const rows = ease({ neckline: 'scoop', radiusTop: M.chestR + 0.03, radiusWaist: M.waistR + 0.005 })
    expect(row(rows, 'Waist')!.easeCm).toBeLessThan(row(rows, 'Chest')!.easeCm)
  })

  it('a garment tighter than the body reads as negative ease', () => {
    const chest = row(ease({ neckline: 'crew', radiusTop: M.chestR - 0.01 }), 'Chest')!
    expect(chest.easeCm).toBeLessThan(0)
    expect(chest.easeCm).toBeCloseTo(chest.garmentCm - chest.bodyCm, 1)
  })

  it('a crop top (hem above the waist) reports chest only', () => {
    const rows = ease({ neckline: 'crew', radiusWaist: M.waistR, bottomY: M.waistY + 0.05 })
    expect(rows.map((r) => r.label)).toEqual(['Chest'])
  })

  it('a boxy top with no cinch reports chest only — waist is not drafted', () => {
    // shoulder-anchored, hem below the waist, but no radiusWaist → no drafted waist
    const rows = ease({ neckline: 'crew', bottomY: M.waistY - 0.1 })
    expect(rows.map((r) => r.label)).toEqual(['Chest'])
  })

  it('a waist-anchored skirt reports waist from its waistband, no chest', () => {
    const rows = ease({ neckline: undefined, topY: M.waistY, bottomY: 0.5, radiusTop: M.waistR + 0.02 })
    expect(rows.map((r) => r.label)).toEqual(['Waist'])
    expect(Math.abs(row(rows, 'Waist')!.easeCm - circ(0.02))).toBeLessThan(0.2)
  })

  it('leg-only garments (no body tube) report nothing', () => {
    expect(fitEase({ body: [] }, M)).toEqual([])
  })
})
