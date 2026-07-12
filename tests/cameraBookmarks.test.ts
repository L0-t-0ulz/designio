import { describe, it, expect } from 'vitest'
import { parseBookmarks, serializeBookmarks, addBookmark, type CameraPose } from '../src/renderer/studio/cameraBookmarks'

const pose = (d: number): CameraPose => ({ azimuth: 0.5, polar: 1.1, distance: d, target: [0, 1, 0] })

describe('camera bookmarks', () => {
  it('round-trips through serialise → parse', () => {
    const list = addBookmark(addBookmark([], 'Front', pose(3)), '¾', pose(4))
    const back = parseBookmarks(serializeBookmarks(list))
    expect(back).toHaveLength(2)
    expect(back.map((b) => b.name)).toEqual(['Front', '¾'])
    expect(back[1].pose.distance).toBe(4)
    expect(back[0].pose.target).toEqual([0, 1, 0])
  })

  it('addBookmark appends with an id + names an empty one, capped', () => {
    let list = addBookmark([], '', pose(3))
    expect(list[0].id).toMatch(/^cam_/)
    expect(list[0].name).toBe('View 1')
    for (let i = 0; i < 30; i++) list = addBookmark(list, 'v' + i, pose(i), 5)
    expect(list).toHaveLength(5) // capped to max, newest kept
    expect(list[list.length - 1].name).toBe('v29')
  })

  it('drops malformed entries (bad pose / missing fields)', () => {
    const raw = JSON.stringify([
      { id: 'a', name: 'ok', pose: { azimuth: 0, polar: 1, distance: 2, target: [0, 0, 0] } },
      { id: 'b', name: 'no pose' },
      { id: 'c', name: 'bad target', pose: { azimuth: 0, polar: 1, distance: 2, target: [0, 0] } },
      { name: 'no id', pose: { azimuth: 0, polar: 1, distance: 2, target: [0, 0, 0] } }
    ])
    expect(parseBookmarks(raw).map((b) => b.id)).toEqual(['a'])
  })

  it('returns [] for junk', () => {
    expect(parseBookmarks(null)).toEqual([])
    expect(parseBookmarks('nope')).toEqual([])
    expect(parseBookmarks('{"x":1}')).toEqual([])
  })
})
