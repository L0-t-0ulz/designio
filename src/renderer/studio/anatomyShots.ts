import type { Measurements } from '../avatar/Mannequin'
import type { CameraPose } from './cameraBookmarks'

/**
 * **Anatomy camera bookmarks** — one-click framings computed from the live body
 * measurements (they follow resizes and presets): face for beauty/headwear, bust
 * and waist for construction detail, hem for finish, and a back-detail shot from
 * behind. Pure + unit-tested; the camera-bookmarks panel lists them above the
 * user's saved views.
 */

export interface AnatomyShot {
  name: string
  pose: CameraPose
}

const FRONT = 0 // spherical azimuth 0 = the camera on +z — facing the body's front

export function anatomyShots(m: Measurements): AnatomyShot[] {
  const headY = m.neckY + m.headR * 2 // ≈ face centre
  return [
    { name: 'Face', pose: { azimuth: FRONT, polar: Math.PI / 2.1, distance: m.headR * 7, target: [0, headY, 0] } },
    { name: 'Bust', pose: { azimuth: FRONT, polar: Math.PI / 2.05, distance: m.chestR * 6.5, target: [0, m.chestY, 0] } },
    { name: 'Waist', pose: { azimuth: FRONT, polar: Math.PI / 2, distance: m.waistR * 8, target: [0, m.waistY, 0] } },
    { name: 'Hem', pose: { azimuth: FRONT, polar: Math.PI / 1.9, distance: m.hipR * 9, target: [0, (m.hipY + m.kneeY) / 2, 0] } },
    { name: 'Back detail', pose: { azimuth: FRONT + Math.PI, polar: Math.PI / 2.05, distance: m.chestR * 7, target: [0, m.chestY, 0] } }
  ]
}
