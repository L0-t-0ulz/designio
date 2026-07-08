import {
  timelineDuration,
  sampleTimeline,
  type Keyframe,
  type CameraPose,
  type TimelineSubject
} from './timeline'

interface PlayerHooks {
  applyCamera: (c: CameraPose) => void
  /** Apply the avatar subject (static pose or a live idle/walk) — called on segment change. */
  applySubject: (s: TimelineSubject) => void
  /** Playback progress (for the scrubber). */
  onFrame?: (time: number, total: number, playing: boolean) => void
}

/**
 * Drives a shot-sequencer timeline: eases the camera between keyframes each frame,
 * switches the avatar subject at segment boundaries, and can record the playback to
 * a WebM clip via the canvas capture stream. The timeline math itself is pure
 * (`timeline.ts`); this owns the transport (play/pause/seek/loop) + recording.
 */
export class TimelinePlayer {
  keyframes: Keyframe[] = []
  playing = false
  loop = false
  time = 0
  private lastSubject: TimelineSubject | null = null
  private onEnd: (() => void) | null = null

  constructor(private readonly hooks: PlayerHooks) {}

  get total(): number {
    return timelineDuration(this.keyframes)
  }

  play(): void {
    if (this.keyframes.length === 0) return
    if (this.time >= this.total) this.time = 0
    this.lastSubject = null // re-apply the current subject on resume
    this.playing = true
  }
  pause(): void {
    this.playing = false
    this.emit()
  }
  stop(): void {
    this.playing = false
    this.seek(0)
  }
  seek(t: number): void {
    this.time = Math.max(0, Math.min(this.total, t))
    this.lastSubject = null
    this.applySample()
    this.emit()
  }

  /** Advance playback (call each render frame with the frame delta in seconds). */
  tick(dt: number): void {
    if (!this.playing) return
    const total = this.total
    this.time += dt
    if (this.time >= total) {
      if (this.loop && total > 0) {
        this.time %= total
      } else {
        this.time = total
        this.playing = false
        this.applySample()
        this.emit()
        const cb = this.onEnd
        this.onEnd = null
        cb?.()
        return
      }
    }
    this.applySample()
    this.emit()
  }

  private applySample(): void {
    const s = sampleTimeline(this.keyframes, this.time)
    if (!s) return
    this.hooks.applyCamera(s.camera)
    if (s.subject !== this.lastSubject) {
      this.lastSubject = s.subject
      this.hooks.applySubject(s.subject)
    }
  }
  private emit(): void {
    this.hooks.onFrame?.(this.time, this.total, this.playing)
  }

  /**
   * Record one non-looping pass to a WebM blob via the canvas capture stream.
   * Resolves when playback reaches the end and the recorder flushes.
   */
  record(canvas: HTMLCanvasElement, fps = 30): Promise<Blob> {
    if (this.keyframes.length < 2) return Promise.reject(new Error('Need at least two keyframes to record.'))
    const stream = canvas.captureStream(fps)
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
    const chunks: BlobPart[] = []
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    return new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
      rec.onerror = () => reject(new Error('Recording failed'))
      this.loop = false
      this.stop()
      this.onEnd = () => setTimeout(() => rec.state !== 'inactive' && rec.stop(), 120) // flush the tail
      rec.start()
      this.play()
    })
  }
}
