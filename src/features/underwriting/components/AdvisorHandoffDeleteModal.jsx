import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  TbAlertTriangle,
  TbBuilding,
  TbCash,
  TbLoader2,
  TbReportMoney,
  TbTrash,
  TbUser,
  TbUserStar,
  TbX,
} from 'react-icons/tb'
import { useAdvisors } from '../hooks/useAdvisors'
import { api } from '../services/api'

const fmt$ = v => v == null || v === 0 ? '—' : `$${Number(v).toLocaleString()}`

/**
 * Confirmation + handoff modal for deleting an advisor.
 *
 * - Asks for a leaving reason (optional).
 * - Lists every loan + advisory engagement assigned to the advisor.
 * - For each item, the officer picks a replacement advisor from a dropdown
 *   (or leaves it unassigned).
 * - On confirm, POSTs everything to /api/advisors/:id/handoff-delete.
 */
const AdvisorHandoffDeleteModal = ({ open, advisor, onClose, onDone }) => {
  const allAdvisors = useAdvisors()
  const [reason, setReason] = useState('')
  const [loanPicks, setLoanPicks] = useState({})         // { [loanUuid]: legacyAdvisorId }
  const [engagementPicks, setEngagementPicks] = useState({}) // { [engagementId]: legacyAdvisorId }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [touched, setTouched] = useState(false)

  /* Reset state whenever the modal opens for a new advisor */
  useEffect(() => {
    if (!open) return
    setReason('')
    setError(null)
    setBusy(false)
    setTouched(false)
    /* Default pick: empty — officer MUST pick a replacement for each item. */
    const loans = Object.fromEntries((advisor?.assignedLoanApplications ?? []).map(l => [l.uuid, '']))
    const engs  = Object.fromEntries((advisor?.assignments ?? [])
      .filter(a => a.engagement && a.status !== 'declined')
      .map(a => [a.engagement.id, '']))
    setLoanPicks(loans)
    setEngagementPicks(engs)
  }, [open, advisor])

  /* Lock body scroll while open */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const loans       = advisor?.assignedLoanApplications ?? []
  const engagements = (advisor?.assignments ?? []).filter(a => a.engagement && a.status !== 'declined')

  /* Other advisors only — exclude the one being removed */
  const candidates = useMemo(
    () => allAdvisors.filter(a => a.id !== advisor?.id),
    [allAdvisors, advisor?.id]
  )

  /* Suggest candidates whose focus matches the flow (loan or advisory) */
  const filterByFocus = (flowKey) =>
    candidates.filter(a => (a.focus ?? []).includes(flowKey))

  /* ── Validation — every field required ── */
  const hasWork = loans.length > 0 || engagements.length > 0
  const noOtherAdvisors = hasWork && candidates.length === 0
  const reasonMissing      = reason.trim().length === 0
  const missingLoanPicks   = loans.filter(l => !loanPicks[l.uuid])
  const missingEngagePicks = engagements.filter(a => !engagementPicks[a.engagement.id])
  const missingPicksCount  = missingLoanPicks.length + missingEngagePicks.length
  const canConfirm         = !reasonMissing && missingPicksCount === 0 && !noOtherAdvisors

  /* Reset touched when modal reopens — note: useEffect lives near top of component */

  if (!open || !advisor) return null

  const handleConfirm = async () => {
    setTouched(true)
    if (!canConfirm) {
      setError(noOtherAdvisors
        ? 'There are no other advisors to hand off to. Add at least one advisor first.'
        : 'Please complete every required field.'
      )
      return
    }
    setBusy(true)
    setError(null)
    try {
      await api.post(`/advisors/${advisor.id}/handoff-delete`, {
        reason: reason.trim(),
        loanReassignments:       loanPicks,
        engagementReassignments: engagementPicks,
      })
      onDone?.()
    } catch (err) {
      setError(err.message ?? 'Could not remove advisor')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45" onClick={busy ? undefined : onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[760px] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-200 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-error flex items-center justify-center shrink-0">
              <TbTrash style={{ fontSize: 19 }} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-gray-900 leading-tight">
                Remove {advisor.name}
              </h2>
              <p className="text-[12.5px] text-secondary mt-0.5">
                Hand off their open work before deleting their profile. This cannot be undone.
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy}
                  className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors disabled:opacity-40">
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 bg-gray-50/50 space-y-5">

          {/* Reason — required */}
          <div>
            <label className="text-[12px] font-semibold text-gray-700 block mb-1.5">
              Reason for leaving <span className="text-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. moved to a different team, retired, no longer with the firm…"
              className={`w-full text-[13px] text-gray-800 placeholder:text-tertiary bg-white border rounded-lg px-3 py-2 outline-none transition-colors resize-none ${
                touched && reasonMissing ? 'border-red-300 focus:border-error' : 'border-gray-200 focus:border-blue-action'
              }`}
            />
            {touched && reasonMissing && (
              <p className="text-[11.5px] text-error mt-1">A reason is required.</p>
            )}
          </div>

          {/* No-other-advisors block */}
          {noOtherAdvisors && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-3 flex items-start gap-2.5 text-[12.5px] text-error">
              <TbAlertTriangle style={{ fontSize: 16 }} className="shrink-0 mt-[1px]" />
              <span>
                No other advisors in the pool. Add at least one replacement before removing {advisor.name}.
              </span>
            </div>
          )}

          {/* Open loans */}
          {loans.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">
                Open loan applications ({loans.length}) <span className="text-error">*</span>
              </p>
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                {loans.map(l => {
                  const flowKey = l.client?.type === 'business' ? 'business-loan' : 'personal-loan'
                  const focused = filterByFocus(flowKey)
                  const invalid = touched && !loanPicks[l.uuid]
                  return (
                    <ReassignRow
                      key={l.uuid}
                      icon={l.client?.type === 'business' ? TbBuilding : TbCash}
                      title={l.client?.name ?? '—'}
                      subtitle={`${l.loanType} · ${fmt$(l.amount)} · ${l.client?.legacyId ?? ''}`}
                      candidates={focused.length > 0 ? focused : candidates}
                      value={loanPicks[l.uuid]}
                      onChange={v => setLoanPicks(s => ({ ...s, [l.uuid]: v }))}
                      invalid={invalid}
                    />
                  )
                })}
              </div>
              {touched && missingLoanPicks.length > 0 && (
                <p className="text-[11.5px] text-error mt-1.5">
                  Pick a replacement for every loan ({missingLoanPicks.length} left).
                </p>
              )}
            </div>
          )}

          {/* Open engagements */}
          {engagements.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">
                Open advisory engagements ({engagements.length}) <span className="text-error">*</span>
              </p>
              <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                {engagements.map(a => {
                  const flowKey = a.engagement.flowKey
                  const focused = filterByFocus(flowKey)
                  const invalid = touched && !engagementPicks[a.engagement.id]
                  return (
                    <ReassignRow
                      key={a.engagement.id}
                      icon={a.engagement.client?.type === 'business' ? TbBuilding : TbUser}
                      title={a.engagement.client?.name ?? '—'}
                      subtitle={`${flowKey === 'business-advisory' ? 'Business' : 'Personal'} advisory · ${a.engagement.client?.id ?? ''}`}
                      candidates={focused.length > 0 ? focused : candidates}
                      value={engagementPicks[a.engagement.id]}
                      onChange={v => setEngagementPicks(s => ({ ...s, [a.engagement.id]: v }))}
                      invalid={invalid}
                    />
                  )
                })}
              </div>
              {touched && missingEngagePicks.length > 0 && (
                <p className="text-[11.5px] text-error mt-1.5">
                  Pick a replacement for every engagement ({missingEngagePicks.length} left).
                </p>
              )}
            </div>
          )}

          {/* No open work */}
          {!hasWork && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white p-5 text-center">
              <TbUserStar className="mx-auto text-tertiary" style={{ fontSize: 26 }} />
              <p className="text-[13px] font-medium text-gray-700 mt-2">No open work to hand off</p>
              <p className="text-[11.5px] text-tertiary mt-1">
                This advisor has no active assignments — safe to remove.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-[12.5px] text-error">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0 bg-white">
          <button onClick={onClose} disabled={busy}
                  className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={busy || noOtherAdvisors}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-lg transition-opacity disabled:opacity-40 ${
                    canConfirm ? 'bg-error hover:opacity-90' : 'bg-error/70 hover:bg-error/80 cursor-not-allowed'
                  }`}
                  title={!canConfirm ? 'Fill every required field first' : undefined}>
            {busy
              ? <><TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Removing…</>
              : <><TbTrash style={{ fontSize: 14 }} /> Confirm removal</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── One row in the hand-off list ─────────────────────────────────────── */
const ReassignRow = ({ icon: Icon, title, subtitle, candidates, value, onChange, invalid }) => (
  <div className="flex items-center gap-3 px-4 py-3">
    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-secondary shrink-0">
      <Icon style={{ fontSize: 16 }} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-medium text-gray-900 truncate">{title}</p>
      <p className="text-[11.5px] text-tertiary truncate">{subtitle}</p>
    </div>
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`w-[240px] text-[12.5px] text-gray-800 bg-white border rounded-lg px-2.5 py-1.5 outline-none transition-colors ${
        invalid
          ? 'border-red-300 focus:border-error bg-red-50/40'
          : 'border-gray-200 focus:border-blue-action'
      }`}
    >
      <option value="" disabled>Select replacement…</option>
      {candidates.length === 0 && <option value="" disabled>(no advisors available)</option>}
      {candidates.map(a => (
        <option key={a.id} value={a.id}>{a.name} · {a.specialty}</option>
      ))}
    </select>
  </div>
)

AdvisorHandoffDeleteModal.propTypes = {
  open:    PropTypes.bool.isRequired,
  advisor: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onDone:  PropTypes.func,
}

export default AdvisorHandoffDeleteModal
