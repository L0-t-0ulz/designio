import * as THREE from 'three'

/**
 * Selectable **tone-mapping** operators for the final render. The default remains
 * ACES Filmic; **AgX** (a modern, hue-stable filmic curve) and **Neutral** roll off
 * bright highlights — white satin, sequins, bloom — with less of the saturation shift
 * / hue twist ACES gives, for a cleaner product look. Pure map, unit-tested.
 */
export type ToneMapName = 'aces' | 'agx' | 'neutral' | 'filmic' | 'reinhard'
export const TONE_MAPS: ToneMapName[] = ['aces', 'agx', 'neutral', 'filmic', 'reinhard']

export function toneMappingMode(name: string): THREE.ToneMapping {
  switch (name) {
    case 'agx':
      return THREE.AgXToneMapping
    case 'neutral':
      return THREE.NeutralToneMapping
    case 'filmic':
      return THREE.CineonToneMapping
    case 'reinhard':
      return THREE.ReinhardToneMapping
    default:
      return THREE.ACESFilmicToneMapping
  }
}
