/**
 * Fixed-timestep simulation loop with an accumulator, decoupled from the
 * (variable-rate) render. Physics always advances in equal `fixedDt` slices so
 * the cloth solve stays stable regardless of frame rate.
 */
export class Loop {
  readonly fixedDt: number
  private accumulator = 0
  private lastTime = 0
  private running = true
  private visible = true
  private started = false

  constructor(
    private readonly step: (dt: number) => void,
    private readonly render: () => void,
    fixedHz = 60
  ) {
    this.fixedDt = 1 / fixedHz
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.lastTime = performance.now() / 1000
    requestAnimationFrame(this.frame)
  }

  // Simulation time-scale (slow motion): 1 = real time, 0.25 = quarter speed. The
  // sim still advances in full-resolution fixedDt slices — playback just feeds the
  // accumulator slower, so a slow-mo clip gets 4× the temporal detail per second.
  private timeScale = 1
  setTimeScale(s: number): void {
    this.timeScale = Math.max(0.05, Math.min(1, s))
  }
  get currentTimeScale(): number {
    return this.timeScale
  }

  setRunning(running: boolean): void {
    this.running = running
    // Reset the clock so a long pause doesn't dump a burst of catch-up steps.
    this.lastTime = performance.now() / 1000
    this.accumulator = 0
  }

  isRunning(): boolean {
    return this.running
  }

  /** Pause all step + render work while the window is hidden/minimised (no point drawing
   *  or simulating a scene nobody can see); resume — resetting the clock so a long hide
   *  doesn't dump a burst of catch-up steps — when it's shown again. */
  setVisible(visible: boolean): void {
    this.visible = visible
    if (visible) {
      this.lastTime = performance.now() / 1000
      this.accumulator = 0
    }
  }

  /** Permanently stop the RAF loop (e.g. when disposing a preview scene). */
  stop(): void {
    this.stopped = true
  }

  private stopped = false
  private maxCatchUp = 8

  /**
   * Raise the per-frame catch-up cap (`?catchUp=` — capture tooling). Running
   * MORE fixed steps per rendered frame never changes the step sequence, only
   * how much wall time it takes: on a slow software rasterizer (CI's
   * SwiftShader renders ~1 fps) the default cap makes sim time crawl at ~13%
   * of wall time, so reaching a `freezeAt` mark dominates the render.
   */
  setCatchUp(steps: number): void {
    this.maxCatchUp = Math.max(1, Math.min(240, Math.round(steps)))
  }

  private frame = (): void => {
    if (this.stopped) return
    if (!this.visible) {
      // Hidden: do no step/render work, but keep the loop alive to resume when shown.
      requestAnimationFrame(this.frame)
      return
    }
    const now = performance.now() / 1000
    let frameTime = now - this.lastTime
    this.lastTime = now
    // clamp huge stalls (the clamp scales with a raised catch-up cap so the
    // accumulator can actually feed those extra steps)
    const maxFrame = Math.max(0.25, this.maxCatchUp * this.fixedDt)
    if (frameTime > maxFrame) frameTime = maxFrame

    if (this.running) {
      this.accumulator += frameTime * this.timeScale
      let n = 0
      while (this.accumulator >= this.fixedDt && n < this.maxCatchUp) {
        this.step(this.fixedDt)
        this.accumulator -= this.fixedDt
        n++
      }
    }

    this.render()
    requestAnimationFrame(this.frame)
  }
}
