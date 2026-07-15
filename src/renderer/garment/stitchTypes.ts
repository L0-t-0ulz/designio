/**
 * Seam & topstitch library — the stitch construction spec as pure data + math:
 * seam TYPES (plain · french · flat-fell · overlock) with their allowances,
 * thread appetites and visible topstitch rows; NEEDLE mode (single/double);
 * SPI (stitches per inch → real stitch length, and the dash scale the 3D
 * topstitch renders with); THREAD weight (Tex). Reads on the 3D garment
 * (dash pitch + twin needle rows) and in the tech pack (spec rows + a
 * type-aware thread estimate).
 */

export type SeamType = 'plain' | 'french' | 'flat-fell' | 'overlock' | 'bonded'

export interface SeamTypeSpec {
  label: string
  /** Recommended seam allowance (mm) — enclosed seams need more. */
  allowanceMm: number
  /** Thread consumed per metre of seam, as a multiple of the seam length
   *  (lockstitch ≈ 2.5×; loopers devour thread). */
  threadFactor: number
  /** Visible topstitch rows on the garment face (flat-fell = the twin jeans rows). */
  visibleRows: 0 | 1 | 2
  note: string
}

export const SEAM_TYPES: Record<SeamType, SeamTypeSpec> = {
  plain: { label: 'Plain (pressed open)', allowanceMm: 10, threadFactor: 2.5, visibleRows: 0, note: 'general seaming — press open' },
  french: { label: 'French (enclosed)', allowanceMm: 15, threadFactor: 5.0, visibleRows: 0, note: 'sewn twice, raw edge enclosed — sheers + luxury' },
  'flat-fell': { label: 'Flat-fell', allowanceMm: 18, threadFactor: 6.0, visibleRows: 2, note: 'folded + twin-stitched — jeans/workwear, strongest' },
  overlock: { label: 'Overlock (serged)', allowanceMm: 8, threadFactor: 14, visibleRows: 0, note: 'looper-covered edge — knits' },
  bonded: { label: 'Bonded (heat-sealed)', allowanceMm: 8, threadFactor: 0, visibleRows: 0, note: 'welded/taped, no needle thread — waterproof + technical wear' }
}

export type NeedleMode = 'single' | 'double'

export type ThreadWeight = 'tex-27' | 'tex-40' | 'tex-60'

export const THREAD_WEIGHTS: Record<ThreadWeight, { label: string; use: string }> = {
  'tex-27': { label: 'Tex 27 (fine)', use: 'blouses · sheers' },
  'tex-40': { label: 'Tex 40 (all-purpose)', use: 'wovens · general' },
  'tex-60': { label: 'Tex 60 (heavy)', use: 'denim · topstitch accent' }
}

/** One garment's stitching spec. */
export interface StitchSpec {
  seamType: SeamType
  needle: NeedleMode
  /** Stitches per inch (typical garment range 6–14). */
  spi: number
  threadWt: ThreadWeight
}

export const DEFAULT_STITCH: StitchSpec = { seamType: 'plain', needle: 'single', spi: 10, threadWt: 'tex-40' }

export const clampSpi = (spi: number): number => Math.max(4, Math.min(22, Math.round(spi) || 10))

/** Real stitch length (mm) from stitches-per-inch. */
export const stitchLengthMm = (spi: number): number => 25.4 / clampSpi(spi)

/** Dash pitch for the 3D topstitch material (m): the dash + gap sum to the
 *  real stitch length, so 8 SPI reads chunkier than 14 SPI on the garment. */
export function dashForSpi(spi: number): { dashSize: number; gapSize: number } {
  const len = stitchLengthMm(spi) / 1000
  return { dashSize: len * 0.62, gapSize: len * 0.38 }
}

/**
 * Thread estimate (m) for a garment's seams under a spec: the seam type's
 * appetite, denser stitching consuming more (interlacing scales with stitch
 * count), and a double needle adding its second row.
 */
export function threadMetresFor(seamCm: number, spec: StitchSpec): number {
  const type = SEAM_TYPES[spec.seamType]
  const density = 0.7 + 0.03 * clampSpi(spec.spi) // 10 SPI = 1.0
  const needle = spec.needle === 'double' ? 1.4 : 1
  return (seamCm / 100) * type.threadFactor * density * needle
}

/** One-line spec summary for the tech pack / panel readout. */
export function stitchSummary(spec: StitchSpec): string {
  return `${SEAM_TYPES[spec.seamType].label} · ${clampSpi(spec.spi)} SPI (${stitchLengthMm(spec.spi).toFixed(1)} mm) · ${
    spec.needle === 'double' ? 'double needle' : 'single needle'
  } · ${THREAD_WEIGHTS[spec.threadWt].label}`
}

/** Parse a spec from deep-link params (all optional; falls back to defaults). */
export function parseStitchParams(get: (k: string) => string | null): StitchSpec | undefined {
  const seamType = get('seamType') as SeamType | null
  const needle = get('needle') as NeedleMode | null
  const spi = get('spi')
  const threadWt = get('threadWt') as ThreadWeight | null
  if (!seamType && !needle && !spi && !threadWt) return undefined
  return {
    seamType: seamType && seamType in SEAM_TYPES ? seamType : DEFAULT_STITCH.seamType,
    needle: needle === 'double' ? 'double' : DEFAULT_STITCH.needle,
    spi: spi ? clampSpi(Number(spi)) : DEFAULT_STITCH.spi,
    threadWt: threadWt && threadWt in THREAD_WEIGHTS ? threadWt : DEFAULT_STITCH.threadWt
  }
}
