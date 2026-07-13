/**
 * **Drape swatch** maths — a flat cloth square hung over a short rod (only the
 * middle third of the top row is pinned), so the unsupported shoulders fall and
 * fold by the fabric's real bendiness: the classic side-by-side drape test.
 * Pure grid + pin helpers are unit-tested; the comparator overlay runs two of
 * these squares live with `fabricToSolverParams`.
 */

/** Fill a flat vertical sheet: `w`×`h` metres, top edge at `topY`, centred on `cx`. */
export function fillSwatch(positions: Float32Array, nx: number, ny: number, w: number, h: number, topY: number, cx = 0): void {
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const k = (iy * nx + ix) * 3
      positions[k] = cx + (ix / (nx - 1) - 0.5) * w
      positions[k + 1] = topY - (iy / (ny - 1)) * h
      positions[k + 2] = 0
    }
  }
}

/** The short-rod pins: only the middle third of the top row is supported. */
export function rodPins(nx: number): number[] {
  const from = Math.floor(nx / 3)
  const to = Math.ceil((2 * nx) / 3)
  const out: number[] = []
  for (let ix = from; ix < to; ix++) out.push(ix)
  return out
}
