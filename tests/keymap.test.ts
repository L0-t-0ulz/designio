import { describe, it, expect } from 'vitest'
import {
  DEFAULT_KEYMAP,
  KEY_ACTIONS,
  actionFor,
  captureBinding,
  conflictsIn,
  formatBinding,
  matchBinding,
  normalizeKey,
  parseKeymap,
  serializeKeymap,
  type Keymap
} from '../src/renderer/ui/keymap'

const ev = (key: string, mod = false, shift = false) => ({ key, mod, shift })

describe('rebindable keymap', () => {
  it('defaults reproduce the legacy hardcoded shortcuts', () => {
    expect(actionFor(DEFAULT_KEYMAP, ev('z', true))).toBe('undo')
    expect(actionFor(DEFAULT_KEYMAP, ev('Z', true, true))).toBe('redo')
    expect(actionFor(DEFAULT_KEYMAP, ev('y', true))).toBe('redo') // legacy ⌘Y alias
    expect(actionFor(DEFAULT_KEYMAP, ev('c', true))).toBe('copy')
    expect(actionFor(DEFAULT_KEYMAP, ev('x', true))).toBe('cut')
    expect(actionFor(DEFAULT_KEYMAP, ev('v', true))).toBe('paste')
    expect(actionFor(DEFAULT_KEYMAP, ev('d', true))).toBe('duplicate')
    expect(actionFor(DEFAULT_KEYMAP, ev('s', true))).toBe('save')
    expect(actionFor(DEFAULT_KEYMAP, ev('o', true))).toBe('open')
    expect(actionFor(DEFAULT_KEYMAP, ev('Delete'))).toBe('delete')
    expect(actionFor(DEFAULT_KEYMAP, ev('Backspace'))).toBe('delete') // backspace ⇒ delete
    expect(actionFor(DEFAULT_KEYMAP, ev('z'))).toBeNull() // bare z types nothing
    expect(actionFor(DEFAULT_KEYMAP, ev('q', true))).toBeNull()
  })

  it('a custom binding wins and the freed key stops matching', () => {
    const map: Keymap = { ...DEFAULT_KEYMAP, duplicate: { key: 'j', mod: true } }
    expect(actionFor(map, ev('j', true))).toBe('duplicate')
    expect(actionFor(map, ev('d', true))).toBeNull()
  })

  it('a custom binding on Y overrides the legacy redo alias', () => {
    const map: Keymap = { ...DEFAULT_KEYMAP, save: { key: 'y', mod: true } }
    expect(actionFor(map, ev('y', true))).toBe('save')
  })

  it('captureBinding: combos yes; bare modifiers, Escape, ? and unmodified letters no', () => {
    expect(captureBinding(ev('k', true))).toEqual({ key: 'k', mod: true })
    expect(captureBinding(ev('K', true, true))).toEqual({ key: 'k', mod: true, shift: true })
    expect(captureBinding(ev('F2'))).toEqual({ key: 'f2', mod: false }) // named keys may stand alone
    expect(captureBinding(ev('Backspace'))).toEqual({ key: 'delete', mod: false })
    expect(captureBinding(ev('Shift', false, true))).toBeNull()
    expect(captureBinding(ev('Meta', true))).toBeNull()
    expect(captureBinding(ev('Escape'))).toBeNull()
    expect(captureBinding(ev('?'))).toBeNull()
    expect(captureBinding(ev('g'))).toBeNull() // unmodified letter would fire while browsing
  })

  it('formatBinding renders mac symbols and win/linux plus-chains', () => {
    expect(formatBinding({ key: 'z', mod: true, shift: true }, true)).toBe('⌘⇧Z')
    expect(formatBinding({ key: 'z', mod: true, shift: true }, false)).toBe('Ctrl+Shift+Z')
    expect(formatBinding({ key: 'delete', mod: false }, true)).toBe('⌫')
    expect(formatBinding({ key: 'delete', mod: false }, false)).toBe('Del')
    expect(formatBinding({ key: 'f2', mod: false }, false)).toBe('F2')
  })

  it('parseKeymap: valid saved bindings win, junk and gaps fall back per-action', () => {
    const saved = serializeKeymap({ ...DEFAULT_KEYMAP, undo: { key: 'u', mod: true } })
    expect(parseKeymap(saved).undo).toEqual({ key: 'u', mod: true })
    expect(parseKeymap(saved).redo).toEqual(DEFAULT_KEYMAP.redo)
    expect(parseKeymap(null)).toEqual(DEFAULT_KEYMAP)
    expect(parseKeymap('not json')).toEqual(DEFAULT_KEYMAP)
    expect(parseKeymap('{"undo":{"key":42}}').undo).toEqual(DEFAULT_KEYMAP.undo) // malformed binding
    expect(parseKeymap('{"undo":{"key":"Backspace","mod":false}}').undo).toEqual({ key: 'delete', mod: false }) // normalized on load
  })

  it('conflictsIn flags both sides of a duplicate combo; defaults are clean', () => {
    expect(conflictsIn(DEFAULT_KEYMAP)).toEqual([])
    const map: Keymap = { ...DEFAULT_KEYMAP, save: { key: 'c', mod: true } } // same as copy
    expect(conflictsIn(map).sort()).toEqual(['copy', 'save'])
  })

  it('matchBinding is exact on modifiers (shift-less binding rejects shifted press)', () => {
    expect(matchBinding(ev('z', true, true), DEFAULT_KEYMAP.undo)).toBe(false)
    expect(matchBinding(ev('z', true), DEFAULT_KEYMAP.undo)).toBe(true)
    expect(normalizeKey(' ')).toBe('space')
  })

  it('every action has a default binding and a label', () => {
    for (const def of KEY_ACTIONS) {
      expect(DEFAULT_KEYMAP[def.id]).toBeTruthy()
      expect(def.label.length).toBeGreaterThan(0)
    }
  })
})
