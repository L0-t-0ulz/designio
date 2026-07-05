import type { DesignConfig } from './design'

/** A ready-made look — garment + fabric + colour + a few fit/style overrides. */
export interface Preset {
  id: string
  name: string
  config: Partial<DesignConfig>
}

export const PRESETS: Preset[] = [
  {
    id: 'linen-sundress',
    name: 'Linen sundress',
    config: { garmentType: 'dress', fabricId: 'linen', color: 0xd8c7a0, neckline: 'scoop', sleeve: 'none', length: 0.72, flare: 0.12 }
  },
  {
    id: 'silk-slip',
    name: 'Silk slip',
    config: { garmentType: 'slip-dress', fabricId: 'silk-charmeuse', color: 0xd9c27e }
  },
  {
    id: 'satin-gown',
    name: 'Satin gown',
    config: { garmentType: 'gown', fabricId: 'satin', color: 0x7a3b6b }
  },
  {
    id: 'denim-aline',
    name: 'Denim A-line',
    config: { garmentType: 'skirt', fabricId: 'denim', color: 0x3b5b82, flare: 0.08 }
  },
  {
    id: 'wool-wide-leg',
    name: 'Wool wide-leg',
    config: { garmentType: 'wide-leg', fabricId: 'wool-flannel', color: 0x59616b }
  },
  {
    id: 'jersey-tee',
    name: 'Jersey tee',
    config: { garmentType: 'top', fabricId: 'jersey-knit', color: 0x5f8f6b, neckline: 'crew', sleeve: 'short' }
  }
]
