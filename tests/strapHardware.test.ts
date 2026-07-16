import { describe, it, expect } from 'vitest'
import { STRAP_HARDWARE, hardwareForWidth, pickBuckle, beltHardwareBOM } from '../src/renderer/garments/strapHardware'

describe('strap & buckle hardware library', () => {
  it('every entry has an id, name, category, width + note', () => {
    expect(new Set(STRAP_HARDWARE.map((h) => h.id)).size).toBe(STRAP_HARDWARE.length)
    for (const h of STRAP_HARDWARE) {
      expect(h.name.length).toBeGreaterThan(0)
      expect(h.widthMm).toBeGreaterThan(0)
      expect(h.note.length).toBeGreaterThan(0)
    }
  })

  it('picks hardware of a category fitting a strap width (nearest at or above)', () => {
    expect(hardwareForWidth(20, 'buckle').widthMm).toBe(20)
    expect(hardwareForWidth(22, 'buckle').widthMm).toBe(25) // rounds up to the next buckle that fits
    expect(hardwareForWidth(31, 'buckle').widthMm).toBe(38)
    expect(hardwareForWidth(999, 'buckle').category).toBe('buckle') // clamps to the widest
    expect(hardwareForWidth(20, 'ring').category).toBe('ring')
  })

  it('picks a buckle sized for the strap', () => {
    expect(pickBuckle(20).category).toBe('buckle')
    expect(pickBuckle(40).widthMm).toBeGreaterThanOrEqual(40)
  })

  it('the belt BOM lists a fitted buckle + a keeper loop', () => {
    const bom = beltHardwareBOM(40)
    expect(bom).toHaveLength(2)
    expect(bom[0].label.toLowerCase()).toContain('buckle')
    expect(bom[0].label).toContain('40 mm')
    expect(bom[1].label).toContain('keeper')
  })
})
