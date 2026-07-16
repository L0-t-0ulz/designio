import { describe, it, expect } from 'vitest'
import { fleeceRevealZones, fleeceLiningRecipe, fleeceLiningNote } from '../src/renderer/fabric/fleeceLining'

describe('fleece lining reveal', () => {
  it('reveals at the open front, a fold-back lapel, a cuff + a hood', () => {
    const zones = fleeceRevealZones({ open: true, collar: true, collarStyle: 'notch', cuff: true, hood: true })
    expect(zones.map((z) => z.name)).toEqual(['Front placket', 'Lapel', 'Cuff', 'Hood'])
  })

  it('a fully-closed garment reveals nothing', () => {
    expect(fleeceRevealZones({})).toEqual([])
    expect(fleeceLiningNote(fleeceRevealZones({}))).toContain('no reveal')
  })

  it('only a fold-back collar style reveals the lapel underside', () => {
    expect(fleeceRevealZones({ collar: true, collarStyle: 'notch' }).some((z) => z.name === 'Lapel')).toBe(true)
    expect(fleeceRevealZones({ collar: true, collarStyle: 'shawl' }).some((z) => z.name === 'Lapel')).toBe(true)
    expect(fleeceRevealZones({ collar: true, collarStyle: 'band' }).some((z) => z.name === 'Lapel')).toBe(false) // a stand collar doesn't fold back
  })

  it('the lining material is soft, matte + high-loft', () => {
    const r = fleeceLiningRecipe()
    expect(r.roughness).toBeGreaterThan(0.8) // matte
    expect(r.pile).toBeGreaterThan(0) // fuzzy loft
  })

  it('notes the lining + where it shows', () => {
    const note = fleeceLiningNote(fleeceRevealZones({ open: true, cuff: true }))
    expect(note).toContain('fleece-lined')
    expect(note).toContain('open front')
    expect(note).toContain('cuff')
  })
})
