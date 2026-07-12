/**
 * Saved **camera bookmarks** — named studio views you can jump back to (front · ¾ ·
 * detail · whatever you frame). Kept in localStorage, studio-wide. The pure helpers
 * (parse/serialise/add) are unit-tested; the localStorage API is a thin wrapper.
 */
export interface CameraPose {
  azimuth: number
  polar: number
  distance: number
  target: [number, number, number]
}
export interface Bookmark {
  id: string
  name: string
  pose: CameraPose
}

const KEY = 'dio-camera-bookmarks-v1'
const MAX = 24

let seq = 0
function newId(): string {
  seq = (seq + 1) % 1e6
  return 'cam_' + Date.now().toString(36) + '_' + seq.toString(36)
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Parse the stored list, dropping any malformed entry. Pure. */
export function parseBookmarks(raw: string | null): Bookmark[] {
  if (!raw) return []
  let arr: unknown
  try {
    arr = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const out: Bookmark[] = []
  for (const e of arr) {
    const r = e as Partial<Bookmark> & { pose?: Partial<CameraPose> }
    const p = r.pose
    if (typeof r.id !== 'string' || typeof r.name !== 'string' || !p) continue
    if (!isNum(p.azimuth) || !isNum(p.polar) || !isNum(p.distance)) continue
    const t = p.target
    if (!Array.isArray(t) || t.length !== 3 || !t.every(isNum)) continue
    out.push({ id: r.id, name: r.name, pose: { azimuth: p.azimuth, polar: p.polar, distance: p.distance, target: [t[0], t[1], t[2]] } })
  }
  return out
}

export function serializeBookmarks(list: Bookmark[]): string {
  return JSON.stringify(list)
}

/** Append a bookmark (capped, newest last), assigning it an id. Pure. */
export function addBookmark(list: Bookmark[], name: string, pose: CameraPose, max = MAX): Bookmark[] {
  const b: Bookmark = { id: newId(), name: name.trim() || `View ${list.length + 1}`, pose }
  return [...list, b].slice(-max)
}

// ---- localStorage API -----------------------------------------------------
function read(): Bookmark[] {
  try {
    return parseBookmarks(globalThis.localStorage?.getItem(KEY) ?? null)
  } catch {
    return []
  }
}
function write(list: Bookmark[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, serializeBookmarks(list))
  } catch {
    /* no storage / quota — fail quietly */
  }
}
export function listBookmarks(): Bookmark[] {
  return read()
}
export function saveBookmark(name: string, pose: CameraPose): void {
  write(addBookmark(read(), name, pose))
}
export function deleteBookmark(id: string): void {
  write(read().filter((b) => b.id !== id))
}
