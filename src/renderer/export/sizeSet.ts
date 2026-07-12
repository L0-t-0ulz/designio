import { SIZES, type SizeLabel } from '../studio/document'

/**
 * **Production size set** — the graded flat pattern at every size in the run,
 * exported as one ZIP (an SVG + a DXF per size) so the cutter gets the whole
 * XS–XXL set from one click. The filename plan is pure + unit-tested; `main`
 * regenerates each size through the same `gradeParams` path the 3D wears.
 */

export interface SizeSetFile {
  size: SizeLabel
  svgName: string
  dxfName: string
}

/** Stable, slug-safe per-size filenames for the ZIP. */
export function sizeSetFiles(styleName: string, sizes: readonly SizeLabel[] = SIZES): SizeSetFile[] {
  const slug =
    styleName
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'pattern'
  return sizes.map((size) => ({ size, svgName: `${slug}-${size}.svg`, dxfName: `${slug}-${size}.dxf` }))
}
