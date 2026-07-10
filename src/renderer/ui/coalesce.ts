/**
 * Frame-coalescing for continuous UI input.
 *
 * A slider drag fires an `input` event on every pixel; if each one triggers an expensive
 * rebuild (garment geometry, body MarchingCubes, cloth redrape, a canvas repaint) the drag
 * janks. `rafCoalesce` collapses a burst of calls within one animation frame into a single
 * deferred call carrying the **latest** arguments, so the heavy work runs at most once per
 * frame and always lands on the final value.
 */

/** A frame scheduler — real `requestAnimationFrame` in the app, a fake one in tests. */
export interface FrameScheduler {
  request(cb: () => void): number
  cancel(id: number): void
}

const defaultScheduler: FrameScheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id)
}

/** A coalesced callback: call it as often as you like; it runs once per frame. `.cancel()`
 *  drops any frame already pending (e.g. on teardown, before the target is torn down). */
export interface Coalesced<A extends unknown[]> {
  (...args: A): void
  cancel(): void
}

export function rafCoalesce<A extends unknown[]>(fn: (...args: A) => void, scheduler: FrameScheduler = defaultScheduler): Coalesced<A> {
  let id = 0 // rAF ids are always >= 1, so 0 reliably means "nothing pending"
  let latest: A | null = null
  const wrapped = ((...args: A) => {
    latest = args
    if (id) return // a frame is already queued — it'll pick up `latest`
    id = scheduler.request(() => {
      id = 0
      if (latest) fn(...latest)
    })
  }) as Coalesced<A>
  wrapped.cancel = () => {
    if (id) scheduler.cancel(id)
    id = 0
  }
  return wrapped
}
