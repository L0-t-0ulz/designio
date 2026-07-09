import type { CameraPose } from './timeline'

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
}

/**
 * Record a turntable spin of the live canvas to a WebM Blob: orbit the camera a
 * full `turns` around the current subject over `seconds`, applying each pose via
 * `apply`, while a `MediaRecorder` captures the canvas stream. Browser-only — the
 * pure `turntablePose` above is what carries the unit-tested correctness.
 */
export function recordTurntable(
  canvas: HTMLCanvasElement,
  base: CameraPose,
  apply: (p: CameraPose) => void,
  opts: TurntableOptions = {}
): Promise<Blob> {
  const seconds = Math.max(1, opts.seconds ?? 6)
  const fps = opts.fps ?? 30
  const turns = opts.turns ?? 1
  const stream = canvas.captureStream(fps)
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
