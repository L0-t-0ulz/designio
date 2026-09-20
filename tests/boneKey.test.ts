import { describe, it, expect } from 'vitest'
import { boneKey } from '../src/renderer/avatar/GlbMannequin'

/**
 * The bone-name classifier, against the names a real Mixamo rig ships with —
 * because the bug this covers was a regex that could not match any of them, and
 * nothing said so: a capsule whose bones are missing is skipped silently.
 */
describe('boneKey — Mixamo names', () => {
  it('finds the upper arm and the shin, which the guarded patterns could not', () => {
    // `(^|[^a-z])arm` cannot match `…leftarm`: the character before `arm` is the
    // `t` of `Left`. Same for `leg`. Both were silently unmapped.
    expect(boneKey('mixamorigLeftArm')).toBe('lArm')
    expect(boneKey('mixamorigRightArm')).toBe('rArm')
    expect(boneKey('mixamorigLeftLeg')).toBe('lLeg')
    expect(boneKey('mixamorigRightLeg')).toBe('rLeg')
  })

  it('keeps the specific segments ahead of the general ones', () => {
    // the ordering is what lets `arm` and `leg` be bare words
    expect(boneKey('mixamorigLeftForeArm')).toBe('lFore')
    expect(boneKey('mixamorigRightForeArm')).toBe('rFore')
    expect(boneKey('mixamorigLeftUpLeg')).toBe('lUpLeg')
    expect(boneKey('mixamorigRightUpLeg')).toBe('rUpLeg')
  })

  it('maps the rest of the standard chain', () => {
    expect(boneKey('mixamorigHips')).toBe('hips')
    expect(boneKey('mixamorigSpine2')).toBe('chest')
    expect(boneKey('mixamorigNeck')).toBe('neck')
    expect(boneKey('mixamorigHead')).toBe('head')
    expect(boneKey('mixamorigLeftShoulder')).toBe('lShoulder')
    expect(boneKey('mixamorigLeftHand')).toBe('lHand')
    expect(boneKey('mixamorigLeftFoot')).toBe('lFoot')
    expect(boneKey('mixamorigLeftToeBase')).toBe('lToe')
    expect(boneKey('mixamorigLeftHandMiddle1')).toBe('lMid')
    expect(boneKey('mixamorigLeftHandMiddle4')).toBe('lMidTip')
  })

  it('classifies every bone of a standard rig it needs, and no chain is broken', () => {
    // the failure mode is a chain with a hole in it — an upper arm that resolves
    // and a forearm that does not — so assert the chains whole
    const chain = (side: 'Left' | 'Right') => [
      boneKey(`mixamorig${side}Shoulder`),
      boneKey(`mixamorig${side}Arm`),
      boneKey(`mixamorig${side}ForeArm`),
      boneKey(`mixamorig${side}Hand`),
      boneKey(`mixamorig${side}UpLeg`),
      boneKey(`mixamorig${side}Leg`),
      boneKey(`mixamorig${side}Foot`),
      boneKey(`mixamorig${side}ToeBase`)
    ]
    for (const side of ['Left', 'Right'] as const) {
      const got = chain(side)
      expect(got.every((k) => k !== undefined), `${side}: ${got.join(',')}`).toBe(true)
      expect(new Set(got).size).toBe(got.length) // and no two bones claim the same slot
    }
  })

  it('handles the prefixed and the underscore-suffixed naming conventions too', () => {
    expect(boneKey('mixamorig:LeftArm')).toBe('lArm')
    expect(boneKey('upper_arm_L')).toBe('lArm')
    expect(boneKey('shin_R')).toBe('rLeg')
    expect(boneKey('thigh.L')).toBe('lUpLeg')
  })

  it('returns undefined for bones that are not part of the standard set', () => {
    expect(boneKey('Armature')).toBeUndefined() // matches `arm`, but has no side
    expect(boneKey('mixamorigSpine')).toBeUndefined()
    expect(boneKey('SomeProp')).toBeUndefined()
  })

  it('does not let a finger or toe steal the hand or the foot', () => {
    // `HandIndex1` contains `hand`; the parent is traversed first and wins, but the
    // tip patterns must not claim it either
    expect(boneKey('mixamorigLeftHandIndex1')).toBe('lHand')
    expect(boneKey('mixamorigLeftToe_End')).toBe('lToe')
  })
})
