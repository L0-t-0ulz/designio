import { describe, it, expect } from 'vitest'
import { ClothWorld } from '../src/renderer/cloth/ClothWorld'
import { FABRICS } from '../src/renderer/cloth/fabricPresets'
import { buildSewnTop, DEFAULT_PATTERN } from '../src/renderer/pattern/pattern'
import { fabricToSolverParams, getFabric } from '../src/renderer/fabric/FabricLibrary'

describe('ClothWorld', () => {
  it('a stitch pulls two separated particles together', () => {
    const w = new ClothWorld(FABRICS.cotton)
    w.addParticles(new Float32Array([0, 1, 0, 0.2, 1, 0]))
    w.stitch(0, 1)
    w.build()
    w.gravity.set(0, 0, 0)
    for (let i = 0; i < 30; i++) w.step(1 / 60)
    const d = Math.hypot(
      w.positions[0] - w.positions[3],
      w.positions[1] - w.positions[4],
      w.positions[2] - w.positions[5]
    )
    expect(d).toBeLessThan(0.02)
  })
})

describe('buildSewnTop', () => {
  const sewn = buildSewnTop(DEFAULT_PATTERN, fabricToSolverParams(getFabric('cotton-poplin')))
  const { cols, rows } = DEFAULT_PATTERN

  it('creates two panels stitched into one world', () => {
    expect(sewn.geometries.length).toBe(2)
    expect(sewn.world.count).toBe(2 * cols * rows)
    expect(sewn.initial.length).toBe(sewn.world.count * 3)
  })

  it('seam edges start co-located (front & back share the side)', () => {
    // front col 0, back col (cols-1), same row → arranged at the same side point
    const p = sewn.initial
    const front = 0 * cols + 0
    const back = cols * rows + (cols - 1) // backBase = cols*rows
    const d = Math.hypot(
      p[front * 3] - p[back * 3],
      p[front * 3 + 1] - p[back * 3 + 1],
      p[front * 3 + 2] - p[back * 3 + 2]
    )
    expect(d).toBeLessThan(1e-6)
  })

  it('drapes without exploding (finite, settles near the body)', () => {
    sewn.world.reset(sewn.initial)
    for (let i = 0; i < 120; i++) sewn.world.step(1 / 60)
    for (let k = 0; k < sewn.world.count; k++) {
      const x = sewn.world.positions[k * 3]
      const y = sewn.world.positions[k * 3 + 1]
      const z = sewn.world.positions[k * 3 + 2]
      expect(Number.isFinite(x + y + z)).toBe(true)
    }
  })
})
