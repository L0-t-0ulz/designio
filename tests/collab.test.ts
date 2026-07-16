import { describe, it, expect } from 'vitest'
import { nextLamport, mergeOps, applyOps, activePeers, peerColor, type CollabOp, type Presence } from '../src/renderer/studio/collab'

describe('real-time collaboration', () => {
  it('the Lamport clock advances past the max of local + remote', () => {
    expect(nextLamport(3, 5)).toBe(6)
    expect(nextLamport(9, 2)).toBe(10)
    expect(nextLamport(0)).toBe(1)
  })

  it('merges concurrent edits last-writer-wins per field', () => {
    const a: CollabOp[] = [{ path: 'layer0.color', value: 0x111111, ts: 1, author: 'ada' }]
    const b: CollabOp[] = [{ path: 'layer0.color', value: 0x222222, ts: 2, author: 'ben' }]
    const merged = mergeOps(a, b)
    expect(merged).toHaveLength(1)
    expect(merged[0].value).toBe(0x222222) // ben's later edit wins
  })

  it('breaks ties by author so all peers converge to the same result', () => {
    const a: CollabOp[] = [{ path: 'fabric', value: 'denim', ts: 5, author: 'ada' }]
    const b: CollabOp[] = [{ path: 'fabric', value: 'satin', ts: 5, author: 'ben' }]
    // order of the streams must not matter
    expect(mergeOps(a, b)[0].value).toBe(mergeOps(b, a)[0].value)
    expect(mergeOps(a, b)[0].author).toBe('ben') // higher author id wins the tie
  })

  it('keeps non-conflicting edits from every peer', () => {
    const merged = mergeOps(
      [{ path: 'a', value: 1, ts: 1, author: 'x' }],
      [{ path: 'b', value: 2, ts: 2, author: 'y' }]
    )
    const state = applyOps({}, merged)
    expect(state).toEqual({ a: 1, b: 2 })
  })

  it('presence lists only peers seen recently, colour-coded stably', () => {
    const now = 100000
    const peers: Presence[] = [
      { author: 'ada', color: 0, lastSeen: now - 2000 },
      { author: 'ben', color: 0, lastSeen: now - 60000 } // idle
    ]
    const live = activePeers(peers, now, 15000)
    expect(live.map((p) => p.author)).toEqual(['ada'])
    // a name maps to a stable colour
    expect(peerColor('ada')).toBe(peerColor('ada'))
    expect(peerColor('ada')).not.toBe(peerColor('ben'))
  })
})
