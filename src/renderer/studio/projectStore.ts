/**
 * The in-app **project library** — your saved designs, kept in localStorage so they
 * reopen in one click from the Projects page. Each record is a full `ProjectDoc`
 * (the whole outfit + body + scene) plus a name, timestamp and a thumbnail dataURL.
 * The pure helpers (parse/upsert/sort) are unit-tested; the localStorage API is a
 * thin, failure-tolerant wrapper (works in the browser, no-ops headless).
 */
import { parseDoc, type ProjectDoc } from './document'

export interface StoredProject {
  id: string
  name: string
  updatedAt: number
  /** A small preview image (dataURL), captured from the studio when saved. */
  thumb?: string
  doc: ProjectDoc
}

/** The light record shown on the Projects page (no full doc). */
export interface ProjectMeta {
  id: string
  name: string
  updatedAt: number
  thumb?: string
}

const KEY = 'dio-projects-v1'

// ---- pure helpers (unit-tested) ------------------------------------------
export function newId(): string {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7)
}

/** Robustly parse the stored list, dropping any corrupt/invalid entries. */
export function parseProjects(raw: string | null): StoredProject[] {
  if (!raw) return []
  let arr: unknown
  try {
    arr = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const out: StoredProject[] = []
  for (const e of arr) {
    const r = e as Partial<StoredProject> & { doc?: unknown }
    if (!r || typeof r.id !== 'string' || typeof r.name !== 'string') continue
    try {
      const doc = parseDoc(typeof r.doc === 'string' ? r.doc : JSON.stringify(r.doc))
      out.push({ id: r.id, name: r.name, updatedAt: +(r.updatedAt ?? 0) || 0, thumb: typeof r.thumb === 'string' ? r.thumb : undefined, doc })
    } catch {
      // skip a corrupt entry — one bad project must not break the whole library
    }
  }
  return out
}

export function serializeProjects(list: StoredProject[]): string {
  return JSON.stringify(
    list.map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, thumb: p.thumb, doc: p.doc }))
  )
}

/** Insert or replace by id (immutable). */
export function upsertProject(list: StoredProject[], p: StoredProject): StoredProject[] {
  const i = list.findIndex((x) => x.id === p.id)
  const next = list.slice()
  if (i >= 0) next[i] = p
  else next.push(p)
  return next
}

export function sortByRecent(list: StoredProject[]): StoredProject[] {
  return list.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}

// ---- localStorage-backed API ---------------------------------------------
function read(): StoredProject[] {
  try {
    return parseProjects(globalThis.localStorage?.getItem(KEY) ?? null)
  } catch {
    return []
  }
}
function write(list: StoredProject[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, serializeProjects(list))
  } catch {
    // no storage / quota exceeded — fail quietly
  }
}

export function listProjects(): ProjectMeta[] {
  return sortByRecent(read()).map(({ id, name, updatedAt, thumb }) => ({ id, name, updatedAt, thumb }))
}
export function loadProject(id: string): StoredProject | null {
  return read().find((p) => p.id === id) ?? null
}
/** Insert or update a project; returns its id (new if none was given). */
export function saveProjectRecord(p: { id?: string; name: string; doc: ProjectDoc; thumb?: string }): string {
  const id = p.id ?? newId()
  const rec: StoredProject = { id, name: p.name, updatedAt: Date.now(), thumb: p.thumb, doc: p.doc }
  write(upsertProject(read(), rec))
  return id
}
export function deleteProject(id: string): void {
  write(read().filter((p) => p.id !== id))
}
export function renameProject(id: string, name: string): void {
  const list = read()
  const p = list.find((x) => x.id === id)
  if (p) {
    p.name = name
    p.updatedAt = Date.now()
    write(list)
  }
}
