import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { toneMappingMode, TONE_MAPS } from '../src/renderer/core/tonemap'

describe('toneMappingMode', () => {
  it('maps each name to its three.js operator', () => {
    expect(toneMappingMode('aces')).toBe(THREE.ACESFilmicToneMapping)
    expect(toneMappingMode('agx')).toBe(THREE.AgXToneMapping)
    expect(toneMappingMode('neutral')).toBe(THREE.NeutralToneMapping)
    expect(toneMappingMode('filmic')).toBe(THREE.CineonToneMapping)
    expect(toneMappingMode('reinhard')).toBe(THREE.ReinhardToneMapping)
  })

  it('falls back to ACES for an unknown name', () => {
    expect(toneMappingMode('nope')).toBe(THREE.ACESFilmicToneMapping)
    expect(toneMappingMode('')).toBe(THREE.ACESFilmicToneMapping)
  })

  it('every listed operator resolves to a distinct mapping', () => {
    const modes = new Set(TONE_MAPS.map(toneMappingMode))
    expect(modes.size).toBe(TONE_MAPS.length)
  })
})
