/**
 * **Headless render API** — a small programmatic interface for batch-rendering
 * designs without the GUI: describe render *jobs* as data (garment · fabric · finish ·
 * pose · lighting · view · output), turn each into the deterministic capture deep-link
 * the offscreen renderer already understands, and validate a whole manifest. Pure (no
 * Electron/DOM) so the query-building + parsing are unit-tested; `scripts/render.cjs`
 * drives the actual frames.
 */
export interface RenderJob {
  /** Output filename (png). */
  out: string
  garment?: string
  fabric?: string
  color?: number
  view?: '3d' | 'pattern' | 'render'
  pose?: string
  light?: string
  backdrop?: string
  anim?: 'idle' | 'walk' | 'turn'
  /** A surface finish token, e.g. `sparkle=sequins` or `ombre=top-down`. */
  finish?: string
  /** Frame-settle wait, ms (default 6000). */
  waitMs?: number
}

/** The `?…` deep-link (without the leading `?`) for a render job — always `start=0`
 *  and, for the pattern/render views, the matching `view=`. Deterministic + pure. */
export function renderJobToQuery(job: RenderJob): string {
  const p: string[] = ['start=0']
  if (job.garment) p.push(`garment=${encodeURIComponent(job.garment)}`)
  if (job.fabric) p.push(`fabric=${encodeURIComponent(job.fabric)}`)
  if (typeof job.color === 'number') p.push(`color=${(job.color >>> 0).toString(16).padStart(6, '0').slice(-6)}`)
  if (job.view === 'pattern') p.push('view=pattern')
  else if (job.view === 'render') p.push('view=render')
  if (job.pose) p.push(`pose=${encodeURIComponent(job.pose)}`)
  if (job.anim) p.push(`anim=${job.anim}`)
  if (job.light) p.push(`light=${encodeURIComponent(job.light)}`)
  if (job.backdrop) p.push(`backdrop=${encodeURIComponent(job.backdrop)}`)
  if (job.finish) p.push(job.finish.replace(/^[?&]/, ''))
  return p.join('&')
}

/** The settle-wait for a job, clamped to a sane band (turntable/pattern need less). Pure. */
export function renderJobWait(job: RenderJob): number {
  if (job.waitMs != null) return Math.max(500, Math.min(90000, job.waitMs))
  if (job.view === 'pattern') return 4500
  if (job.anim === 'turn') return 3500
  return 6000
}

export interface RenderManifest {
  jobs: RenderJob[]
}

/**
 * Parse + validate a render manifest (from JSON): each job must have a non-empty
 * `.out` ending in `.png`; unknown fields are dropped. Throws on a structurally
 * invalid manifest. Pure.
 */
export function parseRenderManifest(raw: unknown): RenderManifest {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as RenderManifest).jobs)) {
    throw new Error('Render manifest must be { "jobs": [ … ] }')
  }
  const jobs: RenderJob[] = []
  for (const j of (raw as RenderManifest).jobs) {
    if (!j || typeof j.out !== 'string' || !/\.png$/i.test(j.out)) {
      throw new Error(`Each job needs an "out" ending in .png (got ${JSON.stringify(j?.out)})`)
    }
    jobs.push({
      out: j.out,
      garment: typeof j.garment === 'string' ? j.garment : undefined,
      fabric: typeof j.fabric === 'string' ? j.fabric : undefined,
      color: typeof j.color === 'number' ? j.color : undefined,
      view: j.view === 'pattern' || j.view === 'render' ? j.view : undefined,
      pose: typeof j.pose === 'string' ? j.pose : undefined,
      light: typeof j.light === 'string' ? j.light : undefined,
      backdrop: typeof j.backdrop === 'string' ? j.backdrop : undefined,
      anim: j.anim === 'idle' || j.anim === 'walk' || j.anim === 'turn' ? j.anim : undefined,
      finish: typeof j.finish === 'string' ? j.finish : undefined,
      waitMs: typeof j.waitMs === 'number' ? j.waitMs : undefined
    })
  }
  return { jobs }
}
