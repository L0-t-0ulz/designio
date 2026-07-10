import { describe, it, expect } from 'vitest'
import { rafCoalesce, type FrameScheduler } from '../src/renderer/ui/coalesce'

/** A controllable stand-in for requestAnimationFrame: nothing runs until `flush()`. */
function fakeScheduler(): { sched: FrameScheduler; flush: () => void; pending: () => number } {
  let next = 1
  const queue = new Map<number, () => void>()
  const sched: FrameScheduler = {
    request: (cb) => {
      const id = next++
      queue.set(id, cb)
      return id
    },
    cancel: (id) => void queue.delete(id)
  }
  const flush = (): void => {
    const cbs = [...queue.values()]
    queue.clear()
    for (const cb of cbs) cb()
  }
  return { sched, flush, pending: () => queue.size }
}

describe('rafCoalesce', () => {
  it('collapses a burst of calls in one frame into a single run', () => {
    const { sched, flush } = fakeScheduler()
    let runs = 0
    const f = rafCoalesce(() => runs++, sched)
    f()
    f()
    f()
    expect(runs).toBe(0) // deferred — nothing runs synchronously
    flush()
    expect(runs).toBe(1) // three calls → one run
    f()
    flush()
    expect(runs).toBe(2) // a later burst schedules a fresh frame
  })

  it('runs with the most recent arguments (final drag value wins)', () => {
    const { sched, flush } = fakeScheduler()
    const seen: number[] = []
    const f = rafCoalesce((v: number) => seen.push(v), sched)
    f(1)
    f(2)
    f(3)
    flush()
    expect(seen).toEqual([3])
  })

  it('cancel() drops a pending frame so it never runs', () => {
    const { sched, flush, pending } = fakeScheduler()
    let runs = 0
    const f = rafCoalesce(() => runs++, sched)
    f()
    expect(pending()).toBe(1)
    f.cancel()
    expect(pending()).toBe(0)
    flush()
    expect(runs).toBe(0)
  })

  it('reschedules cleanly after a cancel', () => {
    const { sched, flush } = fakeScheduler()
    let runs = 0
    const f = rafCoalesce(() => runs++, sched)
    f()
    f.cancel()
    f() // a fresh call after cancelling must queue a new frame
    flush()
    expect(runs).toBe(1)
  })
})
