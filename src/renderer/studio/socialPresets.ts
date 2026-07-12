/**
 * **Social video presets** — record the turntable spin straight into a platform's
 * frame: 9:16 for Reels/TikTok/Shorts, 1:1 and 4:5 for feeds, or the viewport's
 * native frame. The crop maths is pure (centre-crop the live canvas to the target
 * aspect, even pixel dimensions for the encoder); the recorder mirrors each frame
 * of the live canvas into an offscreen canvas of that shape and records *that*.
 */

export interface SocialPreset {
  name: string
  label: string
  /** Target aspect (w:h); null = the viewport's native frame. */
  aspect: { w: number; h: number } | null
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  { name: 'native', label: 'Viewport (native)', aspect: null },
  { name: 'reel', label: '9:16 — Reels · TikTok · Shorts', aspect: { w: 9, h: 16 } },
  { name: 'square', label: '1:1 — Square feed', aspect: { w: 1, h: 1 } },
  { name: 'portrait', label: '4:5 — Portrait feed', aspect: { w: 4, h: 5 } }
]

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

/** Centre-crop `srcW×srcH` to the `aw:ah` aspect — even dimensions (video encoders want them). */
export function cropRect(srcW: number, srcH: number, aw: number, ah: number): CropRect {
  const target = aw / ah
  let w = srcW
  let h = srcH
  if (srcW / srcH > target) w = srcH * target // too wide → trim the sides
  else h = srcW / target // too tall → trim top/bottom
  w = Math.max(2, Math.floor(w / 2) * 2)
  h = Math.max(2, Math.floor(h / 2) * 2)
  return { x: Math.floor((srcW - w) / 2), y: Math.floor((srcH - h) / 2), w, h }
}
