import { TUTORIAL_TASKS, tutorialProgress, type TutorialContext } from './tutorial'

/**
 * The **interactive tutorial** panel — a live first-design checklist. Each task ticks
 * off as you do it in the studio; press Refresh (or reopen) to re-check. The task
 * model lives in `./tutorial` (pure, tested); this reads a live `TutorialContext`
 * from the studio. Open from Help → Interactive tutorial or `?tutorial=1`.
 */
let overlay: HTMLDivElement | null = null

export function tutorialModalOpen(): boolean {
  return overlay !== null
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeTutorial()
}

export function closeTutorial(): void {
  if (!overlay) return
  overlay.remove()
  overlay = null
  document.removeEventListener('keydown', onKey)
}

/** `getContext` is re-read on open + on Refresh so tasks tick off live. */
export function openTutorial(getContext: () => TutorialContext): void {
  if (overlay) return
  overlay = document.createElement('div')
  overlay.className = 'dio-shortcuts-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Interactive tutorial')
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeTutorial()
  })

  const card = document.createElement('div')
  card.className = 'dio-shortcuts-card'
  Object.assign(card.style, { maxWidth: '460px' })

  const h = document.createElement('h2')
  const sub = document.createElement('p')
  sub.className = 'dio-shortcuts-hint'
  const list = document.createElement('div')
  Object.assign(list.style, { margin: '8px 0 12px' })
  const refresh = document.createElement('button')
  refresh.className = 'dio-btn primary'
  refresh.textContent = 'Refresh progress'

  const render = (): void => {
    const c = getContext()
    const p = tutorialProgress(c)
    h.textContent = p.complete ? '🎉 Tutorial complete!' : 'Make your first design'
    sub.textContent = p.complete ? "You've done it all — you know the ropes. Keep designing!" : `${p.done} of ${p.total} done — do these in the studio, then Refresh:`
    list.textContent = ''
    for (const t of TUTORIAL_TASKS) {
      const done = t.done(c)
      const row = document.createElement('div')
      Object.assign(row.style, { display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.08)', opacity: done ? '0.6' : '1' })
      const mark = document.createElement('span')
      mark.textContent = done ? '✓' : '○'
      Object.assign(mark.style, { color: done ? '#4caf50' : '#8a8a95', fontWeight: '700', flex: '0 0 auto', width: '16px' })
      const body = document.createElement('div')
      const title = document.createElement('div')
      title.textContent = t.title
      if (done) title.style.textDecoration = 'line-through'
      body.appendChild(title)
      if (!done) {
        const hint = document.createElement('div')
        hint.textContent = t.hint
        Object.assign(hint.style, { fontSize: '12px', opacity: '0.65', marginTop: '2px' })
        body.appendChild(hint)
      }
      row.append(mark, body)
      list.appendChild(row)
    }
  }
  refresh.addEventListener('click', render)
  render()

  card.append(h, sub, list, refresh)
  overlay.appendChild(card)
  document.body.appendChild(overlay)
  document.addEventListener('keydown', onKey)
}
