import { describe, it, expect } from 'vitest'
import {
  RELEASE_NOTES,
  hasUnseenReleases,
  latestRelease,
  releasesSince,
  shouldAutoOpen,
  type ReleaseNote
} from '../src/renderer/ui/whatsNew'

const note = (id: string): ReleaseNote => ({ id, date: id, headline: `h ${id}`, changes: [`c ${id}`] })
const feed = [note('2026-03-03'), note('2026-02-02'), note('2026-01-01')] // newest first

describe("what's-new release feed", () => {
  it('the shipped feed is well-formed and ordered newest first', () => {
    expect(RELEASE_NOTES.length).toBeGreaterThan(0)
    for (const n of RELEASE_NOTES) {
      expect(n.id).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(n.headline.trim().length).toBeGreaterThan(0)
      expect(n.changes.length).toBeGreaterThan(0)
      for (const c of n.changes) expect(c.trim().length).toBeGreaterThan(0)
    }
    const ids = RELEASE_NOTES.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length) // no duplicate ids
    expect([...ids]).toEqual([...ids].sort().reverse()) // newest first
    expect(latestRelease()).toBe(RELEASE_NOTES[0])
  })

  it('shows every note to someone with nothing recorded', () => {
    expect(releasesSince(null, feed)).toEqual(feed)
    expect(hasUnseenReleases(null, feed)).toBe(true)
  })

  it('shows only what shipped after the note last seen', () => {
    expect(releasesSince('2026-02-02', feed)).toEqual([note('2026-03-03')])
    expect(hasUnseenReleases('2026-02-02', feed)).toBe(true)
  })

  it('shows nothing once the newest note has been seen', () => {
    expect(releasesSince('2026-03-03', feed)).toEqual([])
    expect(hasUnseenReleases('2026-03-03', feed)).toBe(false)
    expect(shouldAutoOpen('2026-03-03', feed)).toBe(false)
  })

  it('an unrecognised saved id shows the whole feed rather than nothing', () => {
    // a downgrade or a hand-edited value must not silently swallow the feed
    expect(releasesSince('1999-01-01', feed)).toEqual(feed)
    expect(releasesSince('junk', feed)).toEqual(feed)
  })

  it('does not open itself on a first run, only for a returning user', () => {
    expect(shouldAutoOpen(null, feed)).toBe(false) // nothing to be told about yet
    expect(shouldAutoOpen('2026-01-01', feed)).toBe(true) // two notes behind
    expect(shouldAutoOpen('2026-02-02', feed)).toBe(true)
  })

  it('never hands back the live feed for a caller to mutate', () => {
    const got = releasesSince(null, feed)
    got.pop()
    expect(feed).toHaveLength(3)
  })

  it('copes with an empty feed', () => {
    expect(latestRelease([])).toBeNull()
    expect(releasesSince(null, [])).toEqual([])
    expect(shouldAutoOpen('anything', [])).toBe(false)
  })
})
