import { describe, it, expect } from 'vitest'
import { SAMPLE_STAGES, sampleOrderHTML, sampleTotal } from '../src/renderer/export/sampleOrder'

describe('sample order', () => {
  it('sampleTotal = colourways × base qty, clamped at zero', () => {
    expect(sampleTotal(3)).toBe(3)
    expect(sampleTotal(2, 2)).toBe(4)
    expect(sampleTotal(-1, 5)).toBe(0)
  })

  it('renders the colourway × size grid with the base-size qty pre-filled', () => {
    const html = sampleOrderHTML({
      name: 'Hoodie',
      styleRef: 'FW26-009',
      fabricName: 'French terry',
      fibre: '80% cotton, 20% polyester',
      sizes: ['S', 'M', 'L'],
      colourways: [
        { hex: '#1a1a22', label: 'TR-9001 Ink' },
        { hex: '#8a1538', label: 'TR-1204 Garnet' }
      ],
      baseSize: 'M'
    })
    expect(html).toContain('FW26-009')
    expect(html).toContain('TR-9001 Ink')
    expect(html).toContain('background:#8a1538')
    // 2 colourways × 3 sizes = 6 qty cells; the M column pre-fills 1, others blank
    expect((html.match(/<td class="q">1<\/td>/g) ?? []).length).toBe(2)
    expect((html.match(/<td class="q"><\/td>/g) ?? []).length).toBe(4)
    for (const stage of SAMPLE_STAGES) expect(html).toContain(stage.split(' ')[0]) // Proto/SMS/PPS checkboxes
    expect(html).toContain('Target dates')
    expect(html).toContain('Ship to')
    expect(html).toContain('@page')
  })

  it('escapes untrusted strings', () => {
    const html = sampleOrderHTML({
      name: '<script>x</script>',
      styleRef: 's',
      fabricName: 'f',
      fibre: 'fi',
      sizes: ['M'],
      colourways: [{ hex: '#fff', label: '<img>' }],
      baseSize: 'M'
    })
    expect(html).not.toContain('<script>x')
    expect(html).not.toContain('<img>')
    expect(html).toContain('&lt;script&gt;')
  })
})
