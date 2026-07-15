import { describe, it, expect } from 'vitest'
import { LESSONS, LESSON_LEVELS, searchLessons, getLesson, type LessonLevel } from '../src/renderer/ui/lessons'

describe('pattern-making lessons', () => {
  it('every lesson is well-formed', () => {
    const levels = new Set<LessonLevel>(LESSON_LEVELS)
    expect(LESSONS.length).toBeGreaterThanOrEqual(6)
    for (const l of LESSONS) {
      expect(l.id).toBeTruthy()
      expect(l.title.length).toBeGreaterThan(0)
      expect(levels.has(l.level)).toBe(true)
      expect(l.goal.length).toBeGreaterThan(10)
      expect(l.steps.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('has unique ids and covers all difficulty levels', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    const levels = new Set(LESSONS.map((l) => l.level))
    for (const lvl of LESSON_LEVELS) expect(levels.has(lvl)).toBe(true)
  })

  it('search matches title, goal OR steps, case-insensitively', () => {
    expect(searchLessons('dart').some((l) => l.id === 'dart')).toBe(true)
    expect(searchLessons('DART').some((l) => l.id === 'dart')).toBe(true)
    // "bias" only appears in the grainline lesson's steps
    expect(searchLessons('bias').some((l) => l.id === 'grainline')).toBe(true)
    expect(searchLessons('')).toHaveLength(LESSONS.length)
    expect(searchLessons('zzzznope')).toEqual([])
  })

  it('getLesson finds by id', () => {
    expect(getLesson('grading')?.title).toMatch(/grading/i)
    expect(getLesson('nope')).toBeUndefined()
  })
})
