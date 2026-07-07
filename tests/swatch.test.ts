import { describe, it, expect } from 'vitest'
import {
  luminance,
  averageColor,
  edgeBlendAlpha,
  makeSeamless,
  normalFromLuma,
  estimateRoughness
} from '../src/renderer/fabric/swatch'

// Mean absolute difference between the left and right edge columns of an RGBA tile.
function edgeMAD(data: Uint8ClampedArray | number[], w: number, h: number): number {
  let sum = 0
  for (let y = 0; y < h; y++) {
    const l = (y * w + 0) * 4
    const r = (y * w + (w - 1)) * 4
    for (let c = 0; c < 3; c++) sum += Math.abs(data[l + c] - data[r + c])
  }
  return sum / (h * 3)
}

describe('fabric swatch → tiling PBR', () => {
  it('luminance weights green most and stays within [0,255]', () => {
    expect(luminance(0, 0, 0)).toBe(0)
    expect(luminance(255, 255, 255)).toBeCloseTo(255, 5)
    expect(luminance(0, 255, 0)).toBeGreaterThan(luminance(255, 0, 0))
    expect(luminance(255, 0, 0)).toBeGreaterThan(luminance(0, 0, 255))
  })

  it('averageColor returns the mean packed RGB', () => {
    // two pixels: black + white → mid grey (0x7f7f7f, rounded)
    const two = [0, 0, 0, 255, 255, 255, 255, 255]
    expect(averageColor(two)).toBe(0x808080) // round(127.5)=128
    const red = [200, 10, 10, 255]
    expect(averageColor(red)).toBe((200 << 16) | (10 << 8) | 10)
  })

  it('edgeBlendAlpha is 0.5 at the edge (50/50 mix) and 0 at the band inner end', () => {
    expect(edgeBlendAlpha(0, 4)).toBe(0.5)
    expect(edgeBlendAlpha(2, 4)).toBeCloseTo(0.25, 5)
    expect(edgeBlendAlpha(4, 4)).toBe(0)
    expect(edgeBlendAlpha(0, 0)).toBe(0) // degenerate band
  })

  it('makeSeamless heals a hard vertical seam (opposite edges converge)', () => {
    const w = 16
    const h = 16
    // left half black, right half white — a maximal repeat seam
    const src = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = x < w / 2 ? 0 : 255
        const i = (y * w + x) * 4
        src[i] = src[i + 1] = src[i + 2] = v
        src[i + 3] = 255
      }
    }
    const before = edgeMAD(src, w, h)
    const out = makeSeamless(src, w, h)
    const after = edgeMAD(out, w, h)
    expect(before).toBeGreaterThan(200) // 0 vs 255
    expect(after).toBeLessThan(before * 0.2) // dramatically reduced
    expect(after).toBeLessThan(20)
  })

  it('makeSeamless leaves a flat image unchanged', () => {
    const w = 8
    const h = 8
    const src = new Uint8ClampedArray(w * h * 4).fill(120)
    for (let i = 3; i < src.length; i += 4) src[i] = 255
    const out = makeSeamless(src, w, h)
    for (let i = 0; i < src.length; i++) expect(out[i]).toBe(src[i])
  })

  it('normalFromLuma yields the neutral up-normal for a flat field', () => {
    const w = 8
    const h = 8
    const flat = new Float32Array(w * h).fill(0.5)
    const n = normalFromLuma(flat, w, h, 4)
    for (let p = 0; p < w * h; p++) {
      expect(n[p * 4]).toBeCloseTo(128, -1) // R ≈ 128 (nx≈0)
      expect(n[p * 4 + 1]).toBeCloseTo(128, -1) // G ≈ 128 (ny≈0)
      expect(n[p * 4 + 2]).toBeGreaterThan(200) // B high (nz≈1)
    }
  })

  it('normalFromLuma tilts against an increasing-x luminance ramp', () => {
    const w = 8
    const h = 8
    const ramp = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) ramp[y * w + x] = x / (w - 1)
    const n = normalFromLuma(ramp, w, h, 4)
    // interior pixel (avoid the wrap column) — brighter to the right → normal tilts -x → R < 128
    const i = (3 * w + 3) * 4
    expect(n[i]).toBeLessThan(128)
    expect(n[i + 1]).toBeCloseTo(128, -1) // no y gradient
  })

  it('estimateRoughness falls as the swatch gets brighter, clamped to a cloth band', () => {
    const dark = new Uint8ClampedArray(16).fill(20)
    const bright = new Uint8ClampedArray(16).fill(240)
    for (let i = 3; i < 16; i += 4) { dark[i] = 255; bright[i] = 255 }
    const rd = estimateRoughness(dark)
    const rb = estimateRoughness(bright)
    expect(rd).toBeGreaterThan(rb)
    for (const r of [rd, rb]) {
      expect(r).toBeGreaterThanOrEqual(0.45)
      expect(r).toBeLessThanOrEqual(0.92)
    }
  })
})
