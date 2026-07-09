import { describe, it, expect } from 'vitest'
import { parsePatternDXF, patternSummary, importedPatternToSVG } from '../src/renderer/export/patternImport'
import { patternToDXF } from '../src/renderer/export/patternExport'
import { garmentPatternDXF } from '../src/renderer/export/garmentPattern'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'
import { getGarment } from '../src/renderer/garments/registry'
import { gradeParams, defaultLayer } from '../src/renderer/studio/document'

describe('import a flat pattern (DXF) — round-trips the export', () => {
  it('parses the sewn-top DXF back into its cut + sew rectangles', () => {
    const dxf = patternToDXF({ bust: 0.9, length: 0.6 })
    const p = parsePatternDXF(dxf)
    expect(p.panels.length).toBeGreaterThan(0)
    expect(p.panels.every((pl) => pl.layer === 'PATTERN')).toBe(true)
    expect(p.panels.every((pl) => pl.closed)).toBe(true)
    expect(p.panels.every((pl) => pl.points.length === 4)).toBe(true) // rectangles
    expect(p.bounds.maxX).toBeGreaterThan(p.bounds.minX)
  })

  it('parses the real per-garment DXF, preserving the CUT + SEW layers', () => {
    const mann = buildMannequin()
    const def = getGarment('long-sleeve')
    const dxf = garmentPatternDXF(def, gradeParams(defaultLayer('long-sleeve')), mann.measurements, mann.colliders)
    const p = parsePatternDXF(dxf)
    const layers = new Set(p.panels.map((pl) => pl.layer))
    expect(layers.has('CUT')).toBe(true)
    expect(layers.has('SEW')).toBe(true)
    // a cut panel encloses its sew panel → strictly more than one polyline
    expect(p.panels.length).toBeGreaterThan(1)
  })

  it('an empty / entity-less DXF parses to zero panels (no crash)', () => {
    const empty = parsePatternDXF('0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF')
    expect(empty.panels).toHaveLength(0)
    expect(empty.bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 })
    expect(patternSummary(empty)).toBe('no panels found')
  })

  it('tolerates CRLF line endings + trailing blank lines', () => {
    const dxf = patternToDXF({ bust: 0.9, length: 0.6 }).replace(/\n/g, '\r\n') + '\r\n'
    expect(parsePatternDXF(dxf).panels.length).toBeGreaterThan(0)
  })

  it('summary + SVG reflect the parsed geometry', () => {
    const p = parsePatternDXF(patternToDXF({ bust: 0.9, length: 0.6 }))
    expect(patternSummary(p)).toMatch(/panel.*cm/)
    const svg = importedPatternToSVG(p)
    expect(svg).toContain('<svg')
    expect(svg).toMatch(/polygon|polyline/)
  })
})
