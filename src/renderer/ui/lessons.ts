/**
 * **Pattern-making lessons** — a curated set of short, practical lessons on drafting
 * and construction, so a self-taught designer can learn the craft inside the app.
 * Each lesson is a title, a difficulty, a one-line goal and a few numbered steps.
 * The data + lookup are pure (no DOM) so they're unit-tested; `ui/lessonsOverlay`
 * renders the reader.
 */
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced'
export const LESSON_LEVELS: LessonLevel[] = ['beginner', 'intermediate', 'advanced']

export interface Lesson {
  id: string
  title: string
  level: LessonLevel
  goal: string
  steps: string[]
}

export const LESSONS: Lesson[] = [
  {
    id: 'ease',
    title: 'Wearing ease vs design ease',
    level: 'beginner',
    goal: 'Understand why a garment is bigger than the body — and by how much.',
    steps: [
      'Measure the body girth (e.g. bust) — this is the finished-to-the-skin number.',
      'Add wearing ease so you can move and breathe (≈5 cm at the bust for a woven top).',
      'Add design ease for the intended look — 0 for bodycon, +15–30 cm for relaxed.',
      'In the studio, set the Ease slider and watch the drape change; negative ease = a compression fit.'
    ]
  },
  {
    id: 'dart',
    title: 'Reading and moving a dart',
    level: 'beginner',
    goal: 'See how a dart turns flat cloth into a 3D shape, and where it can live.',
    steps: [
      'A dart takes up fabric to curve flat cloth over the bust, waist or shoulder.',
      'The dart *intake* (how wide it is) controls how much shaping it adds.',
      'Darts can rotate around the bust point — waist dart, side dart, French dart — same shape, different seam.',
      'Toggle Dart in Construction and compare the fit heatmap with darts on vs off.'
    ]
  },
  {
    id: 'grainline',
    title: 'Grain, cross-grain and the bias',
    level: 'beginner',
    goal: 'Cut pieces the right way so they hang and stretch as intended.',
    steps: [
      'The grainline runs parallel to the selvedge (the warp) — pieces are cut aligned to it.',
      'The cross-grain (weft) has a little more give; the true bias (45°) stretches the most.',
      'Bias-cut pieces cling and drape — great for a slip dress, tricky to sew.',
      'Check the grainline arrow on each 2D pattern panel before you cut.'
    ]
  },
  {
    id: 'seam-allowance',
    title: 'Seam allowance and how it varies',
    level: 'beginner',
    goal: 'Add the right margin so seams can be sewn and finished.',
    steps: [
      'Seam allowance is the margin between the stitch line and the cut edge (often 1 cm).',
      'A hem needs more (2–4 cm to fold up); a curved neckline needs less (0.6 cm) so it turns smoothly.',
      'French and flat-fell seams need extra allowance — the app bumps it automatically per seam type.',
      'Export the flat pattern and read the per-edge allowance on the cut line.'
    ]
  },
  {
    id: 'neckline-facing',
    title: 'Finishing a neckline with a facing',
    level: 'intermediate',
    goal: 'Get a clean neckline edge with no raw fabric showing.',
    steps: [
      'A facing is a shaped piece that mirrors the neckline and folds to the inside.',
      'It is interfaced so the edge holds a crisp shape.',
      'Understitch the facing to the seam allowance so it rolls to the inside and stays put.',
      'Turn on Facing in Construction; export the pattern to get the facing piece.'
    ]
  },
  {
    id: 'sleeve-cap',
    title: 'Easing a set-in sleeve cap',
    level: 'intermediate',
    goal: 'Fit a rounded sleeve head into an armhole without puckers.',
    steps: [
      'The sleeve cap is longer than the armhole — the extra is *ease*, distributed smoothly.',
      'Run two rows of gathering stitches across the cap and draw them up gently.',
      'Match the notches: front cap to front armhole, back to back (they differ).',
      'Compare sleeve shapes (set-in vs raglan vs dolman) and see the cap change in 2D.'
    ]
  },
  {
    id: 'grading',
    title: 'Grading a pattern through the size run',
    level: 'intermediate',
    goal: 'Scale one base pattern up and down to fit a whole size range.',
    steps: [
      'Grading adds a set increment at each point of measure between sizes (not a uniform scale).',
      'Girth grows more than length; shoulders and armholes grow least.',
      'Nest the graded sizes to check the lines stay parallel and clean.',
      'Export the size set (XS–XXL) as a ZIP of graded pattern files.'
    ]
  },
  {
    id: 'princess',
    title: 'Shaping with princess seams',
    level: 'advanced',
    goal: 'Replace bust and waist darts with a curved vertical seam.',
    steps: [
      'A princess seam runs shoulder-or-armhole → over the bust → to the hem.',
      'The curve *is* the shaping — it absorbs what the darts would have done.',
      'True the two seam edges so they are the same length and the curve flows across the join.',
      'Toggle Princess and inspect the front piece split in the 2D pattern.'
    ]
  }
]

/** Case-insensitive search over title + goal + steps; empty query returns all. Pure. */
export function searchLessons(query: string, lessons: Lesson[] = LESSONS): Lesson[] {
  const q = query.trim().toLowerCase()
  if (!q) return lessons.slice()
  return lessons.filter(
    (l) => l.title.toLowerCase().includes(q) || l.goal.toLowerCase().includes(q) || l.steps.some((s) => s.toLowerCase().includes(q))
  )
}

/** A lesson by id, or undefined. Pure. */
export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id)
}
