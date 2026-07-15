import { describe, it, expect } from 'vitest'
import {
  APPROVAL_STATUSES, nextStatuses, canTransition, approvalLabel, applyApproval, approvalBadgeHtml
} from '../src/renderer/export/approval'

describe('tech-pack approval workflow', () => {
  it('follows the directed workflow, no illegal jumps', () => {
    expect(nextStatuses('draft')).toEqual(['in-review'])
    expect(nextStatuses('in-review')).toEqual(['approved', 'changes-requested'])
    expect(nextStatuses('changes-requested')).toEqual(['in-review'])
    expect(nextStatuses('approved')).toEqual(['changes-requested'])
  })

  it('canTransition allows only legal moves', () => {
    expect(canTransition('draft', 'in-review')).toBe(true)
    expect(canTransition('draft', 'approved')).toBe(false) // no skipping review
    expect(canTransition('in-review', 'approved')).toBe(true)
    expect(canTransition('changes-requested', 'in-review')).toBe(true)
  })

  it('applyApproval transitions on legal moves, no-ops on illegal', () => {
    const rec = applyApproval({ status: 'draft' }, 'in-review', 'Zayan', 1000)
    expect(rec.status).toBe('in-review')
    expect(rec.by).toBe('Zayan')
    // illegal: draft → approved is ignored
    const same = applyApproval({ status: 'draft' }, 'approved')
    expect(same.status).toBe('draft')
  })

  it('every status has a label + colour', () => {
    for (const s of APPROVAL_STATUSES) {
      const l = approvalLabel(s)
      expect(l.text.length).toBeGreaterThan(0)
      expect(l.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('badge HTML shows the label + colour + reviewer/date', () => {
    const html = approvalBadgeHtml({ status: 'approved', by: 'Zayan', at: Date.UTC(2026, 6, 15) })
    expect(html).toContain('Approved')
    expect(html).toContain('#16a34a')
    expect(html).toContain('Zayan')
    expect(html).toContain('2026-07-15')
  })

  it('a full round-trip: draft → review → changes → review → approved', () => {
    let r = applyApproval({ status: 'draft' }, 'in-review')
    r = applyApproval(r, 'changes-requested', undefined, undefined, 'Fix the collar')
    expect(r.status).toBe('changes-requested')
    expect(r.note).toBe('Fix the collar')
    r = applyApproval(r, 'in-review')
    r = applyApproval(r, 'approved')
    expect(r.status).toBe('approved')
  })
})
