import { animate, stagger } from 'motion'
import { createElement, Plus, ArrowRight } from 'lucide'
import { el } from '../ui/controls'
import { getGarment } from '../garments/registry'
import { getFabric } from '../fabric/FabricLibrary'
import { GARMENT_SIL } from '../ui/thumbnails'
import { defaultConfig, type DesignConfig } from './design'
import { PRESETS, type Preset } from './presets'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0')

/** A full DesignConfig for a preset (garment defaults + the preset's overrides). */
export function configFromPreset(p: Preset): DesignConfig {
  const cfg = defaultConfig()
  const g = p.config.garmentType ?? cfg.garmentType
  cfg.garmentType = g
  Object.assign(cfg, getGarment(g).defaults)
  Object.assign(cfg, p.config)
  if (p.config.fabricId && p.config.color == null) cfg.color = getFabric(p.config.fabricId).color
  return cfg
}

export interface HomeActions {
  onNewDesign: () => void
  onTemplate: (config: DesignConfig) => void
}

/**
 * The app landing / launcher shown at start: an on-brand hero with a **New design**
 * CTA, a **templates** gallery (ready-made looks → straight into the studio), and a
 * short "what you can do" strip. Calm, approachable — the friendly front door.
 */
export function showHomepage(opts: HomeActions): void {
  const overlay = el('div', 'dio-home')

  const hero = el('div', 'dio-home-hero dio-home-anim')
  hero.append(el('div', 'dio-home-logo'))
  hero.append(el('div', 'dio-home-title', 'DesignIO'))
  hero.append(
    el('div', 'dio-home-tag', 'Design your own clothes in 3D — sew, drape, animate, and export.')
  )
  const cta = el('button', 'dio-home-cta')
  cta.append(createElement(Plus), document.createTextNode('  New design'))
  cta.addEventListener('click', () => {
    overlay.remove()
    opts.onNewDesign()
  })
  const arrow = el('span', 'dio-home-cta-arrow')
  arrow.append(createElement(ArrowRight))
  cta.append(arrow)
  hero.append(cta)
  overlay.append(hero)

  // ---- templates ----
  const tsec = el('div', 'dio-home-section dio-home-anim')
  tsec.append(el('div', 'dio-home-h', 'Start from a template'))
  const grid = el('div', 'dio-home-templates')
  for (const p of PRESETS) {
    const def = getGarment(p.config.garmentType ?? 'dress')
    const card = el('div', 'dio-home-card')
    card.setAttribute('role', 'button')
    card.tabIndex = 0
    card.innerHTML = `<svg viewBox="0 0 200 300"><path d="${GARMENT_SIL[def.icon ?? 'top']}"/></svg>`
    const nameRow = el('div', 'dio-home-card-name')
    const chip = el('span', 'dio-home-chip')
    chip.style.background = hex(p.config.color ?? getFabric(p.config.fabricId ?? 'cotton-poplin').color)
    nameRow.append(chip, document.createTextNode(p.name))
    card.append(nameRow)
    const open = (): void => {
      overlay.remove()
      opts.onTemplate(configFromPreset(p))
    }
    card.addEventListener('click', open)
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })
    grid.append(card)
  }
  tsec.append(grid)
  overlay.append(tsec)

  // ---- "what you can do" strip ----
  const strip = el('div', 'dio-home-strip dio-home-anim')
  const stats: [string, string][] = [
    ['16', 'garments'],
    ['24', 'fabrics'],
    ['Real', 'cloth physics'],
    ['4D', 'body animation'],
    ['Export', 'glTF · pattern · tech-pack']
  ]
  for (const [big, small] of stats) {
    const it = el('div', 'dio-home-stat')
    it.append(el('div', 'dio-home-stat-big', big), el('div', 'dio-home-stat-small', small))
    strip.append(it)
  }
  overlay.append(strip)

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
