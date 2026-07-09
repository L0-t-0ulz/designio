import { describe, it, expect } from 'vitest'
import { careLabel, fibreContent, fibreClass, careInstructions } from '../src/renderer/export/careLabel'
import { getFabric, FABRIC_LIBRARY } from '../src/renderer/fabric/FabricLibrary'
import { manufactureHTML, manufactureJSON, type ManufactureBundle } from '../src/renderer/export/manufacture'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'

describe('care label & content generator', () => {
  it('derives sensible fibre content per fabric', () => {
    expect(fibreContent(getFabric('denim'))).toBe('100% Cotton')
    expect(fibreContent(getFabric('wool-flannel'))).toBe('100% Wool')
    expect(fibreContent(getFabric('silk-charmeuse'))).toBe('100% Silk')
    expect(fibreContent(getFabric('leather'))).toBe('Genuine leather')
    // stretchy knits blend in elastane
    expect(fibreContent(getFabric('jersey-knit'))).toBe('95% Cotton, 5% Elastane')
    expect(fibreContent(getFabric('spandex'))).toContain('Elastane')
  })

  it('every library fabric produces a fibre class + five care lines', () => {
    for (const f of FABRIC_LIBRARY) {
      const label = careLabel(f)
      expect(label.fibre.length).toBeGreaterThan(0)
      expect(label.care).toHaveLength(5)
      expect(label.care.every((c) => c.length > 0)).toBe(true)
    }
  })

  it('care matches the fibre — silk dry-cleans, leather never washes, cotton machine-washes', () => {
    expect(fibreClass(getFabric('satin'))).toBe('silk')
    expect(careInstructions(getFabric('satin')).professional).toMatch(/dry clean/i)
    expect(careInstructions(getFabric('leather')).wash).toMatch(/do not wash/i)
    expect(careInstructions(getFabric('cotton-poplin')).wash).toMatch(/machine wash/i)
    expect(careInstructions(getFabric('wool-flannel')).wash).toMatch(/hand wash/i)
  })

  it('the manufacturing pack renders the care label (HTML + JSON)', () => {
    const mann = buildMannequin()
    const def = getGarment('long-sleeve')
    const fabric = getFabric('denim')
    const label = careLabel(fabric)
    const bundle: ManufactureBundle = {
      title: 'T',
      body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
      layers: [
        {
          name: def.name,
          size: 'M',
          fabricName: fabric.name,
          gsm: fabric.gsm,
          color: 0x3b5b82,
          fibre: label.fibre,
          care: label.care,
          seam: 12,
          metrics: garmentMetrics(def.name, 'M', def, gradeParams(defaultLayer('long-sleeve')), mann.measurements, mann.colliders),
          patternSVG: '<svg/>'
        }
      ]
    }
    const html = manufactureHTML(bundle)
    expect(html).toContain('Care &amp; content')
    expect(html).toContain('100% Cotton')
    expect(html).toContain('Machine wash warm')
    const json = JSON.parse(manufactureJSON(bundle))
    expect(json.garments[0].fibre_content).toBe('100% Cotton')
    expect(json.garments[0].care).toHaveLength(5)
  })
})
