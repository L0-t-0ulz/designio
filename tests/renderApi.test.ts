import { describe, it, expect } from 'vitest'
import { renderJobToQuery, renderJobWait, parseRenderManifest } from '../src/renderer/export/renderApi'

describe('headless render API', () => {
  it('builds a deterministic deep-link query, always start=0', () => {
    const q = renderJobToQuery({ out: 'a.png', garment: 'dress', fabric: 'satin', light: 'runway' })
    expect(q.startsWith('start=0')).toBe(true)
    expect(q).toContain('garment=dress')
    expect(q).toContain('fabric=satin')
    expect(q).toContain('light=runway')
  })

  it('encodes colour as 6-hex, maps view + finish', () => {
    const q = renderJobToQuery({ out: 'a.png', color: 0x1a2b3c, view: 'pattern', finish: 'sparkle=sequins' })
    expect(q).toContain('color=1a2b3c')
    expect(q).toContain('view=pattern')
    expect(q).toContain('sparkle=sequins')
  })

  it('renderJobWait picks sane defaults + clamps overrides', () => {
    expect(renderJobWait({ out: 'a.png' })).toBe(6000)
    expect(renderJobWait({ out: 'a.png', view: 'pattern' })).toBe(4500)
    expect(renderJobWait({ out: 'a.png', anim: 'turn' })).toBe(3500)
    expect(renderJobWait({ out: 'a.png', waitMs: 999999 })).toBe(90000) // clamped
    expect(renderJobWait({ out: 'a.png', waitMs: 10 })).toBe(500) // floored
  })

  it('parseRenderManifest validates + normalises jobs', () => {
    const m = parseRenderManifest({ jobs: [{ out: 'x.png', garment: 'gown', view: 'bogus', junk: 1 }] })
    expect(m.jobs).toHaveLength(1)
    expect(m.jobs[0].out).toBe('x.png')
    expect(m.jobs[0].garment).toBe('gown')
    expect(m.jobs[0].view).toBeUndefined() // bogus dropped
    expect('junk' in m.jobs[0]).toBe(false)
  })

  it('rejects a manifest with no jobs array or a bad out', () => {
    expect(() => parseRenderManifest({})).toThrow(/jobs/)
    expect(() => parseRenderManifest({ jobs: [{ out: 'x.jpg' }] })).toThrow(/\.png/)
    expect(() => parseRenderManifest({ jobs: [{ garment: 'x' }] })).toThrow(/out/)
  })
})
