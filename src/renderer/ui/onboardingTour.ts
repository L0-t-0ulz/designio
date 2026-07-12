/**
 * Onboarding tour & tips — a first-run guided walk-through of the studio. A spotlight
 * ring highlights each shell region while a tooltip card explains it (Back · Next ·
 * Skip). It runs once automatically on the first organic studio entry (never on a
 * snapshot deep-link) and is always re-openable from Help → Take the tour.
 *
 * The step-sequence + "already seen" logic is pure so it's unit-tested; the overlay
 * positioning is plain DOM layout.
 */

/** One coach-mark: the shell region it points at, and what to say about it. */
export interface TourStep {
  /** CSS selector of the element to spotlight (a shell region). */
  selector: string
  title: string
  body: string
}

/** The default first-run tour — one stop per shell region, in reading order. */
export const TOUR_STEPS: TourStep[] = [
  { selector: '.dio-shell-menubar', title: 'The menu bar', body: 'New, open & save your .dio project, run every export (patterns, tech-pack, renders) and undo/redo — all live here.' },
  { selector: '.dio-shell-left', title: 'The library', body: 'Browse garments, fabrics, avatars and presets. Search as you type, and filter fabrics by family, weight or stretch.' },
  { selector: '.dio-shell-center', title: 'The viewport', body: 'Your design in real-time 3D with live cloth physics. Switch to the 2D pattern tab, or the Render tab for a supersampled still.' },
  { selector: '.dio-shell-right', title: 'Layers & properties', body: 'The garments worn on the body stack here — add, hide or reorder them. The property editor below tunes the selected one.' },
  { selector: '.dio-shell-status', title: 'You are ready', body: 'The status bar shows the sim state and selection. Press ? any time for keyboard shortcuts. Happy designing!' }
]

const KEY = 'dio-tour-seen-v1'

/** Clamp a step index into a valid [0, len-1] range (empty tour → 0). */
export function clampStep(i: number, len: number): number {
  if (len <= 0) return 0
  return Math.max(0, Math.min(len - 1, Math.floor(i)))
}

/** Progress flags + a human "Step i of n" label for the tooltip footer. */
export function tourProgress(i: number, len: number): { atStart: boolean; atEnd: boolean; label: string } {
  const c = clampStep(i, len)
  return { atStart: c <= 0, atEnd: c >= len - 1, label: `${len === 0 ? 0 : c + 1} of ${len}` }
}

/** First run? True when the "seen" flag has never been set (any truthy value = seen). */
export function shouldAutoStartTour(seen: string | null): boolean {
  return !seen
}

/** Whether the tour has already been shown on this machine. */
export function hasSeenTour(): boolean {
  try {
    return !shouldAutoStartTour(localStorage.getItem(KEY))
  } catch {
    return true // storage blocked → don't nag
  }
}

/** Remember the tour has been shown so it doesn't auto-start again. */
export function markTourSeen(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* storage blocked — nothing to persist */
  }
}

let active: { root: HTMLElement; onResize: () => void } | null = null

/** True while the tour overlay is open. */
export function tourOpen(): boolean {
  return active !== null
}

/** Force-close the tour (Esc / cleanup). */
export function closeTour(): void {
  if (!active) return
  window.removeEventListener('resize', active.onResize)
  active.root.remove()
  active = null
}

/**
 * Start the guided tour. Mounts a dimming spotlight + a tooltip card that walks the
 * `steps` whose target elements exist (missing regions are skipped). Marks the tour
 * seen on finish or skip, then calls `onDone`.
 */
export function startTour(steps: TourStep[] = TOUR_STEPS, onDone?: () => void): void {
  closeTour()
  // Keep only the steps whose target is actually on screen.
  const live = steps.filter((s) => document.querySelector(s.selector))
  if (live.length === 0) {
    markTourSeen()
    onDone?.()
    return
  }

  const root = document.createElement('div')
  root.className = 'dio-tour-overlay'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'Studio tour')

  const spot = document.createElement('div')
  spot.className = 'dio-tour-spot'
  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card dio-tour-card'
  root.append(spot, card)
  document.body.appendChild(root)

  let i = 0

  const finish = (): void => {
    markTourSeen()
    closeTour()
    onDone?.()
  }

  const render = (): void => {
    i = clampStep(i, live.length)
    const step = live[i]
    const target = document.querySelector(step.selector) as HTMLElement | null
    const prog = tourProgress(i, live.length)

    // Spotlight the target region (a bright ring; the big spread shadow dims the rest).
    if (target) {
      const r = target.getBoundingClientRect()
      const pad = 4
      spot.style.display = 'block'
      spot.style.left = `${r.left - pad}px`
      spot.style.top = `${r.top - pad}px`
      spot.style.width = `${r.width + pad * 2}px`
      spot.style.height = `${r.height + pad * 2}px`
    } else {
      spot.style.display = 'none'
    }

    card.innerHTML = ''
    const h = document.createElement('h2')
    h.textContent = step.title
    const p = document.createElement('p')
    p.className = 'dio-tour-body'
    p.textContent = step.body
    const foot = document.createElement('div')
    foot.className = 'dio-tour-foot'
    const count = document.createElement('span')
    count.className = 'dio-tour-count'
    count.textContent = prog.label
    const actions = document.createElement('div')
    actions.className = 'dio-actions'

    const skip = document.createElement('button')
    skip.className = 'dio-btn'
    skip.textContent = 'Skip'
    skip.onclick = finish

    const back = document.createElement('button')
    back.className = 'dio-btn'
    back.textContent = 'Back'
    back.disabled = prog.atStart
    back.onclick = () => { i -= 1; render() }

    const next = document.createElement('button')
    next.className = 'dio-btn primary'
    next.textContent = prog.atEnd ? 'Done' : 'Next'
    next.onclick = () => { if (prog.atEnd) finish(); else { i += 1; render() } }

    actions.append(skip, back, next)
    foot.append(count, actions)
    card.append(h, p, foot)

    // Place the card beside the spotlight, kept on-screen.
    const cr = card.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = vw / 2 - cr.width / 2
    let top = vh / 2 - cr.height / 2
    if (target) {
      const r = target.getBoundingClientRect()
      const gap = 14
      if (r.right + gap + cr.width < vw) left = r.right + gap // to the right
      else if (r.left - gap - cr.width > 0) left = r.left - gap - cr.width // to the left
      else left = Math.min(Math.max(8, r.left), vw - cr.width - 8)
      top = Math.min(Math.max(8, r.top), vh - cr.height - 8)
    }
    card.style.left = `${Math.round(left)}px`
    card.style.top = `${Math.round(top)}px`
  }

  const onResize = (): void => render()
  window.addEventListener('resize', onResize)
  active = { root, onResize }
  render()
}
