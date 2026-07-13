import { describe, it, expect } from 'vitest'
import { garmentToPanels, panelsToDXF, panelsToSVG } from '../src/renderer/export/garmentPattern'
import { parsePatternDXF } from '../src/renderer/export/patternImport'
import { getGarment } from '../src/renderer/garments/registry'
import { defaultLayer, gradeParams } from '../src/renderer/studio/document'
import { buildMannequin } from '../src/renderer/avatar/Mannequin'

const mann = buildMannequin()
const res = () => garmentToPanels(getGarment('dress'), gradeParams(defaultLayer('dress')), mann.measurements, mann.colliders)
const NOTES = [
  { x: 120.5, y: 340.25, text: 'ease pocket here' },
  { x: 44, y: 90, text: 'topstitch 2x' }
]

describe('pattern annotations', () => {
  it('renders pinned notes in the SVG (escaped)', () => {
    const svg = panelsToSVG(res(), { notes: [{ x: 10, y: 20, text: '<b>&note' }] })
    expect(svg).toContain('&lt;b&gt;')
    expect(svg).toContain('&amp;note')
    expect(svg).toContain('cx="10.0"')
    expect(panelsToSVG(res())).not.toContain('cx="10.0"') // no notes by default
  })

  it('round-trips through DXF: TEXT on the ANNOTATION layer → parsed notes', () => {
    const dxf = panelsToDXF(res(), { notes: NOTES })
    expect(dxf).toContain('ANNOTATION')
    const back = parsePatternDXF(dxf)
    expect(back.notes).toHaveLength(2)
    expect(back.notes![0]).toEqual({ x: 120.5, y: 340.25, text: 'ease pocket here' })
    expect(back.notes![1].text).toBe('topstitch 2x')
    // panels still parse alongside the notes
    expect(back.panels.length).toBeGreaterThan(0)
    // a note-free export parses with no notes
    expect(parsePatternDXF(panelsToDXF(res())).notes).toBeUndefined()
  })
})
