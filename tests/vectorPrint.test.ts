import { describe, it, expect } from 'vitest'
import { vectorToSVG, starPoints, DEMO_VECTOR, type VShape } from '../src/renderer/ui/vectorPrint'

describe('in-app vector print editor', () => {
  it('serialises each shape kind into valid SVG', () => {
    const shapes: VShape[] = [
      { kind: 'rect', x: 0.5, y: 0.5, w: 0.4, h: 0.2, color: 0xff0000, rotation: 0 },
      { kind: 'circle', x: 0.3, y: 0.3, w: 0.3, h: 0.3, color: 0x00ff00, rotation: 0 },
      { kind: 'line', x: 0.5, y: 0.8, w: 0.6, h: 3, color: 0x0000ff, rotation: 0 },
      { kind: 'star', x: 0.5, y: 0.5, w: 0.4, h: 0.4, color: 0xffcc00, rotation: 0 },
      { kind: 'text', x: 0.5, y: 0.9, w: 0.5, h: 0.1, color: 0x111111, rotation: 0, text: 'HI' }
    ]
    const svg = vectorToSVG(shapes, 200)
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('<rect')
    expect(svg).toContain('<ellipse') // circle → ellipse (supports oval)
    expect(svg).toContain('<line')
    expect(svg).toContain('<polygon') // star
    expect(svg).toContain('>HI</text>')
    expect(svg).toContain('#ff0000')
  })

  it('escapes text so a stray < cannot break the graphic', () => {
    const svg = vectorToSVG([{ kind: 'text', x: 0.5, y: 0.5, w: 0.5, h: 0.1, color: 0, rotation: 0, text: '<x>' }])
    expect(svg).toContain('&lt;x&gt;')
    expect(svg).not.toContain('>><x><')
  })

  it('applies rotation only when non-zero', () => {
    const spun = vectorToSVG([{ kind: 'rect', x: 0.5, y: 0.5, w: 0.4, h: 0.4, color: 0, rotation: 30 }])
    expect(spun).toContain('rotate(30')
    const flat = vectorToSVG([{ kind: 'rect', x: 0.5, y: 0.5, w: 0.4, h: 0.4, color: 0, rotation: 0 }])
    expect(flat).not.toContain('rotate(')
  })

  it('a star has the right number of vertices (outer + inner per point)', () => {
    const pts = starPoints(100, 100, 50, 50, 5).split(' ')
    expect(pts).toHaveLength(10) // 5 points → 10 vertices
  })

  it('the demo composition is a valid multi-shape graphic', () => {
    expect(DEMO_VECTOR.length).toBeGreaterThanOrEqual(3)
    const svg = vectorToSVG(DEMO_VECTOR)
    expect(svg).toContain('<polygon') // the star
    expect(svg).toContain('STUDIO')
  })
})
