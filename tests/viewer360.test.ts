import { describe, it, expect } from 'vitest'
import { viewer360HTML } from '../src/renderer/export/viewer360'

const frames = ['data:image/png;base64,AAA', 'data:image/png;base64,BBB', 'data:image/png;base64,CCC']

describe('360° product viewer (standalone HTML)', () => {
  it('embeds every frame and shows frame 0 first', () => {
    const html = viewer360HTML('Silk gown', frames)
    for (const f of frames) expect(html).toContain(f)
    expect(html).toContain('const FRAMES = ' + JSON.stringify(frames))
    expect(html).toContain('show(0)')
  })

  it('is a complete self-contained document with drag + keyboard + autoplay', () => {
    const html = viewer360HTML('Gown', frames)
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('pointerdown')
    expect(html).toContain('pointermove')
    expect(html).toContain('ArrowLeft')
    expect(html).toContain('setInterval')
    expect(html).not.toContain('src=') // no external resources — everything inline
    expect(html).not.toContain('http')
  })

  it('escapes the title (no HTML injection)', () => {
    const html = viewer360HTML('<script>alert(1)</script>', frames)
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })

  it('rejects fewer than 2 frames', () => {
    expect(() => viewer360HTML('x', ['one'])).toThrow()
    expect(() => viewer360HTML('x', [])).toThrow()
  })
})
