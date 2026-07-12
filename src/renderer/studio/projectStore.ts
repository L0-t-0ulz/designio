/**
 * The in-app **project library** — your saved designs, kept in localStorage so they
 * reopen in one click from the Projects page. Each record is a full `ProjectDoc`
 * (the whole outfit + body + scene) plus a name, timestamp and a thumbnail dataURL.
 * The pure helpers (parse/upsert/sort) are unit-tested; the localStorage API is a
 * thin, failure-tolerant wrapper (works in the browser, no-ops headless).
 */
import { parseDoc, type ProjectDoc } from './document'

/** A named point-in-time version of a project's doc (the version history). */
export interface Snapshot {
  id: string
  label: string
  at: number
  doc: ProjectDoc
}

export interface StoredProject {
  id: string
  name: string
  updatedAt: number
  /** A small preview image (dataURL), captured from the studio when saved. */
  thumb?: string
  doc: ProjectDoc
  /** Version history — newest first, capped at `MAX_SNAPSHOTS`. */
  snapshots?: Snapshot[]
}

export const MAX_SNAPSHOTS = 25

/** Prepend a snapshot (dedupe by id), keeping only the newest `max`. Pure. */
export function pushSnapshot(snaps: Snapshot[], snap: Snapshot, max = MAX_SNAPSHOTS): Snapshot[] {
  return [snap, ...snaps.filter((s) => s.id !== snap.id)].slice(0, max)
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
      const snaps: Snapshot[] = []
      for (const s of Array.isArray(r.snapshots) ? r.snapshots : []) {
        const sr = s as Partial<Snapshot> & { doc?: unknown }
        if (typeof sr.id !== 'string') continue
        try {
          snaps.push({ id: sr.id, label: String(sr.label ?? ''), at: +(sr.at ?? 0) || 0, doc: parseDoc(typeof sr.doc === 'string' ? sr.doc : JSON.stringify(sr.doc)) })
        } catch {
          // skip a corrupt snapshot
        }
      }
      out.push({ id: r.id, name: r.name, updatedAt: +(r.updatedAt ?? 0) || 0, thumb: typeof r.thumb === 'string' ? r.thumb : undefined, doc, snapshots: snaps.length ? snaps : undefined })
    } catch {
      // skip a corrupt entry — one bad project must not break the whole library
    }
  }
  return out
}

export function serializeProjects(list: StoredProject[]): string {
  return JSON.stringify(
    list.map((p) => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, thumb: p.thumb, doc: p.doc, snapshots: p.snapshots }))
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
/** Insert or update a project; returns its id (new if none was given). Keeps the
 *  existing version history (snapshots) so a save doesn't wipe it. */
export function saveProjectRecord(p: { id?: string; name: string; doc: ProjectDoc; thumb?: string }): string {
  const id = p.id ?? newId()
  const existing = read().find((x) => x.id === id)
  const rec: StoredProject = { id, name: p.name, updatedAt: Date.now(), thumb: p.thumb, doc: p.doc, snapshots: existing?.snapshots }
  write(upsertProject(read(), rec))
  return id
}

/** Save a **version snapshot** of a project's doc into its history; returns the snap id. */
export function snapshotProject(id: string, label: string, doc: ProjectDoc): string {
  const list = read()
  const p = list.find((x) => x.id === id)
  if (!p) return ''
  const snap: Snapshot = { id: newId(), label: label.trim() || 'Version', at: Date.now(), doc }
  p.snapshots = pushSnapshot(p.snapshots ?? [], snap)
  write(list)
  return snap.id
}
/** Version-history metas (newest first) for a project. */
export function listSnapshots(id: string): { id: string; label: string; at: number }[] {
  return (read().find((x) => x.id === id)?.snapshots ?? []).map(({ id, label, at }) => ({ id, label, at }))
}
/** The doc of a saved snapshot, or null. */
export function restoreSnapshot(projectId: string, snapId: string): ProjectDoc | null {
  return read().find((x) => x.id === projectId)?.snapshots?.find((s) => s.id === snapId)?.doc ?? null
}
export function deleteSnapshot(projectId: string, snapId: string): void {
  const list = read()
  const p = list.find((x) => x.id === projectId)
  if (p?.snapshots) {
    p.snapshots = p.snapshots.filter((s) => s.id !== snapId)
    write(list)
  }
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
