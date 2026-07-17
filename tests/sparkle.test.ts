import { describe, it, expect } from 'vitest'
import { sparkleNormal, sparkleParams, SPARKLE_KINDS, type SparkleKind } from '../src/renderer/fabric/sparkle'

const unit = (n: [number, number, number]): boolean => Math.abs(Math.hypot(...n) - 1) < 1e-6

describe('sparkle finishes — sequins · beading · foil', () => {
  it('every finish returns a unit normal everywhere', () => {
    for (const k of SPARKLE_KINDS) {
      for (let i = 0; i <= 20; i++) {
        for (let j = 0; j <= 20; j++) {
          expect(unit(sparkleNormal(k, i / 20, j / 20, 8))).toBe(true)
        }
      }
    }
  })

  it('the baked tile is seamless — opposite edges match (so RepeatWrapping has no seam)', () => {
    for (const k of SPARKLE_KINDS) {
      for (const t of [0.2, 0.55, 0.83]) {
        const l = sparkleNormal(k, 0, t, 8)
        const r = sparkleNormal(k, 1, t, 8)
        const top = sparkleNormal(k, t, 0, 8)
        const bot = sparkleNormal(k, t, 1, 8)
        for (let c = 0; c < 3; c++) {
          expect(l[c]).toBeCloseTo(r[c], 6)
          expect(top[c]).toBeCloseTo(bot[c], 6)
        }
      }
    }
  })

  it('a bead is a hemisphere — up at the centre, tilted outward toward its edge', () => {
    const cells = 4
    const centre = sparkleNormal('beading', 0.5 / cells, 0.5 / cells, cells) // cell (0,0) centre
    expect(centre[2]).toBeGreaterThan(0.98) // ~flat-up at the dome top
    const edge = sparkleNormal('beading', 0.9 / cells, 0.5 / cells, cells) // toward the rim
    expect(Math.hypot(edge[0], edge[1])).toBeGreaterThan(Math.hypot(centre[0], centre[1]))
  })

  it('sequins are tilted flat discs — most facets are not the flat up-normal', () => {
    const cells = 8
    let tilted = 0
    for (let cu = 0; cu < cells; cu++) {
      for (let cv = 0; cv < cells; cv++) {
        const n = sparkleNormal('sequins', (cu + 0.5) / cells, (cv + 0.5) / cells, cells)
        if (Math.hypot(n[0], n[1]) > 0.15) tilted++
      }
    }
    expect(tilted).toBeGreaterThan(cells * cells * 0.6) // the scatter really tilts
  })

  it('gaps between facets read flat (the up-normal)', () => {
    // a corner of a cell (far from any facet centre) is a gap
    const n = sparkleNormal('sequins', 0.001, 0.001, 8)
    expect(n[2]).toBeGreaterThan(0.999)
  })

  it('material recipes: foil is fully metallic, beading is clearcoated, all reflect env', () => {
    const foil = sparkleParams('foil')
    const bead = sparkleParams('beading')
    const seq = sparkleParams('sequins')
    expect(foil.metalness).toBe(1)
    expect(foil.anisotropy).toBeGreaterThan(0) // anisotropic glint
    expect(bead.clearcoat).toBeGreaterThan(0.5) // glassy beads
    expect(seq.metalness).toBeGreaterThan(0.7)
    for (const p of [foil, bead, seq] as ReturnType<typeof sparkleParams>[]) {
      expect(p.roughness).toBeLessThan(0.35) // shiny
      expect(p.envMapIntensity).toBeGreaterThanOrEqual(1) // catches the environment
      expect(p.repeat).toBeGreaterThan(0)
      expect(p.cells).toBeGreaterThan(0)
    }
  })

  it('glitter is a dense scatter of tiny hard-tilted metallic flecks', () => {
    const glit = sparkleParams('glitter')
    const seq = sparkleParams('sequins')
    expect(glit.cells).toBeGreaterThan(seq.cells) // many more, smaller facets
    expect(glit.metalness).toBe(1)
    expect(glit.roughness).toBeLessThan(0.35) // shiny flecks
    // its flecks tilt harder than sequins on average → a busier glint field
    const spread = (k: SparkleKind): number => {
      let sum = 0
      const cells = 8
      for (let cu = 0; cu < cells; cu++)
        for (let cv = 0; cv < cells; cv++) {
          const n = sparkleNormal(k, (cu + 0.5) / cells, (cv + 0.5) / cells, cells)
          sum += Math.hypot(n[0], n[1])
        }
      return sum
    }
    expect(spread('glitter')).toBeGreaterThan(spread('sequins'))
  })

  it('exposes exactly the advertised finishes', () => {
    const expected: SparkleKind[] = ['sequins', 'beading', 'foil', 'glitter']
    expect([...SPARKLE_KINDS].sort()).toEqual([...expected].sort())
  })
})
