/**
 * **Wind compass dial** maths — a direction + strength control mapped to the wind
 * vector. Dial up (angle 0) blows toward −z (the runway draft, front→back);
 * angles run clockwise; strength is the radial fraction of `maxSpeed`.
 * Pure + unit-tested; the Scene panel draws/drags the dial.
 */

export function windFromDial(angle: number, strength01: number, maxSpeed = 10): { x: number; z: number } {
  const s = Math.max(0, Math.min(1, strength01)) * maxSpeed
  return { x: Math.sin(angle) * s, z: -Math.cos(angle) * s }
}

export function dialFromWind(x: number, z: number, maxSpeed = 10): { angle: number; strength01: number } {
  const speed = Math.hypot(x, z)
  return {
    angle: speed < 1e-9 ? 0 : Math.atan2(x, -z),
    strength01: Math.max(0, Math.min(1, speed / maxSpeed))
  }
}
