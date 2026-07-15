import { describe, it, expect } from 'vitest'
import { registrationMarks, separationsByPart, separationsHTML, SHEET_W, SHEET_H } from '../src/renderer/export/separations'
import type { Print } from '../src/renderer/start/design'

const mkPrint = (over: Partial<Print>): Print => ({
  id: 'p',
  kind: 'text',
  image: null,
  text: 'LOGO',
  color: 0xff3366,
  x: 0.25,
  y: 0.4,
  scale: 0.3,
  rotation: 0,
  part: 'body',
  style: 'flat',
  ...over
})

describe('print separations & registration', () => {
  it('gives three registration targets inside the sheet, all distinct', () => {
    const m = registrationMarks()
    expect(m).toHaveLength(3)
    for (const p of m) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(SHEET_W)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(SHEET_H)
    }
    // top-left, top-right (same y, different x), bottom-centre (lower)
    expect(m[0].y).toBe(m[1].y)
    expect(m[0].x).toBeLessThan(m[1].x)
    expect(m[2].y).toBeGreaterThan(m[0].y)
  })

  it('groups prints by the part they print on', () => {
    const groups = separationsByPart([mkPrint({ part: 'body' }), mkPrint({ part: 'sleeves' }), mkPrint({ part: 'body' })])
    expect(groups).toHaveLength(2)
    const body = groups.find((g) => g.part === 'body')!
    expect(body.prints).toHaveLength(2)
    expect(groups.find((g) => g.part === 'sleeves')!.prints).toHaveLength(1)
  })

  it('renders one screen per print, every screen sharing the same registration marks', () => {
    const html = separationsHTML([mkPrint({ color: 0xff0000, text: 'A' }), mkPrint({ color: 0x00ff00, text: 'B' })], 'Tee')
    expect(html).toContain('<!doctype html>')
    // two screens for the two body prints
    expect((html.match(/Screen \d/g) ?? []).length).toBe(2)
    expect(html).toContain('#ff0000')
    expect(html).toContain('#00ff00')
    // the three registration crosshairs appear on each screen (3 marks × 2 screens = 6 circles)
    const marks = registrationMarks()
    const firstMarkTag = `cx="${marks[0].x}" cy="${marks[0].y}"`
    expect((html.match(new RegExp(firstMarkTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length).toBe(2)
  })

  it('escapes print text so a stray < cannot break the sheet', () => {
    const html = separationsHTML([mkPrint({ text: '<x>' })])
    expect(html).toContain('&lt;x&gt;')
    expect(html).not.toContain('>“<x>”<')
  })

  it('produces a valid, friendly sheet when there are no prints', () => {
    const html = separationsHTML([], 'Blank')
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('no prints')
    expect(html).not.toContain('Screen 1')
  })
})
