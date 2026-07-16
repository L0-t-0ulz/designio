import type { GarmentCategory } from '../garments/schema'

/**
 * **Zipper builder** — the parametric zipper spec a garment's closure resolves to:
 * gauge (#3 dress → #10 luggage), length (from the garment's opening), one/two-way,
 * separating (jackets) vs closed-bottom, and the pull style. Pure spec + summary +
 * slider count, unit-tested; the manufacturing pack prints it when the closure is a
 * zip. (Rendering the individual teeth is the 3D closure's job; this is the spec.)
 */
export type ZipGauge = '3' | '5' | '8' | '10'
export type ZipPull = 'tab' | 'ring' | 'cord'

export interface ZipperSpec {
  gauge: ZipGauge
  lengthCm: number
  /** Two sliders opening from either end. */
  twoWay: boolean
  /** Opens fully at the bottom (a jacket) vs a closed-end zip (a dress). */
  separating: boolean
  pull: ZipPull
}

/** Teeth width (mm) for a gauge — the "#" number is roughly the closed width in mm. */
export function zipTeethMm(gauge: ZipGauge): number {
  return { '3': 3, '5': 5, '8': 8, '10': 10 }[gauge]
}

/** A sensible zip gauge for a fabric weight (gsm): heavier cloth → chunkier teeth. */
export function zipGaugeForWeight(gsm: number): ZipGauge {
  if (gsm >= 400) return '10'
  if (gsm >= 260) return '8'
  if (gsm >= 140) return '5'
  return '3'
}

/** A nominal centre-front opening length (cm) by garment category. */
export function zipLengthForCategory(category: GarmentCategory): number {
  return { top: 45, bottom: 18, dress: 80, onepiece: 70, outerwear: 70 }[category]
}

/**
 * The zipper spec a garment resolves to: gauge from the fabric weight, length from
 * the category, and separating (a full-length jacket zip) for outerwear. Pure.
 */
export function zipperSpecFor(category: GarmentCategory, gsm: number): ZipperSpec {
  const separating = category === 'outerwear'
  return {
    gauge: zipGaugeForWeight(gsm),
    lengthCm: zipLengthForCategory(category),
    twoWay: separating && zipLengthForCategory(category) >= 65, // long jackets get a two-way
    separating,
    pull: category === 'outerwear' ? 'ring' : 'tab'
  }
}

/** Sliders on the zip — two for a two-way, else one. */
export function zipSliderCount(spec: ZipperSpec): number {
  return spec.twoWay ? 2 : 1
}

/** One-line tech-pack summary of a zipper spec. Pure. */
export function zipperSummary(spec: ZipperSpec): string {
  const kind = spec.separating ? 'separating' : 'closed-end'
  const way = spec.twoWay ? 'two-way' : 'one-way'
  return `#${spec.gauge} (${zipTeethMm(spec.gauge)} mm) · ${spec.lengthCm} cm · ${kind} · ${way} · ${spec.pull} pull`
}
