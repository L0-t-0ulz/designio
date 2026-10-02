import { describe, it, expect } from 'vitest'
import { CLOSURE_STYLES, closureMarks, resolveClosureStyle } from '../src/renderer/garment/closureStyles'

describe('closure styles', () => {
  it('resolves a missing choice to the garment default, then to buttons', () => {
    expect(resolveClosureStyle(undefined, 'zip')).toBe('zip')
    expect(resolveClosureStyle('frog', 'zip')).toBe('frog')
    expect(resolveClosureStyle(undefined, undefined)).toBe('button')
  })

  it('a button row sits on centre-front, and a zip has no marks', () => {
    const buttons = closureMarks('button', 5)
    expect(buttons).toHaveLength(5)
    expect(buttons.every((m) => m.x === 0 && m.kind === 'button')).toBe(true)
    expect(closureMarks('zip', 5)).toEqual([])
  })

  it('double-breasted is two staggered columns', () => {
    const marks = closureMarks('double-breasted', 4)
    expect(marks).toHaveLength(8)
    expect(marks.filter((m) => m.x < 0)).toHaveLength(4)
    expect(marks.filter((m) => m.x > 0)).toHaveLength(4)
    const left = marks.filter((m) => m.x < 0).map((m) => m.y)
    const right = marks.filter((m) => m.x > 0).map((m) => m.y)
    expect(right[0]).not.toBeCloseTo(left[0], 3)
  })

  it('a frog is a pair of knots, and a toggle is a shorter row of bars', () => {
    const frogs = closureMarks('frog', 4)
    expect(frogs.every((m) => m.kind === 'frog')).toBe(true)
    expect(frogs.filter((m) => m.x > 0)).toHaveLength(frogs.filter((m) => m.x < 0).length)
    const toggles = closureMarks('toggle', 6)
    expect(toggles.length).toBeLessThan(6)
    expect(toggles.every((m) => m.kind === 'toggle' && m.x === 0)).toBe(true)
  })

  it('names every style once', () => {
    expect(new Set(CLOSURE_STYLES).size).toBe(CLOSURE_STYLES.length)
  })
})
