import { describe, it, expect } from 'vitest'
import { POSES, POSE_NAMES, getPose } from '../src/renderer/avatar/poses'

describe('pose library', () => {
  it('exposes the lookbook pose set', () => {
    // a contains-check, not a frozen list: the set grows, and a hardcoded array
    // turns every new pose into an unrelated test edit while catching nothing
    for (const n of ['stand', 'weight-shift', 'stride', 'relaxed', 'contrapposto', 'hand-on-hip', 'arms-crossed', 'sitting']) {
      expect(POSE_NAMES, n).toContain(n)
    }
    expect(new Set(POSE_NAMES).size).toBe(POSE_NAMES.length)
  })

  it('every pose has a valid clip + phase in [0,1] and a stance', () => {
    for (const p of POSES) {
      expect(['idle', 'walk']).toContain(p.glb.clip)
      expect(p.glb.phase).toBeGreaterThanOrEqual(0)
      expect(p.glb.phase).toBeLessThanOrEqual(1)
      expect(p.label.length).toBeGreaterThan(0)
      expect(typeof p.proc.legL).toBe('number')
    }
  })

  it('stand is fully neutral', () => {
    const s = getPose('stand')
    expect(s.proc).toEqual({ legL: 0, legR: 0, armL: 0, armR: 0 })
    expect(s.glb).toEqual({ clip: 'idle', phase: 0 })
  })

  it('stride is a real mid-walk frame with split legs + counter-swung arms', () => {
    const s = getPose('stride')
    expect(s.glb.clip).toBe('walk')
    expect(Math.sign(s.proc.legL)).toBe(-Math.sign(s.proc.legR)) // legs split opposite
    expect(Math.sign(s.proc.armL)).toBe(-Math.sign(s.proc.legL)) // arm counter to same-side leg
  })

  it('getPose falls back to stand for an unknown name', () => {
    expect(getPose('nope' as never).name).toBe('stand')
  })
})
