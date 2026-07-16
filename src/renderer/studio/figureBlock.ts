/**
 * **Petite / tall / plus auto-proportioning** — a figure block that proportions a
 * design to a body type in one setting: it scales the garment's length (petite runs
 * shorter, tall longer) and adds wearing ease (plus), and names the matching body
 * shape preset so the avatar changes too. Pure grade data + `applyFigureBlockToConfig`
 * are unit-tested; `?block=` drives it.
 */
export type FigureBlock = 'regular' | 'petite' | 'tall' | 'plus'
export const FIGURE_BLOCKS: FigureBlock[] = ['regular', 'petite', 'tall', 'plus']

export interface FigureBlockGrade {
  /** Multiply the garment length by this (proportional shortening/lengthening). */
  lengthScale: number
  /** Extra wearing ease (metres) the block adds. */
  easeAddM: number
  /** The matching body-shape preset name (undefined for regular). */
  bodyPreset?: string
}

const BLOCKS: Record<FigureBlock, FigureBlockGrade> = {
  regular: { lengthScale: 1, easeAddM: 0 },
  petite: { lengthScale: 0.92, easeAddM: 0, bodyPreset: 'petite' }, // shorter stature → shorter lengths
  tall: { lengthScale: 1.09, easeAddM: 0, bodyPreset: 'tall' }, // longer lengths
  plus: { lengthScale: 1.02, easeAddM: 0.03, bodyPreset: 'plus' } // graded girth + a touch more ease
}

export function figureBlockGrade(block: FigureBlock): FigureBlockGrade {
  return BLOCKS[block] ?? BLOCKS.regular
}

/** Apply a figure block to a design config in place — proportional length + ease. Pure. */
export function applyFigureBlockToConfig(cfg: { length?: number; ease?: number }, block: FigureBlock): void {
  const g = figureBlockGrade(block)
  if (cfg.length != null) cfg.length = Math.max(0.1, Math.min(1.5, cfg.length * g.lengthScale))
  cfg.ease = Math.max(-0.03, Math.min(0.12, (cfg.ease ?? 0) + g.easeAddM))
}
