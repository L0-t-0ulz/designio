import { describe, it, expect } from 'vitest'
import { resolvePrintPaint, PRINT_BLENDS } from '../src/renderer/start/design'

describe('resolvePrintPaint — print opacity + blend', () => {
  it('defaults to fully opaque, normal blend', () => {
    const r = resolvePrintPaint({})
    expect(r.alpha).toBe(1)
    expect(r.composite).toBe('source-over')
  })

  it('clamps opacity to 0…1', () => {
    expect(resolvePrintPaint({ opacity: 0.5 }).alpha).toBe(0.5)
    expect(resolvePrintPaint({ opacity: 1.8 }).alpha).toBe(1)
    expect(resolvePrintPaint({ opacity: -0.4 }).alpha).toBe(0)
  })

  it('maps each blend to its canvas composite op', () => {
    expect(resolvePrintPaint({ blend: 'normal' }).composite).toBe('source-over')
    expect(resolvePrintPaint({ blend: 'multiply' }).composite).toBe('multiply')
    expect(resolvePrintPaint({ blend: 'screen' }).composite).toBe('screen')
  })

  it('every listed blend resolves to a real, distinct-from-default-when-not-normal composite', () => {
    for (const b of PRINT_BLENDS) {
      const c = resolvePrintPaint({ blend: b }).composite
      expect(typeof c).toBe('string')
      if (b !== 'normal') expect(c).not.toBe('source-over')
    }
  })
})
