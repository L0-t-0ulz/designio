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
    if (frameTime > 0.25) frameTime = 0.25 // clamp huge stalls

    if (this.running) {
      this.accumulator += frameTime * this.timeScale
      let n = 0
      while (this.accumulator >= this.fixedDt && n < 8) {
        this.step(this.fixedDt)
        this.accumulator -= this.fixedDt
        n++
      }
    }

    this.render()
    requestAnimationFrame(this.frame)
  }
}
