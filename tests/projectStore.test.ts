import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig } from '../src/renderer/studio/document'
import {
  parseProjects,
  serializeProjects,
  upsertProject,
  sortByRecent,
  pushSnapshot,
  newId,
  type StoredProject,
  type Snapshot
} from '../src/renderer/studio/projectStore'

const rec = (id: string, name: string, updatedAt: number): StoredProject => ({
  id,
  name,
  updatedAt,
  doc: docFromConfig(defaultConfig())
})

describe('project store (localStorage library)', () => {
  it('round-trips through serialise → parse', () => {
    const list = [rec('a', 'One', 10), rec('b', 'Two', 20)]
    const back = parseProjects(serializeProjects(list))
    expect(back).toHaveLength(2)
    expect(back.map((p) => p.id)).toEqual(['a', 'b'])
    expect(back[0].doc.layers).toHaveLength(1)
  })

  it('drops corrupt entries but keeps the good ones', () => {
    const good = rec('a', 'Good', 1)
    const raw = JSON.stringify([
      { id: 'a', name: 'Good', updatedAt: 1, doc: good.doc },
      { name: 'no id' },
      { id: 'x', name: 'bad doc', doc: { not: 'a project' } }
    ])
    const parsed = parseProjects(raw)
    expect(parsed.map((p) => p.id)).toEqual(['a'])
  })

  it('returns [] for junk / empty input', () => {
    expect(parseProjects(null)).toEqual([])
    expect(parseProjects('not json')).toEqual([])
    expect(parseProjects('{"nope":true}')).toEqual([])
  })

  it('upsert adds then replaces by id', () => {
    let list: StoredProject[] = []
    list = upsertProject(list, rec('a', 'One', 1))
    list = upsertProject(list, rec('b', 'Two', 2))
    expect(list).toHaveLength(2)
    list = upsertProject(list, rec('a', 'One v2', 3))
    expect(list).toHaveLength(2)
    expect(list.find((p) => p.id === 'a')!.name).toBe('One v2')
  })

  it('sorts most-recently-edited first', () => {
    const list = [rec('a', 'A', 10), rec('b', 'B', 30), rec('c', 'C', 20)]
    expect(sortByRecent(list).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  it('newId is unique', () => {
    const ids = new Set(Array.from({ length: 100 }, () => newId()))
    expect(ids.size).toBe(100)
  })
})

describe('version history (snapshots)', () => {
  const snap = (id: string, at: number): Snapshot => ({ id, label: 'v' + id, at, doc: docFromConfig(defaultConfig()) })

  it('pushSnapshot prepends newest-first, dedupes by id, and caps the count', () => {
    let list: Snapshot[] = []
    for (let i = 0; i < 5; i++) list = pushSnapshot(list, snap('s' + i, i), 3)
    expect(list.map((s) => s.id)).toEqual(['s4', 's3', 's2']) // newest 3
    // re-pushing an existing id moves it to the front, no dup
    list = pushSnapshot(list, snap('s3', 99), 3)
    expect(list[0].id).toBe('s3')
    expect(list.filter((s) => s.id === 's3')).toHaveLength(1)
  })

  it('snapshots survive serialise → parse alongside the project', () => {
    const p: StoredProject = { ...rec('a', 'One', 10), snapshots: [snap('s1', 1), snap('s2', 2)] }
    const back = parseProjects(serializeProjects([p]))
    expect(back[0].snapshots).toHaveLength(2)
    expect(back[0].snapshots!.map((s) => s.id)).toEqual(['s1', 's2'])
    expect(back[0].snapshots![0].doc.layers).toHaveLength(1) // the doc round-trips too
  })

  it('drops a corrupt snapshot but keeps the project + good snapshots', () => {
    const good = docFromConfig(defaultConfig())
    const raw = JSON.stringify([{ id: 'a', name: 'One', updatedAt: 1, doc: good, snapshots: [{ id: 's1', label: 'ok', at: 1, doc: good }, { id: 's2', doc: { junk: true } }, { label: 'no id' }] }])
    const back = parseProjects(raw)
    expect(back).toHaveLength(1)
    expect(back[0].snapshots!.map((s) => s.id)).toEqual(['s1'])
  })
})
