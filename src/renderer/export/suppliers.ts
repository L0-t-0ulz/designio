import type { Fabric } from '../fabric/FabricLibrary'
import { fibreGroup, type FibreGroup } from './sustainability'

/**
 * **Sourcing estimates** — a supplier profile + lead time per fabric so the BOM is
 * sourceable, not just a list. Ballpark industry figures by fibre group (where that
 * cloth is typically milled and how long a wholesale order takes), labelled as
 * estimates in the pack. Pure + unit-tested.
 */

export interface SupplierEstimate {
  /** Where this cloth is typically milled/sourced. */
  source: string
  leadWeeksMin: number
  leadWeeksMax: number
}

const SUPPLIERS: Record<FibreGroup, SupplierEstimate> = {
  cotton: { source: 'Cotton mills — Tiruppur (IN) · Guangdong (CN) · İzmir (TR)', leadWeeksMin: 4, leadWeeksMax: 6 },
  wool: { source: 'Worsted/woollen mills — Biella (IT) · Huddersfield (UK)', leadWeeksMin: 6, leadWeeksMax: 10 },
  silk: { source: 'Silk weavers — Como (IT) · Suzhou (CN)', leadWeeksMin: 6, leadWeeksMax: 8 },
  synthetic: { source: 'Technical knitters — Taiwan · South Korea · Zhejiang (CN)', leadWeeksMin: 8, leadWeeksMax: 10 },
  leather: { source: 'Tanneries — Tuscany (IT) · León (MX)', leadWeeksMin: 8, leadWeeksMax: 12 }
}

export function supplierFor(fabric: Fabric): SupplierEstimate {
  return SUPPLIERS[fibreGroup(fabric)]
}
