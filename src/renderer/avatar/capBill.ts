/**
 * The **cap bill designer** — the baseball cap's visor as parameters: a
 * flat ↔ pre-curved slider, a contrast underbill, and the squatchee (the
 * crown button). Pure unit-disc math (x = lateral, y = forward over the
 * half-disc bill, 1 unit = the bill radius) consumed by the accessory
 * builder; the geometry is built in the renderer.
 */
export interface CapBillParams {
  /** 0 = dead flat (fresh-out-the-box) … 1 = fully pre-curved. */
  curve: number
  /** Contrast underbill colour; unset = self-colour. */
  underbill?: number
  /** The crown button. */
  squatchee: boolean
}
export const DEFAULT_CAP_BILL: CapBillParams = { curve: 0.45, squatchee: true }

/** The classic contrast underbill grey-green. */
export const UNDERBILL_CLASSIC = 0x5e7160

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

/**
 * How far the bill surface drops (unit bill radii) at unit-disc point
 * (x lateral, y forward): a cylindrical curl around the forward axis whose
 * edges roll down, tapered to zero at the rear (sewn) edge so the bill stays
 * attached to the crown. Pure; zero when flat.
 */
export function billCurl(x: number, y: number, curve: number): number {
  return clamp01(curve) * 0.38 * x * x * clamp01(y)
}
