import type { GarmentLayerData } from '../studio/document'
import type { GarmentType } from '../garment/templates'

/**
 * **Template marketplace** — a curated set of starter templates: a complete look
 * (garment + fabric + colour + an optional surface finish) you can apply in one
 * click to skip the blank page. The data + the pure `applyTemplateToLayer` mutation
 * are unit-tested; `ui/templatesOverlay` renders the gallery and the studio wires
 * the apply. (A real *marketplace* — publishing, pricing, downloads — needs a
 * backend; this is the starter-template library + apply slice.)
 */
export interface DesignTemplate {
  id: string
  name: string
  category: string
  garment: string
  fabricId: string
  color: number
  /** An optional finish, keyed like the layer data (e.g. `{ sparkle: 'sequins' }`). */
  finish?: Partial<Pick<GarmentLayerData, 'textile' | 'ombre' | 'sparkle' | 'iridescent' | 'duotone' | 'wear'>>
}

export const TEMPLATES: DesignTemplate[] = [
  { id: 'lbd', name: 'Little black dress', category: 'Occasion', garment: 'sheath', fabricId: 'crepe', color: 0x14141a },
  { id: 'slip', name: 'Champagne slip', category: 'Occasion', garment: 'slip-dress', fabricId: 'silk-charmeuse', color: 0xd9c27e },
  { id: 'gala-gown', name: 'Gala gown', category: 'Occasion', garment: 'gown', fabricId: 'satin', color: 0x7a1030, finish: { sparkle: 'sequins' } },
  { id: 'denim-jacket', name: 'Classic denim jacket', category: 'Everyday', garment: 'blazer', fabricId: 'denim', color: 0x3b5b82 },
  { id: 'white-shirt', name: 'Crisp white shirt', category: 'Everyday', garment: 'dress-shirt', fabricId: 'oxford', color: 0xf3f4f6 },
  { id: 'chino', name: 'Weekend chinos', category: 'Everyday', garment: 'slim-pants', fabricId: 'chino-twill', color: 0xbfa878 },
  { id: 'camel-coat', name: 'Camel overcoat', category: 'Outerwear', garment: 'overcoat', fabricId: 'wool-flannel', color: 0xbfa06a },
  { id: 'puffer', name: 'Quilted puffer', category: 'Outerwear', garment: 'bomber', fabricId: 'scuba', color: 0x22262e, finish: { sparkle: undefined } },
  { id: 'cable-knit', name: 'Cosy cable knit', category: 'Knitwear', garment: 'cardigan', fabricId: 'cable-knit', color: 0xd8cbb0 },
  { id: 'plaid-skirt', name: 'Plaid A-line', category: 'Everyday', garment: 'skirt', fabricId: 'wool-flannel', color: 0x59616b, finish: { textile: 'plaid' } },
  { id: 'ombre-gown', name: 'Ombré chiffon gown', category: 'Occasion', garment: 'gown', fabricId: 'chiffon', color: 0xd98ca8, finish: { ombre: 'top-down' } },
  { id: 'beanie', name: 'Ribbed beanie', category: 'Headwear', garment: 'beanie', fabricId: 'rib-knit', color: 0x556070 }
]

/** Apply a template to a layer in place — garment, fabric, colour + any finish. Pure. */
export function applyTemplateToLayer(layer: GarmentLayerData, t: DesignTemplate): void {
  layer.garmentType = t.garment as GarmentType
  layer.fabricId = t.fabricId
  layer.color = t.color
  // clear the finishes the templates control, then apply this template's
  layer.textile = t.finish?.textile
  layer.ombre = t.finish?.ombre
  layer.sparkle = t.finish?.sparkle
  layer.iridescent = t.finish?.iridescent
  layer.duotone = t.finish?.duotone
  layer.wear = t.finish?.wear
}

/** Search over name + category. Pure. */
export function searchTemplates(query: string, list: DesignTemplate[] = TEMPLATES): DesignTemplate[] {
  const q = query.trim().toLowerCase()
  if (!q) return list.slice()
  return list.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
}

/** A template by id, or undefined. Pure. */
export function getTemplate(id: string): DesignTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
