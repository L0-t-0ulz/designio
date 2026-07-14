import { describe, it, expect } from 'vitest'
import { panelSeamAzimuths, hasCleanFront, CAP_PANEL_COUNTS, DEFAULT_CAP_PANELS } from '../src/renderer/avatar/capPanels'

const TAU = Math.PI * 2

describe('5-panel vs 6-panel cap — seam layout', () => {
  it('lays n evenly-spaced seams', () => {
    for (const n of CAP_PANEL_COUNTS) {
      const az = panelSeamAzimuths(n)
      expect(az.length).toBe(n)
      const sorted = [...az].sort((a, b) => a - b)
      for (let i = 1; i < n; i++) expect(sorted[i] - sorted[i - 1]).toBeCloseTo(TAU / n, 10)
    }
  })

  it('the 6-panel seams straight down centre-front; the 5-panel keeps a clean front', () => {
    expect(panelSeamAzimuths(6)).toContain(0)
    expect(hasCleanFront(6)).toBe(false)
    expect(panelSeamAzimuths(5).every((a) => a > 0.1)).toBe(true)
    expect(hasCleanFront(5)).toBe(true)
  })

  it('both layouts mirror left↔right', () => {
    for (const n of CAP_PANEL_COUNTS) {
      const az = panelSeamAzimuths(n)
      for (const a of az) {
        const mirrored = (TAU - a) % TAU
        expect(az.some((b) => Math.abs(b - mirrored) < 1e-9)).toBe(true)
      }
    }
  })

  it('defaults to the classic 6-panel', () => {
    expect(DEFAULT_CAP_PANELS).toBe(6)
  })
})
