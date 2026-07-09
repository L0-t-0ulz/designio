import { describe, it, expect } from 'vitest'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { DEFAULT_PARAMS, type GarmentType } from '../src/renderer/garment/templates'
import { getGarment } from '../src/renderer/garments/registry'
import { garmentToPanels, type PatternPanel } from '../src/renderer/export/garmentPattern'
import { nestMarker, markerSVG } from '../src/renderer/export/marker'

const mann = buildMannequin()
const panelsFor = (id: GarmentType): PatternPanel[] =>
  garmentToPanels(getGarment(id), { ...DEFAULT_PARAMS, ...getGarment(id).defaults }, mann.measurements, mann.colliders).panels

// A couple of hand-made panels for exact-math checks.
const rect = (name: string, wmm: number, hmm: number, cut = 1): PatternPanel => ({
  name,
  cut,
  outline: [
    { x: 0, y: 0 },
    { x: wmm, y: 0 },
    { x: wmm, y: hmm },
    { x: 0, y: hmm }
  ],
  grain: [
    { x: 0, y: 0 },
    { x: 0, y: hmm }
  ],
  notches: [],
  wmm,
  hmm
})

describe('marker making (fabric nest)', () => {
  it('places every panel copy (× cut) into the marker', () => {
    const panels = panelsFor('dress')
    const totalCopies = panels.reduce((n, p) => n + Math.max(1, p.cut), 0)
    const m = nestMarker(panels, 140)
    expect(m.placements).toHaveLength(totalCopies)
  })

  it('efficiency is in (0, 1] and the marker is at least the perfect-nest length', () => {
    const m = nestMarker(panelsFor('dress'), 140)
    expect(m.efficiency).toBeGreaterThan(0)
    expect(m.efficiency).toBeLessThanOrEqual(1)
    // length can never be shorter than area ÷ width (the 100%-efficient bound)
    expect(m.lengthCm).toBeGreaterThanOrEqual(m.panelAreaCm2 / m.widthCm - 1e-6)
  })

  it('two side-by-side pieces share a row; a wider fabric never needs more length', () => {
    // two 60×100 cm rects: fit side by side across 140 cm (+gap) → one ~100 cm row
    const two = [rect('A', 600, 1000), rect('B', 600, 1000)]
    const m = nestMarker(two, 140, 1)
    expect(m.lengthCm).toBeCloseTo(100, 5) // one shelf, height 100 cm
    expect(m.placements[1].x).toBeGreaterThan(m.placements[0].x) // side by side
  })

  it('narrow fabric forces pieces to stack → a longer marker', () => {
    const two = [rect('A', 600, 1000), rect('B', 600, 1000)]
    const wide = nestMarker(two, 140, 1).lengthCm
    const narrow = nestMarker(two, 70, 1).lengthCm // only one 60-wide piece fits per row
    expect(narrow).toBeGreaterThan(wide)
  })

  it('more cut copies never shortens the marker', () => {
    const panels = panelsFor('skirt')
    const one = nestMarker(panels, 140).lengthCm
    const doubled = nestMarker(panels.map((p) => ({ ...p, cut: p.cut * 2 })), 140).lengthCm
    expect(doubled).toBeGreaterThanOrEqual(one)
  })

  it('rotates a wide-short panel to nest it portrait', () => {
    const m = nestMarker([rect('wide', 1200, 300)], 140) // 120×30 cm → portrait 30×120
    expect(m.placements[0].rot).toBe(true)
    expect(m.placements[0].w).toBeCloseTo(30, 5)
    expect(m.placements[0].h).toBeCloseTo(120, 5)
  })

  it('renders a preview SVG spanning the fabric width', () => {
    const svg = markerSVG(nestMarker(panelsFor('dress'), 140))
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox="0 0 140')
  })
})
