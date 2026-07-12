import type { CameraPose } from './timeline'
import { cropRect } from './socialPresets'

/**
 * The camera pose at `t01` (0→1) of a turntable spin: the base pose with its
 * azimuth advanced by `t01 * turns` full revolutions. The subject stays put;
 * the camera orbits it. Pure, so the spin path is unit-tested (the recorder
 * below just replays it against the live canvas).
 */
export function turntablePose(base: CameraPose, t01: number, turns = 1): CameraPose {
  return {
    azimuth: base.azimuth + t01 * turns * Math.PI * 2,
    polar: base.polar,
    distance: base.distance,
    target: [base.target[0], base.target[1], base.target[2]]
  }
}

/** Number of frames in a `seconds`-long spin at `fps` (at least 2). */
export function turntableFrameCount(seconds: number, fps: number): number {
  return Math.max(2, Math.round(seconds * fps))
}

export interface TurntableOptions {
  seconds?: number
  fps?: number
  turns?: number
  /** Crop the recording to a social aspect (e.g. 9:16); omit = the canvas's native frame. */
  aspect?: { w: number; h: number }
  /** Accumulation motion blur — each frame blends over a fading trail of the previous ones. */
  motionBlur?: boolean
}

/** The per-frame blend alpha for the accumulation trail: stronger blur = more of the
 *  old frames survive (lower alpha). Clamped so the image always converges. */
export function trailAlpha(strength = 0.5): number {
  return Math.max(0.2, Math.min(1, 1 - 0.72 * Math.max(0, Math.min(1, strength))))
}

/**
 * Record a turntable spin of the live canvas to a WebM Blob: orbit the camera a
 * full `turns` around the current subject over `seconds`, applying each pose via
 * `apply`, while a `MediaRecorder` captures the canvas stream. Browser-only — the
 * pure `turntablePose` above is what carries the unit-tested correctness.
 */
/** Record the live canvas as-is for `seconds` (no camera move) — slow-motion clips
 *  pair this with `Loop.setTimeScale`. Same recorder/bitrate as the turntable. */
export function recordClip(canvas: HTMLCanvasElement, seconds: number, fps = 30): Promise<Blob> {
  const stream = canvas.captureStream(fps)
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
  const stopStream = (): void => stream.getTracks().forEach((t) => t.stop())
  return new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => {
      stopStream()
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
    rec.onerror = () => {
      stopStream()
      reject(new Error('Recording failed'))
    }
    rec.start()
    setTimeout(() => rec.state !== 'inactive' && rec.stop(), Math.max(1, seconds) * 1000)
  })
}

export function recordTurntable(
  canvas: HTMLCanvasElement,
  base: CameraPose,
  apply: (p: CameraPose) => void,
  opts: TurntableOptions = {}
): Promise<Blob> {
  const seconds = Math.max(1, opts.seconds ?? 6)
  const fps = opts.fps ?? 30
  const turns = opts.turns ?? 1
  // Social aspect: mirror each frame into an offscreen canvas cropped to the target
  // shape and record THAT stream (the live viewport keeps its own frame).
  let source = canvas
  let mirror: (() => void) | null = null
  if (opts.aspect || opts.motionBlur) {
    const crop = opts.aspect ? cropRect(canvas.width, canvas.height, opts.aspect.w, opts.aspect.h) : { x: 0, y: 0, w: canvas.width, h: canvas.height }
    const off = document.createElement('canvas')
    off.width = crop.w
    off.height = crop.h
    const ctx = off.getContext('2d')!
    const alpha = opts.motionBlur ? trailAlpha() : 1
    mirror = () => {
      ctx.globalAlpha = alpha // < 1 leaves a fading trail of the previous frames = motion blur
      ctx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
    }
    ctx.globalAlpha = 1
    ctx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h) // seed frame 0 solid
    source = off
  }
  const stream = source.captureStream(fps)
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
  const stopStream = (): void => stream.getTracks().forEach((t) => t.stop()) // release the canvas capture
  return new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => {
      stopStream()
      resolve(new Blob(chunks, { type: 'video/webm' }))
    }
    rec.onerror = () => {
      stopStream()
      reject(new Error('Recording failed'))
    }
    const start = performance.now()
    const frame = (): void => {
      const t01 = Math.min(1, (performance.now() - start) / (seconds * 1000))
      apply(turntablePose(base, t01, turns))
      mirror?.() // copy the freshly-applied frame into the cropped recording canvas
      if (t01 >= 1) {
        setTimeout(() => rec.state !== 'inactive' && rec.stop(), 120) // flush the tail, then stop
        return
      }
      requestAnimationFrame(frame)
    }
    rec.start()
    requestAnimationFrame(frame)
  })
}
