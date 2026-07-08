import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'
import { manufactureHTML, manufactureJSON, type ManufactureBundle } from '../src/renderer/export/manufacture'

const mann = buildMannequin()
const bundle = (): ManufactureBundle => {
  const def = getGarment('dress')
  const params = { ...DEFAULT_PARAMS, ...def.defaults }
  return {
    title: 'Test outfit',
    body: { bodyType: 'female', height: 1, build: 1, bust: 1, waist: 1, hips: 1 },
    layers: [
      {
        name: def.name,
        size: 'M',
        fabricName: 'Satin',
        gsm: 120,
        color: 0xc85a54,
        colorRef: 'TR-2050 Terracotta',
        metrics: garmentMetrics(def.name, 'M', def, params, mann.measurements, mann.colliders),
        patternSVG: '<svg><rect/></svg>'
      }
    ]
  }
}

describe('manufacturing export', () => {
  it('builds a printable HTML spec pack with the measurements + BOM + pattern', () => {
    const html = manufactureHTML(bundle())
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Spec sheet')
    expect(html).toContain('Bill of materials')
    expect(html).toContain('Yardage')
    expect(html).toContain('<svg>') // the embedded flat pattern
    expect(html).toContain('size M')
    expect(html).toContain('TR-2050 Terracotta') // production colour reference in the BOM
  })

  it('builds a JSON manifest with measurements + yardage + colour reference', () => {
    const json = JSON.parse(manufactureJSON(bundle()))
    expect(json.garments).toHaveLength(1)
    expect(json.garments[0].size).toBe('M')
    expect(json.garments[0].measurements_cm).toHaveProperty('Chest')
    expect(json.garments[0].yardage_m).toBeGreaterThan(0)
    expect(json.garments[0].color_ref).toBe('TR-2050 Terracotta')
  })
})
