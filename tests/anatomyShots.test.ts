import { describe, it, expect } from 'vitest'
import { anatomyShots } from '../src/renderer/studio/anatomyShots'
import { MEASUREMENTS, buildMannequin } from '../src/renderer/avatar/Mannequin'

describe('anatomy camera bookmarks', () => {
  it('frames the five shots at their landmarks, front-facing except the back detail', () => {
    const shots = anatomyShots(MEASUREMENTS)
    expect(shots.map((s) => s.name)).toEqual(['Face', 'Bust', 'Waist', 'Hem', 'Back detail'])
    const by = Object.fromEntries(shots.map((s) => [s.name, s.pose]))
    expect(by.Face.target[1]).toBeGreaterThan(by.Bust.target[1]) // face above bust
    expect(by.Bust.target[1]).toBeGreaterThan(by.Waist.target[1])
    expect(by.Waist.target[1]).toBeGreaterThan(by.Hem.target[1])
    expect(by.Bust.target[1]).toBeCloseTo(MEASUREMENTS.chestY, 10)
    // back detail looks from behind (half a turn from the front azimuth)
    expect(Math.abs(by['Back detail'].azimuth - by.Bust.azimuth)).toBeCloseTo(Math.PI, 10)
    // close-ups are closer than wider shots
    expect(by.Face.distance).toBeLessThan(by.Hem.distance)
    for (const s of shots) expect(s.pose.distance).toBeGreaterThan(0.3)
  })

  it('follows the body: a taller, fuller avatar reframes its shots', () => {
    const mann = buildMannequin()
    const base = anatomyShots(mann.measurements)
    mann.resize({ height: 1.12, bust: 1.15 })
    const tall = anatomyShots(mann.measurements)
    expect(tall[0].pose.target[1]).toBeGreaterThan(base[0].pose.target[1]) // face rises with height
    expect(tall[1].pose.distance).toBeGreaterThan(base[1].pose.distance) // fuller bust frames wider
  })
})
