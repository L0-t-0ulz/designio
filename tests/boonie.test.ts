import { describe, it, expect } from 'vitest'
import { boonieBrimLift, BOONIE_SNAPS, BOONIE, CHIN_CORD } from '../src/renderer/avatar/boonie'

describe('the boonie hat — snap-up brim + chin cord', () => {
  it('unsnapped, the whole brim droops gently', () => {
    for (let az = 0; az < Math.PI * 2; az += 0.1) {
      expect(boonieBrimLift(az, 'none')).toBeLessThan(0)
    }
  })

  it('a left snap sweeps that side up while the other keeps drooping', () => {
    expect(boonieBrimLift(Math.PI / 2, 'left')).toBeGreaterThan(0.4)
    expect(boonieBrimLift(-Math.PI / 2, 'left')).toBeLessThan(0)
    expect(boonieBrimLift(0, 'left')).toBeLessThan(0) // the front stays down
  })

  it("'right' mirrors 'left'; 'both' raises both sides symmetrically", () => {
    expect(boonieBrimLift(-Math.PI / 2, 'right')).toBeCloseTo(boonieBrimLift(Math.PI / 2, 'left'), 10)
    expect(boonieBrimLift(Math.PI / 2, 'both')).toBeCloseTo(boonieBrimLift(-Math.PI / 2, 'both'), 10)
    expect(boonieBrimLift(Math.PI / 2, 'both')).toBeGreaterThan(0.4)
  })

  it('every state stays bounded across the sweep', () => {
    for (const s of BOONIE_SNAPS) {
      for (let az = 0; az < Math.PI * 2; az += 0.05) {
        const l = boonieBrimLift(az, s)
        expect(l).toBeGreaterThanOrEqual(-0.14)
        expect(l).toBeLessThanOrEqual(0.64)
      }
    }
  })

  it('the chin cord hangs from the brim to below the chin, mirrored', () => {
    expect(CHIN_CORD.anchorL.x).toBeCloseTo(-CHIN_CORD.anchorR.x, 10)
    expect(CHIN_CORD.bead.y).toBeLessThan(-0.5) // under the chin
    expect(CHIN_CORD.tailEnd.y).toBeLessThan(CHIN_CORD.bead.y) // the tail hangs on
    expect(BOONIE.brimOuterR).toBeGreaterThan(BOONIE.brimInnerR)
  })
})
