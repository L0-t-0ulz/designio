import { describe, it, expect } from 'vitest'
import { careLabel, fibreContent, fibreClass, careInstructions, headwearMaterial, headwearCareLines } from '../src/renderer/export/careLabel'
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

  it('felted wools are labelled wool, not cotton (melton + boiled wool)', () => {
    expect(fibreContent(getFabric('melton'))).toBe('100% Wool')
    expect(fibreContent(getFabric('boiled-wool'))).toBe('100% Wool')
    expect(fibreContent(getFabric('worsted-wool'))).toBe('100% Wool')
  })
})

describe('headwear care labels', () => {
  it('classifies the headwear material by construction', () => {
    expect(headwearMaterial(getFabric('boiled-wool'))).toBe('felt') // fulled wool blocks a shape
    expect(headwearMaterial(getFabric('melton'))).toBe('felt')
    expect(headwearMaterial(getFabric('rib-knit'))).toBe('knit')
    expect(headwearMaterial(getFabric('cable-knit'))).toBe('knit')
    expect(headwearMaterial(getFabric('leather'))).toBe('coated')
    // straw isn't a library fabric yet, but the classifier is future-proof
    expect(headwearMaterial({ ...getFabric('linen'), id: 'straw' })).toBe('straw')
  })

  it('leaves the body-garment label untouched (no opts == no headwear)', () => {
    for (const f of FABRIC_LIBRARY) {
      expect(careLabel(f)).toEqual(careLabel(f, {})) // default is not headwear
      expect(careLabel(f).care).toHaveLength(5) // unchanged 5-line body label
    }
  })

  it('a knit beanie keeps its wash guidance but reshapes damp, never tumbles', () => {
    const beanie = careLabel(getFabric('rib-knit'), { headwear: true })
    const joined = beanie.care.join(' | ')
    expect(joined).toMatch(/machine wash/i) // washable knit — fibre wash line kept
    expect(joined).toMatch(/reshape while damp/i)
    expect(joined).toMatch(/dry flat/i)
    expect(joined).not.toMatch(/tumble dry/i) // the base tumble line is dropped (a hat stretches out)
    expect(beanie.care[beanie.care.length - 1]).toMatch(/dry clean|professional/i)
  })

  it('a felted/boiled-wool hat is steamed and reshaped, never washed', () => {
    const felt = careLabel(getFabric('boiled-wool'), { headwear: true })
    const joined = felt.care.join(' | ')
    expect(felt.fibre).toBe('100% Wool')
    expect(joined).toMatch(/do not wash/i)
    expect(joined).toMatch(/steam and reshape/i)
    expect(joined).toMatch(/hat form/i)
    expect(joined).not.toMatch(/machine wash|tumble/i) // no laundering — it would collapse the block
  })

  it('a leather/coated cap wipes clean, not washed', () => {
    const cap = careLabel(getFabric('leather'), { headwear: true })
    const joined = cap.care.join(' | ')
    expect(joined).toMatch(/wipe clean/i)
    expect(joined).toMatch(/do not machine wash/i) // a prohibition, not a wash instruction
    expect(joined).not.toMatch(/tumble/i)
    expect(cap.care.some((c) => /^machine wash/i.test(c))).toBe(false) // never instructed to wash it
  })

  it('headwearCareLines are non-empty for every library fabric', () => {
    for (const f of FABRIC_LIBRARY) {
      const lines = headwearCareLines(f)
      expect(lines.length).toBeGreaterThan(0)
      expect(lines.every((c) => c.length > 0)).toBe(true)
    }
  })
})
