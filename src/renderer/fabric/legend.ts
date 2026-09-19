import { strainToColor } from './heatmap'
import { pressureColor } from './pressure'
import { stressColor, stressThreshold } from './stress'
import { stretchUtilisation, usableStretch, utilisationColor } from './stretchUtilisation'
import { WRINKLE_SCALE, wrinkleColor } from './wrinkleDensity'

/**
 * **Legend for the strain views** — what each colour on the garment actually means,
 * in the units the view is measuring.
 *
 * Every stop is coloured by calling **the same function the mesh is coloured with**,
 * never a re-listed palette. A legend that keeps its own copy of the ramp is a legend
 * that will disagree with the render the first time either is touched, and a
 * disagreeing legend is worse than none: it makes a correct render look wrong.
 *
 * The scales are view-dependent and two of them are fabric-dependent, which is the
 * other reason this cannot be a static image — "red" means 22% strain on a rigid
 * woven and 66% on a power knit.
 */
export type StrainView = 'heatmap' | 'stress' | 'pressure' | 'utilisation' | 'wrinkle'

export interface LegendStop {
  /** Position along the ramp, 0…1 — where to place it on the gradient bar. */
  at: number
  /** What to print under it. */
  label: string
  color: [number, number, number]
}

export interface Legend {
  title: string
  /** Units/meaning, shown small under the title. */
  note: string
  stops: LegendStop[]
}

/** The heatmap's saturation point: ±12% strain, matching `strainToColor`'s default. */
export const HEATMAP_SCALE = 0.12

const pct = (v: number): string => `${Math.round(v * 100)}%`

/**
 * Build the legend for a view.
 *
 * `fabricStretch` is the library's 0…1 index; it is only consulted by the two views
 * that normalise against the cloth (stress and utilisation), and ignored by the two
 * that do not.
 */
export function strainLegend(view: StrainView, fabricStretch = 0.5): Legend {
  switch (view) {
    case 'heatmap': {
      // signed strain: slack through neutral to tight, symmetric about zero
      const at = [0, 0.25, 0.5, 0.75, 1]
      return {
        title: 'Fit / tension',
        note: `strain, ±${pct(HEATMAP_SCALE)} full scale`,
        stops: at.map((a) => {
          const strain = (a * 2 - 1) * HEATMAP_SCALE
          return { at: a, label: `${strain > 0 ? '+' : ''}${pct(strain)}`, color: strainToColor(strain, HEATMAP_SCALE) }
        })
      }
    }
    case 'stress': {
      // distance to fit failure, which scales with what the fabric tolerates
      const threshold = stressThreshold(fabricStretch)
      const at = [0, 0.5, 1]
      return {
        title: 'Stress check',
        note: `fails at ${pct(threshold)} strain for this fabric`,
        stops: at.map((a) => ({ at: a, label: a === 1 ? 'fail' : pct(a * threshold), color: stressColor(a * threshold, threshold) }))
      }
    }
    case 'pressure': {
      const scale = 0.003
      const at = [0, 1 / 3, 2 / 3, 1]
      const names = ['none', 'light', 'firm', 'hard']
      return {
        title: 'Contact pressure',
        note: 'how hard the cloth presses the body',
        stops: at.map((a, i) => ({ at: a, label: names[i], color: pressureColor(a * scale, scale) }))
      }
    }
    case 'wrinkle': {
      // mean curvature, 1/m — a 1 cm-radius crease is 100 m⁻¹, so the scale is set
      // where a fold becomes visually a crease rather than a soft drape
      const at = [0, 1 / 3, 2 / 3, 1]
      const names = ['smooth', 'soft fold', 'crease', 'sharp']
      return {
        title: 'Wrinkle density',
        note: `mean curvature, 0…${WRINKLE_SCALE} m⁻¹`,
        stops: at.map((a, i) => ({ at: a, label: names[i], color: wrinkleColor(a * WRINKLE_SCALE) }))
      }
    }
    case 'utilisation': {
      // fraction of the fabric's own usable stretch being consumed; the bar runs to
      // 125% so the over-limit colour is actually on it
      const usable = usableStretch(fabricStretch)
      const maxU = 1.25
      // 0%, 50%, 100% (at 1/1.25 = 0.8 along the bar) and over — note 1/maxU IS 0.8,
      // so listing both would put two stops on the same spot
      const at = [0, 0.4, 1 / maxU, 1]
      return {
        title: 'Stretch utilisation',
        note: `of ${pct(usable)} usable stretch`,
        stops: at.map((a) => {
          const u = a * maxU
          return {
            at: a,
            label: u > 1 ? 'over' : pct(u),
            // colour via the strain that produces this utilisation, so the legend goes
            // through exactly the code path the mesh does
            color: utilisationColor(stretchUtilisation(u * usable, fabricStretch))
          }
        })
      }
    }
  }
}

/** `[r,g,b]` 0…1 → a CSS hex string. */
export function cssColor(c: [number, number, number]): string {
  return (
    '#' +
    c
      .map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}

/** The legend as an HTML fragment: a gradient bar with ticks under it. */
export function legendHTML(legend: Legend): string {
  const gradient = legend.stops.map((s) => `${cssColor(s.color)} ${(s.at * 100).toFixed(1)}%`).join(', ')
  // The end labels are anchored to the ends rather than centred on them: a centred
  // label at 0% or 100% hangs half its width outside the panel and gets clipped.
  const ticks = legend.stops
    .map((s, i) => {
      if (i === 0) return `<span class="dio-legend-tick" style="left:0">${s.label}</span>`
      if (i === legend.stops.length - 1) return `<span class="dio-legend-tick dio-legend-tick-end" style="right:0">${s.label}</span>`
      return `<span class="dio-legend-tick dio-legend-tick-mid" style="left:${(s.at * 100).toFixed(1)}%">${s.label}</span>`
    })
    .join('')
  return `<div class="dio-legend"><div class="dio-legend-title">${legend.title}</div><div class="dio-legend-bar" style="background:linear-gradient(90deg, ${gradient})"></div><div class="dio-legend-scale">${ticks}</div><div class="dio-legend-note">${legend.note}</div></div>`
}
