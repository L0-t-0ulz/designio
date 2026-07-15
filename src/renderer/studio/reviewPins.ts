/**
 * **Design comments & review pins** — a lightweight review layer: comments pinned
 * to the design, each with an author and an **open / resolved** status, so a design
 * review is a tracked checklist instead of scattered notes. A pin optionally carries
 * a 3D point (where on the model it refers to) for the viewport to render. The store
 * is pure (plain `{x,y,z}` points, deterministic ids) so it's unit-tested; like the
 * measure/annotation tools it lives in-memory for the review session.
 */
export type ReviewStatus = 'open' | 'resolved'

export interface Point3 {
  x: number
  y: number
  z: number
}

export interface ReviewPin {
  id: string
  text: string
  author: string
  status: ReviewStatus
  /** Where on the model the comment refers to (optional — a general comment has none). */
  point?: Point3
}

let seq = 0

/** In-memory store of design-review pins (add · resolve · reopen · remove). Pure. */
export class ReviewStore {
  readonly pins: ReviewPin[] = []

  add(text: string, author = 'You', point?: Point3): ReviewPin {
    const pin: ReviewPin = { id: `r${++seq}`, text: text.trim(), author: author.trim() || 'You', status: 'open', point: point ? { ...point } : undefined }
    this.pins.push(pin)
    return pin
  }

  resolve(id: string): void {
    const p = this.pins.find((x) => x.id === id)
    if (p) p.status = 'resolved'
  }

  reopen(id: string): void {
    const p = this.pins.find((x) => x.id === id)
    if (p) p.status = 'open'
  }

  remove(id: string): void {
    const i = this.pins.findIndex((x) => x.id === id)
    if (i >= 0) this.pins.splice(i, 1)
  }

  clear(): void {
    this.pins.length = 0
  }

  /** Pins filtered by status (or all). Open pins first, then resolved. */
  list(status?: ReviewStatus): ReviewPin[] {
    const arr = status ? this.pins.filter((p) => p.status === status) : this.pins.slice()
    return arr.sort((a, b) => (a.status === b.status ? 0 : a.status === 'open' ? -1 : 1))
  }

  /** How many comments are still open — the review is done when this hits 0. */
  get openCount(): number {
    return this.pins.filter((p) => p.status === 'open').length
  }

  get isEmpty(): boolean {
    return this.pins.length === 0
  }
}
