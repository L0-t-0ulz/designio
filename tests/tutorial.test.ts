import { describe, it, expect } from 'vitest'
import { TUTORIAL_TASKS, nextIncompleteTask, tutorialProgress, type TutorialContext } from '../src/renderer/ui/tutorial'

const ctx = (over: Partial<TutorialContext> = {}): TutorialContext => ({
  fabricChosen: false,
  prints: 0,
  hasFinish: false,
  colorways: 0,
  exported: false,
  ...over
})

describe('interactive tutorial mode', () => {
  it('starts with no tasks done and points at the first task', () => {
    const c = ctx()
    expect(tutorialProgress(c).done).toBe(0)
    expect(tutorialProgress(c).complete).toBe(false)
    expect(nextIncompleteTask(c)!.id).toBe('fabric')
  })

  it('ticks tasks off as the design state satisfies them', () => {
    expect(TUTORIAL_TASKS.find((t) => t.id === 'print')!.done(ctx({ prints: 2 }))).toBe(true)
    expect(TUTORIAL_TASKS.find((t) => t.id === 'finish')!.done(ctx({ hasFinish: true }))).toBe(true)
    expect(TUTORIAL_TASKS.find((t) => t.id === 'colorway')!.done(ctx({ colorways: 1 }))).toBe(true)
    const partial = ctx({ fabricChosen: true, prints: 1 })
    expect(tutorialProgress(partial).done).toBe(2)
    expect(nextIncompleteTask(partial)!.id).toBe('finish') // skips the done ones
  })

  it('is complete only when every task is satisfied', () => {
    const all = ctx({ fabricChosen: true, prints: 1, hasFinish: true, colorways: 1, exported: true })
    const p = tutorialProgress(all)
    expect(p.done).toBe(p.total)
    expect(p.complete).toBe(true)
    expect(nextIncompleteTask(all)).toBeUndefined()
  })

  it('every task has a distinct id, title and hint', () => {
    expect(new Set(TUTORIAL_TASKS.map((t) => t.id)).size).toBe(TUTORIAL_TASKS.length)
    for (const t of TUTORIAL_TASKS) {
      expect(t.title.length).toBeGreaterThan(0)
      expect(t.hint.length).toBeGreaterThan(0)
    }
  })
})
