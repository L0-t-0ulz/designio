import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { lineupCells, lineupHues } from '../src/renderer/studio/lineup'

describe('runway line-up', () => {
  it('lineupCells lays out even side-by-side cells', () => {
    const { totalW, xs } = lineupCells(4, 100, 10)
    expect(xs).toEqual([0, 110, 220, 330])
    expect(totalW).toBe(4 * 100 + 3 * 10) // 430
  })

  it('lineupCells handles a single cell and gap 0', () => {
    expect(lineupCells(1, 640, 0)).toEqual({ totalW: 640, xs: [0] })
    expect(lineupCells(0, 640, 0)).toEqual({ totalW: 0, xs: [] })
  })

  it('lineupHues keeps the current colour first, then distinct hue-rotated looks', () => {
    const base = 0x3b5b82 // a blue
    const hues = lineupHues(base, 4)
    expect(hues).toHaveLength(4)
    expect(hues[0]).toBe(base) // cell 0 is the working design
    // the rotated cells are distinct from the base and from each other
    const uniq = new Set(hues)
    expect(uniq.size).toBe(4)
    const hueOf = (hex: number): number => {
      const hsl = { h: 0, s: 0, l: 0 }
      new THREE.Color(hex).getHSL(hsl)
      return hsl.h
    }
    const h0 = hueOf(hues[1])
    const h1 = hueOf(hues[2])
    expect(Math.abs(h1 - h0)).toBeGreaterThan(0.1) // spread around the wheel
  })

  it('every hue-rotated look reads with real saturation (not washed out)', () => {
    const hues = lineupHues(0x808080, 4) // a grey base still yields coloured looks
    for (let i = 1; i < hues.length; i++) {
      const hsl = { h: 0, s: 0, l: 0 }
      new THREE.Color(hues[i]).getHSL(hsl)
      expect(hsl.s).toBeGreaterThanOrEqual(0.4)
    }
  })
})
