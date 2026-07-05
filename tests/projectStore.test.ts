import { describe, it, expect } from 'vitest'
import { defaultConfig } from '../src/renderer/start/design'
import { docFromConfig } from '../src/renderer/studio/document'
import {
  parseProjects,
  serializeProjects,
  upsertProject,
  sortByRecent,
  newId,
  type StoredProject
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
