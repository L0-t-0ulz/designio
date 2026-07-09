import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, SIZES, sizeEase } from '../src/renderer/studio/document'
import { pomTable } from '../src/renderer/export/pom'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders
const sheet = (id: Parameters<typeof getGarment>[0]) => pomTable(getGarment(id), defaultLayer(id), M, C)
const row = (id: Parameters<typeof getGarment>[0], label: string) => sheet(id).rows.find((r) => r.label === label)

describe('points of measure (graded spec)', () => {
  it('covers the whole size run in order', () => {
    expect(sheet('dress').sizes).toEqual(SIZES)
    expect(SIZES).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
  })

  it('carries the base spec rows, each measured at every size', () => {
    const chest = row('dress', 'Chest')!
    expect(Object.keys(chest.bySize).sort()).toEqual([...SIZES].sort())
    for (const s of SIZES) expect(chest.bySize[s]).toBeGreaterThan(0)
  })

  it('girth grades up monotonically across the run', () => {
    const chest = row('dress', 'Chest')!
    for (let i = 1; i < SIZES.length; i++) {
      expect(chest.bySize[SIZES[i]]).toBeGreaterThan(chest.bySize[SIZES[i - 1]])
    }
    // one size step ≈ 2π·(sizeEase step)·100 cm on the circumference
    const stepML = chest.bySize.L - chest.bySize.M
    expect(stepML).toBeCloseTo(2 * Math.PI * (sizeEase('L') - sizeEase('M')) * 100, 1)
  })

  it('length does not grade (the app grades girth only) — constant across sizes', () => {
    const len = row('dress', 'Length')!
    for (const s of SIZES) expect(len.bySize[s]).toBeCloseTo(len.bySize.M, 5)
  })

  it('tolerances: girth ±1.0 cm, length/inseam/sleeve ±1.5 cm', () => {
    expect(row('dress', 'Chest')!.tolCm).toBe(1.0)
    expect(row('dress', 'Length')!.tolCm).toBe(1.5)
    expect(row('pants', 'Inseam')!.tolCm).toBe(1.5)
    expect(row('top', 'Sleeve length')!.tolCm).toBe(1.5)
  })
})
