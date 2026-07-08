/**
 * Named **wind presets** to art-direct the per-fabric 4D secondary motion — still,
 * breeze, gust, a directional runway draft. Each is a base wind vector (x = side,
 * z = front/back) + a `gust` amplitude that pulses the strength over time. The base
 * vectors + the gust pulse are pure (unit-tested); main applies the pulse each frame.
 */
export interface WindPreset {
  name: string
  label: string
  x: number
  z: number
  /** Gust amplitude — 0 = steady, higher = stronger pulsing over time. */
  gust: number
}

export const WIND_PRESETS: WindPreset[] = [
  { name: 'still', label: 'Still', x: 0, z: 0, gust: 0 },
  { name: 'breeze', label: 'Breeze', x: 1.8, z: 0.5, gust: 0.35 },
  { name: 'gust', label: 'Gust', x: 3.8, z: 1.2, gust: 0.9 },
  { name: 'runway', label: 'Runway draft', x: 0.4, z: -3.4, gust: 0.2 }
]

export const WIND_PRESET_NAMES: string[] = WIND_PRESETS.map((p) => p.name)

export function getWindPreset(name: string): WindPreset | undefined {
  return WIND_PRESETS.find((p) => p.name === name)
}

/**
 * The wind vector at time `t` (s) with a gust pulse — two out-of-phase sines so the
 * strength swells and lulls rather than pulsing mechanically. `gust ≤ 0` = steady.
 */
export function gustWind(x: number, z: number, gust: number, t: number): { x: number; z: number } {
  if (gust <= 0) return { x, z }
  const pulse = 1 + gust * (0.55 * Math.sin(t * 0.9) + 0.45 * Math.sin(t * 2.7 + 1.3))
  return { x: x * pulse, z: z * pulse }
}
