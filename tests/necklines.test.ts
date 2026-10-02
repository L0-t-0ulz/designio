import { describe, it, expect } from 'vitest'
import { topEdge, type NecklineStyle, type TubeSpec } from '../src/renderer/cloth/Garment'

const base: TubeSpec = {
  rings: 8,
  radial: 16,
  topY: 1.35,
  bottomY: 0.9,
  radiusTop: 0.15,
  radiusBottom: 0.18,
  shoulderY: 1.42
}

const y = (neckline: NecklineStyle, angle: number): number => topEdge({ ...base, neckline }, angle)

describe('neckline library', () => {
  const mirror = (style: NecklineStyle): void => {
    expect(y(style, Math.PI / 4)).toBeCloseTo(y(style, (3 * Math.PI) / 4), 8)
  }

  it('keeps the new necklines mirror-symmetric about centre front', () => {
    for (const style of ['boat', 'square', 'sweetheart', 'halter', 'keyhole', 'cowl'] as const) mirror(style)
  })

  it('cuts a boat neck wide and shallow', () => {
    const wide = Math.acos(0.75) // still well in from the shoulder
    expect(y('boat', Math.PI / 2)).toBeGreaterThan(y('scoop', Math.PI / 2)) // shallower at centre
    expect(y('boat', wide)).toBeLessThan(y('scoop', wide)) // still dropped where a scoop has risen
  })

  it('holds a square neck flat across the chest', () => {
    const inner = Math.PI / 2 - 0.45
    const squareDrop = Math.abs(y('square', Math.PI / 2) - y('square', inner))
    const scoopDrop = Math.abs(y('scoop', Math.PI / 2) - y('scoop', inner))
    expect(squareDrop).toBeLessThan(scoopDrop)
    expect(y('square', 0)).toBeGreaterThan(y('square', Math.PI / 2)) // straps stay up
  })

  it('raises a sweetheart at centre front and dips it over each cup', () => {
    const cup = Math.PI / 2 - 0.42
    expect(y('sweetheart', Math.PI / 2)).toBeGreaterThan(y('sweetheart', cup))
    expect(y('sweetheart', 0)).toBeGreaterThan(y('sweetheart', cup))
  })

  it('leaves a halter high at the neck, bare at the shoulder, and open at the back', () => {
    const neck = y('halter', Math.PI / 2)
    expect(neck).toBeGreaterThan(y('halter', 0))
    expect(neck).toBeGreaterThan(y('halter', (3 * Math.PI) / 2))
    expect(y('halter', 0)).toBeLessThan(y('crew', 0))
  })

  it('drops a keyhole as a narrow slit, not a wide V', () => {
    const off = Math.PI / 2 - 0.4
    expect(y('keyhole', Math.PI / 2)).toBeLessThan(y('crew', Math.PI / 2) - 0.08)
    expect(Math.abs(y('keyhole', off) - y('crew', off))).toBeLessThan(0.02)
  })

  it('drapes a cowl in folds: the centre hangs, the edge rises, the next fold hangs', () => {
    expect(y('cowl', Math.PI / 2)).toBeLessThan(y('cowl', Math.PI / 3))
    expect(y('cowl', Math.PI / 6)).toBeLessThan(y('cowl', Math.PI / 3))
    expect(y('cowl', Math.PI / 2)).toBeLessThan(y('crew', Math.PI / 2))
  })
})
