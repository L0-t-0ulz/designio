import { animate, stagger } from 'motion'
import { createElement, Plus, Upload, Trash2, Pencil, Download, ArrowLeft } from 'lucide'
import { el } from '../ui/controls'
import { getGarment } from '../garments/registry'
import { GARMENT_SIL } from '../ui/thumbnails'
import { serializeDoc, parseDoc } from '../studio/document'
import {
  listProjects,
  loadProject,
  deleteProject,
  renameProject,
  saveProjectRecord,
  newId
} from '../studio/projectStore'
import { openFile, saveFile } from '../export/save'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const DIO_FILTER = [{ name: 'DesignIO project', extensions: ['dio'] }]

/** "2 min ago" / "3 days ago" — a light relative timestamp. */
function ago(ts: number): string {
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  const m = s / 60
  if (m < 60) return `${Math.floor(m)} min ago`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)} h ago`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)} day${Math.floor(d) === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString()
}

export interface ProjectsActions {
  /** Open a saved project in the studio. */
  onOpen: (id: string) => void
  /** Start a fresh design (→ the builder). */
  onNewDesign: () => void
  /** Back to the homepage. */
  onHome: () => void
}

/**
 * The **Projects** page — your saved designs as a gallery. Open one in a click,
 * rename or **delete** it, and import/export `.dio` files. New designs and a way
 * home tie the whole app together.
 */
export function showProjectsPage(opts: ProjectsActions): void {
  const overlay = el('div', 'dio-home dio-proj')

  // ---- header ----
  const hero = el('div', 'dio-home-hero dio-proj-hero dio-home-anim')
  const back = el('button', 'dio-back')
  back.append(createElement(ArrowLeft), document.createTextNode(' Home'))
  back.addEventListener('click', () => {
    overlay.remove()
    opts.onHome()
  })
  hero.append(back)
  hero.append(el('div', 'dio-home-title', 'Your projects'))
  hero.append(el('div', 'dio-home-tag', 'Pick up where you left off — or start something new.'))

  const actions = el('div', 'dio-proj-actions')
  const newBtn = el('button', 'dio-home-cta')
  newBtn.append(createElement(Plus), document.createTextNode('  New design'))
  newBtn.addEventListener('click', () => {
    overlay.remove()
    opts.onNewDesign()
  })
  const importBtn = el('button', 'dio-proj-import')
  importBtn.append(createElement(Upload), document.createTextNode('  Import .dio'))
  importBtn.addEventListener('click', () => void doImport())
  actions.append(newBtn, importBtn)
  hero.append(actions)
  overlay.append(hero)

  // ---- grid ----
  const section = el('div', 'dio-home-section dio-home-anim')
  const grid = el('div', 'dio-proj-grid')
  section.append(grid)
  overlay.append(section)

  const thumbFor = (id: string, imgSrc?: string): HTMLElement => {
    if (imgSrc) {
      const im = el('img', 'dio-proj-thumb-img') as HTMLImageElement
      im.src = imgSrc
      im.alt = ''
      return im
    }
    // fallback silhouette from the project's first garment
    const doc = loadProject(id)?.doc
    const icon = doc ? (getGarment(doc.layers[0].garmentType).icon ?? 'dress') : 'dress'
    const box = el('div', 'dio-proj-thumb-fallback')
    box.innerHTML = `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL[icon]}"/></svg>`
    return box
  }

  function render(): void {
    grid.replaceChildren()
    const projects = listProjects()
    if (!projects.length) {
      const empty = el('div', 'dio-proj-empty')
      empty.append(
        el('div', 'dio-proj-empty-title', 'No projects yet'),
        el('div', 'dio-proj-empty-sub', 'Design something and Save project — it’ll show up here.')
      )
      grid.append(empty)
      return
    }
    for (const p of projects) {
      const card = el('div', 'dio-proj-card')
      const thumb = el('div', 'dio-proj-thumb')
      thumb.append(thumbFor(p.id, p.thumb))
      thumb.style.cursor = 'pointer'
      thumb.addEventListener('click', () => {
        overlay.remove()
        opts.onOpen(p.id)
      })
      const meta = el('div', 'dio-proj-meta')
      const name = el('div', 'dio-proj-name', p.name)
      name.style.cursor = 'pointer'
      name.title = 'Open'
      name.addEventListener('click', () => {
        overlay.remove()
        opts.onOpen(p.id)
      })
      const sub = el('div', 'dio-proj-sub', `edited ${ago(p.updatedAt)}`)
      const row = el('div', 'dio-proj-card-actions')
      const iconBtn = (icon: Parameters<typeof createElement>[0], title: string, run: () => void): HTMLElement => {
        const b = el('button', 'dio-proj-iconbtn')
        b.append(createElement(icon))
        b.title = title
        b.setAttribute('aria-label', title)
        b.addEventListener('click', (e) => {
          e.stopPropagation()
          run()
        })
        return b
      }
      row.append(
        iconBtn(Pencil, 'Rename', () => {
          const next = window.prompt('Rename project', p.name)
          if (next && next.trim()) {
            renameProject(p.id, next.trim())
            render()
          }
        }),
        iconBtn(Download, 'Export .dio', () => void doExport(p.id, p.name)),
        iconBtn(Trash2, 'Delete', () => {
          if (window.confirm(`Delete “${p.name}”? This can’t be undone.`)) {
            deleteProject(p.id)
            render()
          }
        })
      )
      meta.append(name, sub)
      card.append(thumb, meta, row)
      grid.append(card)
    }
  }

  async function doExport(id: string, name: string): Promise<void> {
    const rec = loadProject(id)
    if (!rec) return
    const safe = name.replace(/[^\w.-]+/g, '-').slice(0, 40) || 'design'
    await saveFile(`${safe}.dio`, serializeDoc(rec.doc), DIO_FILTER)
  }
  async function doImport(): Promise<void> {
    const r = await openFile(DIO_FILTER)
    if (!r) return
    try {
      const doc = parseDoc(r.content)
      const base = r.path.split(/[\\/]/).pop()?.replace(/\.dio$/i, '') ?? 'Imported'
      saveProjectRecord({ id: newId(), name: base, doc })
      render()
    } catch (e) {
      window.alert('Could not import project: ' + (e as Error).message)
    }
  }

  render()
  document.body.append(overlay)
  if (!reduced) {
    animate(
      '.dio-home-anim',
      { opacity: [0, 1], y: [14, 0] },
      { delay: stagger(0.08), duration: 0.5, ease: [0.22, 1, 0.36, 1] }
    )
  } else {
    overlay.querySelectorAll('.dio-home-anim').forEach((n) => n.classList.remove('dio-home-anim'))
  }
}
