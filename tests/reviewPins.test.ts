import { describe, it, expect } from 'vitest'
import { ReviewStore } from '../src/renderer/studio/reviewPins'

describe('design comments & review pins', () => {
  it('adds open pins with an author and an optional 3D point', () => {
    const s = new ReviewStore()
    const p = s.add('Raise the hemline 2cm', 'Ada', { x: 0.1, y: 0.4, z: 0.2 })
    expect(p.status).toBe('open')
    expect(p.author).toBe('Ada')
    expect(p.point).toEqual({ x: 0.1, y: 0.4, z: 0.2 })
    expect(s.add('General note').point).toBeUndefined()
    expect(s.add('  ', '').author).toBe('You') // blank author defaults
  })

  it('resolves + reopens, tracking the open count', () => {
    const s = new ReviewStore()
    const a = s.add('a')
    const b = s.add('b')
    expect(s.openCount).toBe(2)
    s.resolve(a.id)
    expect(s.openCount).toBe(1)
    expect(s.pins.find((p) => p.id === a.id)!.status).toBe('resolved')
    s.reopen(a.id)
    expect(s.openCount).toBe(2)
    s.resolve(a.id)
    s.resolve(b.id)
    expect(s.openCount).toBe(0) // review complete
  })

  it('lists open pins before resolved, and filters by status', () => {
    const s = new ReviewStore()
    const a = s.add('a')
    s.add('b')
    s.resolve(a.id)
    const all = s.list()
    expect(all[0].status).toBe('open') // open pins float to the top
    expect(all[all.length - 1].status).toBe('resolved')
    expect(s.list('open').every((p) => p.status === 'open')).toBe(true)
    expect(s.list('resolved').map((p) => p.id)).toEqual([a.id])
  })

  it('removes a pin and clears the board', () => {
    const s = new ReviewStore()
    const a = s.add('a')
    s.add('b')
    s.remove(a.id)
    expect(s.pins.map((p) => p.id)).not.toContain(a.id)
    expect(s.isEmpty).toBe(false)
    s.clear()
    expect(s.isEmpty).toBe(true)
  })
})
