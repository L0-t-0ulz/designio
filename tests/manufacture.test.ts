import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentMetrics } from '../src/renderer/export/garmentMetrics'
import { pomTable } from '../src/renderer/export/pom'
import { garmentToPanels } from '../src/renderer/export/garmentPattern'
import { nestMarker } from '../src/renderer/export/marker'
import { defaultLayer } from '../src/renderer/studio/document'
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
        pom: pomTable(def, defaultLayer('dress'), mann.measurements, mann.colliders),
        marker: nestMarker(garmentToPanels(def, params, mann.measurements, mann.colliders).panels, 140),
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
    expect(html).toContain('Marker (@ 140 cm)') // the nested-marker yield + efficiency
    expect(html).toContain('efficient') // the marker preview heading
    expect(html).toContain('Thread (est.') // thread consumption in the BOM
    expect(html).toContain('<svg>') // the embedded flat pattern
    expect(html).toContain('size M')
    expect(html).toContain('TR-2050 Terracotta') // production colour reference in the BOM
    expect(html).toContain('Fit ease') // the fit-ease table
    expect(html).toContain('points of measure') // the graded POM table
  })

  it('builds a JSON manifest with measurements + yardage + colour reference', () => {
    const json = JSON.parse(manufactureJSON(bundle()))
    expect(json.garments).toHaveLength(1)
    expect(json.garments[0].size).toBe('M')
    expect(json.garments[0].measurements_cm).toHaveProperty('Chest')
    expect(json.garments[0].fit_ease_cm).toHaveProperty('Chest') // fit ease per point
    expect(json.garments[0].points_of_measure.sizes).toContain('XL') // graded POM
    expect(json.garments[0].points_of_measure.rows[0]).toHaveProperty('point')
    expect(json.garments[0].yardage_m).toBeGreaterThan(0)
    expect(json.garments[0].marker_efficiency_pct).toBeGreaterThan(0) // realistic nested yield
    expect(json.garments[0].marker_efficiency_pct).toBeLessThanOrEqual(100)
    expect(json.garments[0].thread_m).toBeGreaterThan(0) // thread consumption
    expect(json.garments[0].color_ref).toBe('TR-2050 Terracotta')
  })
})
