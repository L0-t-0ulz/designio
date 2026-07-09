import type { Fabric } from '../fabric/FabricLibrary'

/**
 * Auto-generated **care label** — fibre content + laundering instructions —
 * derived from a fabric's family / id / stretch. Pure (no DOM) so it's unit
 * tested; the manufacturing pack renders it per garment.
 */
export type FibreClass = 'cotton' | 'linen' | 'wool' | 'silk' | 'synthetic' | 'leather' | 'elastane'

/** Fibre class by fabric id (falls back to the family below). */
const FIBRE_BY_ID: Record<string, FibreClass> = {
  'cotton-poplin': 'cotton', oxford: 'cotton', 'chino-twill': 'cotton', denim: 'cotton', canvas: 'cotton', corduroy: 'cotton',
  linen: 'linen',
  'wool-flannel': 'wool', tweed: 'wool', 'cable-knit': 'wool',
  'silk-charmeuse': 'silk', satin: 'silk', crepe: 'silk', organza: 'silk', chiffon: 'silk',
  'jersey-knit': 'cotton', 'rib-knit': 'cotton', 'french-terry': 'cotton',
  fleece: 'synthetic', tulle: 'synthetic', velvet: 'synthetic',
  leather: 'leather', suede: 'leather', spandex: 'elastane'
}

const FIBRE_LABEL: Record<FibreClass, string> = {
  cotton: 'Cotton', linen: 'Linen', wool: 'Wool', silk: 'Silk', synthetic: 'Polyester', leather: 'Leather', elastane: 'Elastane'
}

/** The fibre class for a fabric — its id override, else inferred from the family. */
export function fibreClass(fabric: Fabric): FibreClass {
  const byId = FIBRE_BY_ID[fabric.id]
  if (byId) return byId
  switch (fabric.family) {
    case 'silk':
      return 'silk'
    case 'specialty':
      return 'synthetic'
    default:
      return 'cotton' // wovens + knits default to cotton
  }
}

/** The fibre-content string, blending in elastane for stretchy cloth. */
export function fibreContent(fabric: Fabric): string {
  const cls = fibreClass(fabric)
  if (cls === 'elastane') return '92% Polyester, 8% Elastane'
  if (cls === 'leather') return 'Genuine leather'
  const base = FIBRE_LABEL[cls]
  if (fabric.stretch >= 0.4) return `95% ${base}, 5% Elastane` // knits / high-stretch add spandex
  return `100% ${base}`
}

export interface CareInstructions {
  wash: string
  bleach: string
  dry: string
  iron: string
  professional: string
}

const CARE: Record<FibreClass, CareInstructions> = {
  cotton: { wash: 'Machine wash warm', bleach: 'Non-chlorine bleach only if needed', dry: 'Tumble dry medium', iron: 'Iron medium', professional: 'Dry clean, any solvent' },
  linen: { wash: 'Machine wash cool', bleach: 'Do not bleach', dry: 'Line dry', iron: 'Iron hot while damp', professional: 'Dry clean OK' },
  wool: { wash: 'Hand wash cold', bleach: 'Do not bleach', dry: 'Dry flat, do not tumble', iron: 'Iron cool', professional: 'Dry clean recommended' },
  silk: { wash: 'Hand wash cold or dry clean', bleach: 'Do not bleach', dry: 'Dry flat in shade', iron: 'Iron cool on reverse', professional: 'Dry clean' },
  synthetic: { wash: 'Machine wash cold', bleach: 'Do not bleach', dry: 'Tumble dry low', iron: 'Iron cool', professional: 'Do not dry clean' },
  leather: { wash: 'Do not wash', bleach: 'Do not bleach', dry: 'Do not tumble dry', iron: 'Do not iron', professional: 'Professional leather clean only' },
  elastane: { wash: 'Machine wash cold', bleach: 'Do not bleach', dry: 'Do not tumble dry', iron: 'Do not iron', professional: 'Do not dry clean' }
}

export function careInstructions(fabric: Fabric): CareInstructions {
  return CARE[fibreClass(fabric)]
}

export interface CareLabel {
  fibre: string
  care: string[]
}

/** The full care label — fibre content + the ordered care lines (wash → professional). */
export function careLabel(fabric: Fabric): CareLabel {
  const c = careInstructions(fabric)
  return { fibre: fibreContent(fabric), care: [c.wash, c.bleach, c.dry, c.iron, c.professional] }
}
