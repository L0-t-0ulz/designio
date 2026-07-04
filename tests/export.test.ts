import { describe, it, expect } from 'vitest'
import { patternToSVG, patternToDXF } from '../src/renderer/export/patternExport'
import { techpackHTML, techpackJSON, type TechpackData } from '../src/renderer/export/techpack'
import { MEASUREMENTS } from '../src/renderer/avatar/Mannequin'
import { getFabric } from '../src/renderer/fabric/FabricLibrary'

const dims = { bust: 1.0, length: 0.62 }

describe('pattern export', () => {
  it('emits a valid SVG with both panels', () => {
    const svg = patternToSVG(dims)
    expect(svg.startsWith('<?xml')).toBe(true)
    expect(svg).toContain('<svg')
    expect(svg).toContain('FRONT')
    expect(svg).toContain('BACK')
    // front panel width = bust/2 = 0.5 m = 500 mm
    expect(svg).toContain('500')
  })

  it('emits DXF with polyline entities', () => {
    const dxf = patternToDXF(dims)
    expect(dxf).toContain('SECTION')
    expect(dxf).toContain('ENTITIES')
    expect(dxf).toContain('LWPOLYLINE')
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
    // FRONT + BACK, each cut + sew line = 4 polylines
    expect((dxf.match(/LWPOLYLINE/g) ?? []).length).toBe(4)
  })
})

describe('tech-pack', () => {
  const data: TechpackData = {
    design: 'dress (template)',
    mode: 'templates',
    garment: { type: 'dress', length: 0.6 },
    fabric: getFabric('denim'),
    measurements: MEASUREMENTS
  }

  it('renders HTML with garment, fabric and measurements', () => {
    const html = techpackHTML(data)
    expect(html).toContain('<html')
    expect(html).toContain('Denim')
    expect(html).toContain('380 gsm')
    expect(html).toContain('Body measurements')
  })

  it('round-trips as JSON', () => {
    const parsed = JSON.parse(techpackJSON(data))
    expect(parsed.fabric.id).toBe('denim')
    expect(parsed.measurements.chestR).toBe(MEASUREMENTS.chestR)
  })
})
