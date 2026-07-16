/**
 * **Interactive tutorial mode** — a hands-on first-design checklist (distinct from
 * the passive region tour and the pattern-making lessons): a sequence of DO-THIS
 * tasks that tick off as you actually do them in the studio. The task model + the
 * progress/next helpers are pure (a `TutorialContext` snapshot of what the user has
 * done), so they're unit-tested; `ui/tutorialOverlay` renders the live checklist.
 */

/** A snapshot of the design state the tutorial checks its tasks against. */
export interface TutorialContext {
  /** The active fabric differs from the garment's default (the user chose one). */
  fabricChosen: boolean
  /** How many prints are on the active garment. */
  prints: number
  /** A surface finish is applied (textile / ombré / wear / sparkle / …). */
  hasFinish: boolean
  /** How many colourways have been saved. */
  colorways: number
  /** The user has run at least one export. */
  exported: boolean
}

export interface TutorialTask {
  id: string
  title: string
  hint: string
  done: (c: TutorialContext) => boolean
}

export const TUTORIAL_TASKS: TutorialTask[] = [
  { id: 'fabric', title: 'Choose a fabric', hint: 'Open the Library → Fabrics and pick a cloth — watch the drape change.', done: (c) => c.fabricChosen },
  { id: 'print', title: 'Add a print', hint: 'In the Property Editor, add a text or logo print to the garment.', done: (c) => c.prints > 0 },
  { id: 'finish', title: 'Try a surface finish', hint: 'Apply a finish in Appearance — a stripe pattern, an ombré, a wash…', done: (c) => c.hasFinish },
  { id: 'colorway', title: 'Save a colourway', hint: 'Capture a colour variant of your design so you can compare looks.', done: (c) => c.colorways > 0 },
  { id: 'export', title: 'Export your design', hint: 'File → Export — try a tech pack, a product page or a render.', done: (c) => c.exported }
]

/** The first task not yet done, or undefined when the tutorial is complete. Pure. */
export function nextIncompleteTask(c: TutorialContext, tasks: TutorialTask[] = TUTORIAL_TASKS): TutorialTask | undefined {
  return tasks.find((t) => !t.done(c))
}

/** How many tasks are done, and whether the tutorial is complete. Pure. */
export function tutorialProgress(c: TutorialContext, tasks: TutorialTask[] = TUTORIAL_TASKS): { done: number; total: number; complete: boolean } {
  const done = tasks.filter((t) => t.done(c)).length
  return { done, total: tasks.length, complete: done === tasks.length }
}
