/**
 * **Tech-pack approval workflow** — a small state machine for a design's sign-off
 * status as it moves from draft to production: `draft → in-review →
 * approved | changes-requested`, with changes-requested looping back to in-review.
 * Pure (no DOM) so the transitions are unit-tested; the manufacturing pack renders
 * the current status as a badge.
 */
export type ApprovalStatus = 'draft' | 'in-review' | 'approved' | 'changes-requested'
export const APPROVAL_STATUSES: ApprovalStatus[] = ['draft', 'in-review', 'approved', 'changes-requested']

/** The states you can move to from `s` (a directed workflow, no illegal jumps). Pure. */
export function nextStatuses(s: ApprovalStatus): ApprovalStatus[] {
  switch (s) {
    case 'draft':
      return ['in-review']
    case 'in-review':
      return ['approved', 'changes-requested']
    case 'changes-requested':
      return ['in-review'] // address the notes, re-submit
    case 'approved':
      return ['changes-requested'] // re-open if a problem is found post-approval
  }
}

/** Whether `to` is a legal transition from `from`. Pure. */
export function canTransition(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return nextStatuses(from).includes(to)
}

/** Human label + a badge colour (hex) for a status. Pure. */
export function approvalLabel(s: ApprovalStatus): { text: string; color: string } {
  switch (s) {
    case 'draft':
      return { text: 'Draft', color: '#6b7280' }
    case 'in-review':
      return { text: 'In review', color: '#d97706' }
    case 'approved':
      return { text: 'Approved', color: '#16a34a' }
    case 'changes-requested':
      return { text: 'Changes requested', color: '#dc2626' }
  }
}

export interface ApprovalRecord {
  status: ApprovalStatus
  /** Who moved it here (a name/email), if known. */
  by?: string
  /** Epoch ms of the last transition. */
  at?: number
  note?: string
}

/**
 * Apply a transition, returning the new record — or the unchanged record if the
 * move is illegal (so callers can guard on `record.status`). Pure.
 */
export function applyApproval(rec: ApprovalRecord, to: ApprovalStatus, by?: string, at?: number, note?: string): ApprovalRecord {
  if (!canTransition(rec.status, to)) return rec
  return { status: to, by, at, note }
}

/** An inline HTML badge for the tech pack (`approvalLabel` coloured). Pure. */
export function approvalBadgeHtml(rec: ApprovalRecord): string {
  const { text, color } = approvalLabel(rec.status)
  const meta = [rec.by, rec.at ? new Date(rec.at).toISOString().slice(0, 10) : '']
    .filter(Boolean)
    .join(' · ')
  return `<span class="approval" style="display:inline-block;padding:3px 10px;border-radius:999px;background:${color};color:#fff;font-size:12px;font-weight:600">${text}</span>${meta ? ` <span style="color:#6b7280;font-size:12px">${meta}</span>` : ''}`
}
