import type { Fabric } from './fabric/FabricLibrary'
import type { TextilePattern } from './fabric/textile'

/**
 * **Plugin API** — a small, safe extension surface so third-party (or your own)
 * scripts can add assets to DesignIO without touching the core. A plugin declares
 * an `id`, `name` and a `setup(ctx)` that registers new fabrics/named colours via
 * the context. Plugins register through `registerPlugin` (or the `window.designioPlugins`
 * global) before the studio boots; `runPlugins` applies them into the live catalog.
 * The registry + dispatch are pure (no DOM) so they're unit-tested. (Loading plugin
 * *files/URLs* at runtime is a separate host concern; this is the stable API + registry.)
 */
export interface NamedColorInput {
  code: string
  name: string
  hex: number
}

/** What a plugin may add to the app during `setup`. */
export interface PluginContext {
  addFabric(fabric: Fabric): void
  addNamedColor(color: NamedColorInput): void
  /** Register a named textile-pattern alias → an existing base pattern (light extension). */
  addTextileAlias(alias: string, base: TextilePattern): void
}

export interface DesignioPlugin {
  id: string
  name: string
  version?: string
  setup(ctx: PluginContext): void
}

export interface PluginResult {
  id: string
  ok: boolean
  added: { fabrics: number; colors: number; textiles: number }
  error?: string
}

const registry: DesignioPlugin[] = []
let host: PluginContext | null = null

/** Run one plugin's setup against a context, tallying + catching. Pure. */
function applyOne(p: DesignioPlugin, ctx: PluginContext): PluginResult {
  const added = { fabrics: 0, colors: 0, textiles: 0 }
  const counting: PluginContext = {
    addFabric: (f) => (added.fabrics++, ctx.addFabric(f)),
    addNamedColor: (c) => (added.colors++, ctx.addNamedColor(c)),
    addTextileAlias: (a, b) => (added.textiles++, ctx.addTextileAlias(a, b))
  }
  try {
    p.setup(counting)
    return { id: p.id, ok: true, added }
  } catch (e) {
    return { id: p.id, ok: false, added, error: (e as Error).message }
  }
}

/** Register a plugin (deduped by id). If a host is installed, it applies immediately.
 *  Returns false if the id is already taken or the plugin is malformed. */
export function registerPlugin(p: DesignioPlugin): boolean {
  if (!p || typeof p.id !== 'string' || !p.id || typeof p.setup !== 'function') return false
  if (registry.some((x) => x.id === p.id)) return false
  registry.push(p)
  if (host) applyOne(p, host)
  return true
}

/** Install the host context; applies every already-registered plugin + all future
 *  ones (via `registerPlugin`). The studio calls this once at boot. */
export function setPluginHost(ctx: PluginContext): PluginResult[] {
  host = ctx
  return registry.map((p) => applyOne(p, ctx))
}

/** All registered plugins (a copy). Pure. */
export function loadedPlugins(): DesignioPlugin[] {
  return registry.slice()
}

/** Clear the registry + host (tests / hot-reload). */
export function clearPlugins(): void {
  registry.length = 0
  host = null
}

/**
 * Run every registered plugin's `setup` against a host-provided context, tallying
 * what each added and catching failures so one bad plugin can't break the app. Pure
 * (the context does the mutation). Returns a per-plugin result.
 */
export function runPlugins(ctx: PluginContext): PluginResult[] {
  return registry.map((p) => applyOne(p, ctx))
}
