import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentTubeSpecs } from '../src/renderer/garments/factory'
import { pocketPlacements } from '../src/renderer/garments/decor'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'

const mann = buildMannequin()
const M = mann.measurements
const C = mann.colliders
const body = (id: string, over = {}) =>
  garmentTubeSpecs(getGarment(id), { ...DEFAULT_PARAMS, ...getGarment(id).defaults, ...over }, M)[0]

describe('patch pockets + hems', () => {
  it('a top gets one chest pocket; trousers + skirts get two hip pockets', () => {
    expect(pocketPlacements(getGarment('top'), M)).toHaveLength(1)
    expect(pocketPlacements(getGarment('pants'), M)).toHaveLength(2)
    expect(pocketPlacements(getGarment('skirt'), M)).toHaveLength(2)
  })

  it('chest pocket sits in front of the chest, hip pockets are mirrored', () => {
    const chest = pocketPlacements(getGarment('top'), M)[0]
    expect(chest.z).toBeGreaterThan(M.chestR) // in front of the body
    const [l, r] = pocketPlacements(getGarment('pants'), M)
    expect(Math.sign(l.x)).toBe(-Math.sign(r.x))
  })

  it('a rolled hem shortens the garment', () => {
    expect(body('dress', { hem: true }).bottomY).toBeGreaterThan(body('dress', { hem: false }).bottomY)
  })

  it('the pattern adds a Pocket panel + notes pocket / rolled hem', () => {
    const res = garmentToPanels(
      getGarment('top'),
      { ...DEFAULT_PARAMS, ...getGarment('top').defaults, pocket: true, hem: true },
      M,
      C
    )
    expect(res.panels.some((p) => p.name === 'Pocket')).toBe(true)
    expect(res.detail).toContain('pocket')
    expect(res.detail).toContain('rolled hem')
  })
})
