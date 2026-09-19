import { describe, it, expect } from 'vitest'
import { HEATMAP_SCALE, cssColor, legendHTML, strainLegend, type StrainView } from '../src/renderer/fabric/legend'
import { strainToColor } from '../src/renderer/fabric/heatmap'
import { stressColor, stressThreshold } from '../src/renderer/fabric/stress'
import { pressureColor } from '../src/renderer/fabric/pressure'
import { usableStretch, utilisationColor, stretchUtilisation } from '../src/renderer/fabric/stretchUtilisation'

const VIEWS: StrainView[] = ['heatmap', 'stress', 'pressure', 'utilisation']

describe('legend structure', () => {
  it('every view has a title, a note and at least three stops', () => {
    for (const v of VIEWS) {
      const l = strainLegend(v)
      expect(l.title.length, v).toBeGreaterThan(0)
      expect(l.note.length, v).toBeGreaterThan(0)
      expect(l.stops.length, v).toBeGreaterThanOrEqual(3)
    }
  })

  it('stops run left to right across the full bar', () => {
    for (const v of VIEWS) {
      const stops = strainLegend(v).stops
      expect(stops[0].at, v).toBeCloseTo(0, 10)
      expect(stops[stops.length - 1].at, v).toBeCloseTo(1, 10)
      for (let i = 1; i < stops.length; i++) expect(stops[i].at, v).toBeGreaterThan(stops[i - 1].at)
    }
  })

  it('every stop is labelled and in gamut', () => {
    for (const v of VIEWS) {
      for (const s of strainLegend(v).stops) {
        expect(s.label.length, `${v} ${s.at}`).toBeGreaterThan(0)
        for (const c of s.color) {
          expect(c).toBeGreaterThanOrEqual(0)
          expect(c).toBeLessThanOrEqual(1)
        }
      }
    }
  })
})

describe('the legend cannot drift from the render', () => {
  // each stop must come from the SAME function that colours the mesh; a re-listed
  // palette would make a correct render look wrong the first time either changed

  it('heatmap stops match strainToColor at their stated strains', () => {
    for (const s of strainLegend('heatmap').stops) {
      const strain = (s.at * 2 - 1) * HEATMAP_SCALE
      expect(s.color).toEqual(strainToColor(strain, HEATMAP_SCALE))
    }
  })

  it('stress stops match stressColor at this fabric’s threshold', () => {
    for (const k of [0, 0.5, 1]) {
      const t = stressThreshold(k)
      for (const s of strainLegend('stress', k).stops) {
        expect(s.color).toEqual(stressColor(s.at * t, t))
      }
    }
  })

  it('pressure stops match pressureColor', () => {
    for (const s of strainLegend('pressure').stops) {
      expect(s.color).toEqual(pressureColor(s.at * 0.003, 0.003))
    }
  })

  it('utilisation stops go through the real strain → utilisation → colour path', () => {
    for (const k of [0, 0.4, 1]) {
      const usable = usableStretch(k)
      for (const s of strainLegend('utilisation', k).stops) {
        const u = s.at * 1.25
        expect(s.color).toEqual(utilisationColor(stretchUtilisation(u * usable, k)))
      }
    }
  })
})

describe('fabric-dependent scales', () => {
  it('the stress legend states a higher failure strain for a stretchier fabric', () => {
    // "red" is not one strain: it is 22% on a rigid woven and far more on a knit,
    // which is exactly why the legend cannot be a static image
    const rigid = strainLegend('stress', 0).note
    const knit = strainLegend('stress', 1).note
    expect(rigid).not.toBe(knit)
    expect(parseInt(knit.match(/(\d+)%/)![1], 10)).toBeGreaterThan(parseInt(rigid.match(/(\d+)%/)![1], 10))
  })

  it('the utilisation legend states the fabric’s own usable stretch', () => {
    expect(strainLegend('utilisation', 0).note).toContain('3%')
    expect(strainLegend('utilisation', 1).note).toContain('100%')
  })

  it('views that do not depend on the fabric ignore it', () => {
    for (const v of ['heatmap', 'pressure'] as StrainView[]) {
      expect(strainLegend(v, 0)).toEqual(strainLegend(v, 1))
    }
  })
})

describe('labels', () => {
  it('the heatmap is symmetric about neutral and signs its ends', () => {
    const stops = strainLegend('heatmap').stops
    expect(stops[0].label).toBe('-12%')
    expect(stops[stops.length - 1].label).toBe('+12%')
    expect(stops[Math.floor(stops.length / 2)].label).toBe('0%')
  })

  it('the utilisation bar runs past 100% so the over-limit colour is on it', () => {
    const stops = strainLegend('utilisation').stops
    expect(stops[stops.length - 1].label).toBe('over')
    expect(stops.some((s) => s.label === '100%')).toBe(true)
  })

  it('the stress bar ends at failure', () => {
    expect(strainLegend('stress').stops.at(-1)!.label).toBe('fail')
  })
})

describe('rendering', () => {
  it('converts colours to six-digit hex, clamping out-of-range input', () => {
    expect(cssColor([0, 0, 0])).toBe('#000000')
    expect(cssColor([1, 1, 1])).toBe('#ffffff')
    expect(cssColor([-1, 2, 0.5])).toBe('#00ff80')
  })

  it('emits a gradient whose stops are in bar order', () => {
    const html = legendHTML(strainLegend('heatmap'))
    expect(html).toContain('linear-gradient(90deg')
    const positions = [...html.matchAll(/#[0-9a-f]{6} ([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it('anchors the end labels to the edges so they cannot clip outside the panel', () => {
    const html = legendHTML(strainLegend('heatmap'))
    expect(html).toContain('style="left:0"')
    expect(html).toContain('style="right:0"')
    // and the interior ones are still centred on their position
    expect((html.match(/dio-legend-tick-mid/g) ?? []).length).toBe(strainLegend('heatmap').stops.length - 2)
  })

  it('places a tick for every stop', () => {
    for (const v of VIEWS) {
      const legend = strainLegend(v)
      // count the spans, not the substring: the modifier classes contain the base
      // class name, so a loose match double-counts every tick that has one
      expect((legendHTML(legend).match(/<span class="dio-legend-tick/g) ?? []).length, v).toBe(legend.stops.length)
    }
  })
})
