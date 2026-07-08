import * as THREE from 'three'

/**
 * **Studio lighting & backdrop presets** — art-directed photo-studio looks the user
 * can switch between (`Environment` applies them to the real lights/background). Each
 * lamp is described by an **azimuth/elevation** (degrees) + intensity + colour, and a
 * pure `lampPosition()` turns that into a world position — so the preset data is
 * declarative and unit-tested, and the renderer just consumes it.
 *
 * Azimuth: 0° = front (+z), +90° = camera-right (+x). Elevation: 0° = horizon, 90° = overhead.
 */
export interface LampSpec {
  azimuth: number
  elevation: number
  intensity: number
  color: number
}

export interface LightingPreset {
  id: string
  label: string
  exposure: number // renderer tone-mapping exposure
  hemi: number // hemisphere (ambient) fill
  key: LampSpec
  rims: LampSpec[] // 0–2 rim / fill lamps
}

/** Spherical (azimuth/elevation in degrees) → a world position at `distance`. Pure. */
export function lampPosition(spec: LampSpec, distance = 7.5): THREE.Vector3 {
  const az = THREE.MathUtils.degToRad(spec.azimuth)
  const el = THREE.MathUtils.degToRad(spec.elevation)
  const cosEl = Math.cos(el)
  return new THREE.Vector3(
    distance * cosEl * Math.sin(az),
    distance * Math.sin(el),
    distance * cosEl * Math.cos(az)
  )
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'studio',
    label: 'Studio',
    exposure: 1.0,
    hemi: 0.62,
    key: { azimuth: 37, elevation: 49, intensity: 1.9, color: 0xfff6ec },
    rims: [
      { azimuth: -45, elevation: 30, intensity: 0.6, color: 0x9cc0ff },
      { azimuth: 62, elevation: 15, intensity: 0.32, color: 0xffc79a }
    ]
  },
  {
    id: 'softbox',
    label: 'Softbox',
    exposure: 1.12,
    hemi: 0.92,
    key: { azimuth: 20, elevation: 42, intensity: 1.5, color: 0xfff3e8 },
    rims: [
      { azimuth: -28, elevation: 36, intensity: 0.72, color: 0xbcd2ff },
      { azimuth: 4, elevation: 8, intensity: 0.5, color: 0xffffff }
    ]
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    exposure: 0.9,
    hemi: 0.16,
    key: { azimuth: 55, elevation: 34, intensity: 2.7, color: 0xfff0dc },
    rims: [{ azimuth: -122, elevation: 26, intensity: 1.15, color: 0x88a8ff }]
  },
  {
    id: 'high-key',
    label: 'High-key',
    exposure: 1.34,
    hemi: 1.1,
    key: { azimuth: 24, elevation: 55, intensity: 1.7, color: 0xffffff },
    rims: [
      { azimuth: -26, elevation: 46, intensity: 0.9, color: 0xffffff },
      { azimuth: 180, elevation: 22, intensity: 0.6, color: 0xffffff }
    ]
  },
  {
    id: 'runway',
    label: 'Runway',
    exposure: 1.06,
    hemi: 0.5,
    key: { azimuth: 0, elevation: 60, intensity: 2.2, color: 0xfff8f0 },
    rims: [
      { azimuth: -150, elevation: 20, intensity: 1.0, color: 0x9db8ff },
      { azimuth: 150, elevation: 20, intensity: 1.0, color: 0x9db8ff }
    ]
  },
  {
    id: 'golden-hour',
    label: 'Golden hour',
    exposure: 1.05,
    hemi: 0.44,
    key: { azimuth: 76, elevation: 17, intensity: 2.1, color: 0xffcf9a },
    rims: [{ azimuth: -102, elevation: 24, intensity: 0.85, color: 0xffb37a }]
  }
]

export interface BackdropPreset {
  id: string
  label: string
  stops: [number, string][] // vertical cyclorama gradient (top → bottom)
  floor: boolean // reflective floor + light pool + pedestal shown
}

export const BACKDROP_PRESETS: BackdropPreset[] = [
  { id: 'studio-grey', label: 'Studio grey', stops: [[0, '#e2e5ec'], [0.55, '#bcc1cd'], [1, '#878d9c']], floor: true },
  { id: 'white', label: 'White', stops: [[0, '#ffffff'], [0.7, '#f4f5f8'], [1, '#e7e9ee']], floor: true },
  { id: 'charcoal', label: 'Charcoal', stops: [[0, '#3b3e45'], [0.6, '#2a2c31'], [1, '#1c1d21']], floor: true },
  { id: 'black', label: 'Black', stops: [[0, '#161616'], [1, '#080808']], floor: false },
  { id: 'blush', label: 'Blush', stops: [[0, '#f4e3e0'], [0.6, '#e6c6c0'], [1, '#cc9d95']], floor: true },
  { id: 'sky', label: 'Sky', stops: [[0, '#e0eaf6'], [0.6, '#bacfe8'], [1, '#8da8cb']], floor: true }
]

export const LIGHTING_IDS = LIGHTING_PRESETS.map((p) => p.id)
export const BACKDROP_IDS = BACKDROP_PRESETS.map((p) => p.id)

export function getLightingPreset(id: string): LightingPreset | undefined {
  return LIGHTING_PRESETS.find((p) => p.id === id)
}
export function getBackdropPreset(id: string): BackdropPreset | undefined {
  return BACKDROP_PRESETS.find((p) => p.id === id)
}
