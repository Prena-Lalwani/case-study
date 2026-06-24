import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { useUrlState } from '../../../hooks/useNavState'
import {
  TbHome,
  TbCar,
  TbUser,
  TbBriefcase,
  TbClock,
  TbAdjustments,
  TbCheck,
  TbAlertTriangle,
  TbArrowRight,
  TbSparkles,
  TbX,
} from 'react-icons/tb'

/* ─── Loan type → icon ───────────────────────────────────────────────────── */
const LOAN_ICONS = {
  'Home loan':     TbHome,
  'Auto loan':     TbCar,
  'Personal loan': TbUser,
  'Business loan': TbBriefcase,
}

/* ─── Tab definitions ────────────────────────────────────────────────────── */
const TABS = [
  { key: 'all',           label: 'All applications' },
  { key: 'ai_reviewing',  label: 'AI reviewing'     },
  { key: 'needs_review',  label: 'Needs review'     },
  { key: 'auto_rejected', label: 'Auto-rejected'    },
  { key: 'approved',      label: 'Approved'         },
]

/* Statuses that appear in the "All applications" view. We exclude raw
   'submitted' (an unprocessed staging state that shouldn't normally exist). */
const ALL_STATUSES = ['ai_reviewing', 'needs_review', 'auto_rejected', 'approved']

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const fmtAmount = n =>
  '$' + n.toLocaleString('en-US')

const fmtDate = iso =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

/* ─── AI score badge ─────────────────────────────────────────────────────── */
const ScoreBadge = ({ score }) => {
  if (score === null) {
    return (
      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-100">
          <TbSparkles className="text-tertiary" style={{ fontSize: 15 }} />
          <span className="text-[18px] font-bold text-tertiary leading-none">—</span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">
          AI SCORE
        </span>
      </div>
    )
  }

  const green  = score >= 75
  const orange = score >= 50
  const { bg, Icon, cls } = green
    ? { bg: 'bg-green-50',  Icon: TbCheck,         cls: 'text-success' }
    : orange
    ? { bg: 'bg-orange-50', Icon: TbAlertTriangle, cls: 'text-warning' }
    : { bg: 'bg-red-50',    Icon: TbAlertTriangle, cls: 'text-error'   }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md ${bg}`}>
        <Icon className={cls} style={{ fontSize: 15 }} />
        <span className={`text-[18px] font-bold leading-none ${cls}`}>{score}%</span>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-tertiary">
        AI SCORE
      </span>
    </div>
  )
}

ScoreBadge.propTypes = { score: PropTypes.number }

/* ─── Override modal ─────────────────────────────────────────────────────── */
const OverrideModal = ({ app, onClose, onConfirm }) => {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[440px] mx-4 p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-semibold text-gray-900">
              Override auto-rejection
            </h3>
            <p className="text-[12px] text-secondary mt-0.5">
              {app.id} · {app.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-secondary transition-colors"
          >
            <TbX style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3.5 py-2.5 mb-4">
          <p className="text-[12px] text-orange-700 leading-snug">
            This action will be logged and escalated for senior compliance review.
          </p>
        </div>

        {/* Reason field */}
        <label className="block text-[12px] font-medium text-gray-700 mb-1.5">
          Reason for override <span className="text-error">*</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          placeholder="Describe why this rejection should be overridden..."
          className="w-full text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg px-3 py-2.5 resize-none outline-none focus:border-blue-action transition-colors"
        />

        {/* Actions */}
        <div className="flex justify-end gap-2.5 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm override
          </button>
        </div>
      </div>
    </div>
  )
}

OverrideModal.propTypes = {
  app:       PropTypes.object.isRequired,
  onClose:   PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

/* ─── Status pill ─────────────────────────────────────────────────────── */
const STATUS_PILL = {
  ai_reviewing:  { label: 'AI reviewing', bg: 'bg-blue-50',   color: 'text-blue-action' },
  needs_review:  { label: 'Needs review', bg: 'bg-orange-50', color: 'text-warning'     },
  auto_rejected: { label: 'Rejected',     bg: 'bg-red-50',    color: 'text-error'       },
  approved:      { label: 'Approved',     bg: 'bg-green-50',  color: 'text-success'     },
}

/* ─── Single application card ────────────────────────────────────────────── */
const ApplicationCard = ({ app }) => {
  const navigate      = useNavigate()
  const LoanIcon      = LOAN_ICONS[app.loanType] ?? TbUser
  const isRejected    = app.status === 'auto_rejected'
  const isProcessing  = app.status === 'ai_reviewing'
  const isApproved    = app.status === 'approved'
  const pill          = STATUS_PILL[app.status]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-[14px] hover:shadow-sm transition-shadow">

      {/* Row 1 — identity + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <LoanIcon className="text-secondary" style={{ fontSize: 17 }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[15px] font-semibold text-gray-900 leading-tight truncate">{app.name}</p>
              {pill && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pill.bg} ${pill.color}`}>
                  {isProcessing && <TbSparkles className="animate-pulse" style={{ fontSize: 9 }} />}
                  {pill.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-tertiary mt-[3px] leading-tight">
              {app.loanType} · {app.id} · {fmtDate(app.date)}
            </p>
          </div>
        </div>
        <ScoreBadge score={app.aiScore} />
      </div>

      {/* Row 2 — loan amount */}
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] font-bold text-gray-900 leading-none">
          {fmtAmount(app.loanAmount)}
        </span>
        <span className="text-[13px] text-tertiary">
          over {app.loanTerm} yrs
        </span>
      </div>

      {/* Row 3 — AI summary / rejection reason */}
      {isProcessing ? (
        <div className="flex items-start gap-2 bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2.5">
          <TbSparkles className="text-blue-action shrink-0 mt-[1px] animate-pulse" style={{ fontSize: 14 }} />
          <p className="text-[13px] text-blue-action leading-snug">AI is analysing the documents — the score will appear here in a few seconds.</p>
        </div>
      ) : isRejected ? (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <TbAlertTriangle className="text-error shrink-0 mt-[1px]" style={{ fontSize: 14 }} />
          <p className="text-[13px] text-error leading-snug">{app.summary}</p>
        </div>
      ) : isApproved ? (
        <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
          <TbCheck className="text-success shrink-0 mt-[1px]" style={{ fontSize: 14 }} />
          <p className="text-[13px] text-success leading-snug">{app.summary ?? 'Approved'}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <span className="text-blue-action text-[12px] shrink-0 mt-[1px]">✦</span>
          <p className="text-[13px] text-secondary leading-snug">{app.summary}</p>
        </div>
      )}

      {/* Assigned case officer (advisor handling this loan) */}
      {app.assignedAdvisor ? (
        <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 border border-gray-100 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-[10.5px] font-semibold shrink-0">
            {app.assignedAdvisor.initials}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-tertiary leading-none">CASE OFFICER</p>
            <p className="text-[12.5px] font-medium text-gray-900 mt-0.5 truncate">{app.assignedAdvisor.name}</p>
          </div>
        </div>
      ) : (
        !isProcessing && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-[11.5px] text-tertiary">
            <TbUser style={{ fontSize: 12 }} />
            No case officer assigned yet
          </div>
        )
      )}

      {/* Row 4 — footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <TbClock className="text-tertiary" style={{ fontSize: 13 }} />
          <span className="text-[12px] text-tertiary">
            {app.analysedInSeconds != null
              ? `Analysed in ${app.analysedInSeconds} sec`
              : 'Analysis in progress'}
          </span>
        </div>

        <button
          onClick={() => navigate(`/underwriting/review/${app.id}`)}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-opacity hover:opacity-90 ${
            isRejected
              ? 'text-white bg-error'
              : 'text-white bg-navy'
          }`}
        >
          Review
          <TbArrowRight style={{ fontSize: 14 }} />
        </button>
      </div>
    </div>
  )
}

ApplicationCard.propTypes = {
  app: PropTypes.object.isRequired,
}

/* ─── Sort options ───────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { key: 'ai_desc',      label: 'AI score (high → low)',  apply: (a, b) => (b.aiScore ?? -1) - (a.aiScore ?? -1) },
  { key: 'ai_asc',       label: 'AI score (low → high)',  apply: (a, b) => (a.aiScore ?? 999) - (b.aiScore ?? 999) },
  { key: 'amount_desc',  label: 'Loan amount (high → low)', apply: (a, b) => (b.loanAmount ?? 0) - (a.loanAmount ?? 0) },
  { key: 'amount_asc',   label: 'Loan amount (low → high)', apply: (a, b) => (a.loanAmount ?? 0) - (b.loanAmount ?? 0) },
  { key: 'date_desc',    label: 'Newest first',  apply: (a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0) },
  { key: 'date_asc',     label: 'Oldest first',  apply: (a, b) => new Date(a.date ?? 0) - new Date(b.date ?? 0) },
  { key: 'name_asc',     label: 'Applicant (A → Z)', apply: (a, b) => (a.name ?? '').localeCompare(b.name ?? '') },
  { key: 'dti_desc',     label: 'DTI (high → low)', apply: (a, b) => (b.dti ?? -1) - (a.dti ?? -1) },
]

/* ─── Main view ──────────────────────────────────────────────────────────── */
const ApplicationQueueView = ({ apps }) => {
  const [activeTab, setActiveTab] = useUrlState('tab', 'all')
  const [sortKey, setSortKey]     = useUrlState('sort', 'ai_desc')
  const [sortOpen, setSortOpen]   = useState(false)
  const [sortPos, setSortPos]     = useState(null)   // { top, right } for the fixed menu
  const sortRef = useRef(null)
  const sortBtnRef = useRef(null)

  /* Close dropdown on outside click / scroll (menu is fixed-positioned to
     escape the tab bar's horizontal-scroll clipping). */
  useEffect(() => {
    if (!sortOpen) return
    const onClick = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
    const onScroll = () => setSortOpen(false)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [sortOpen])

  const toggleSort = () => {
    if (sortOpen) { setSortOpen(false); return }
    const r = sortBtnRef.current.getBoundingClientRect()
    setSortPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    setSortOpen(true)
  }

  const counts = useMemo(() => ({
    all:           apps.filter(a => ALL_STATUSES.includes(a.status)).length,
    ai_reviewing:  apps.filter(a => a.status === 'ai_reviewing').length,
    needs_review:  apps.filter(a => a.status === 'needs_review').length,
    auto_rejected: apps.filter(a => a.status === 'auto_rejected').length,
    approved:      apps.filter(a => a.status === 'approved').length,
  }), [apps])

  const filtered = useMemo(() => {
    const sortFn = (SORT_OPTIONS.find(o => o.key === sortKey) ?? SORT_OPTIONS[0]).apply
    return apps
      .filter(a =>
        activeTab === 'all'
          ? ALL_STATUSES.includes(a.status)
          : a.status === activeTab
      )
      .slice()
      .sort(sortFn)
  }, [apps, activeTab, sortKey])

  const activeSortLabel = (SORT_OPTIONS.find(o => o.key === sortKey) ?? SORT_OPTIONS[0]).label

  return (
    <>
      {/* ── Tab bar ── */}
      <div className="flex items-center border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key
                ? 'border-blue-action text-blue-action'
                : 'border-transparent text-secondary hover:text-gray-800'
            }`}
          >
            {label}
            <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
              activeTab === key
                ? 'bg-blue-50 text-blue-action'
                : 'bg-gray-100 text-tertiary'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}

        <div className="flex-1" />

        {/* Sort dropdown */}
        <div className="relative pb-3 shrink-0" ref={sortRef}>
          <button
            ref={sortBtnRef}
            onClick={toggleSort}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${
              sortOpen ? 'bg-gray-100 text-gray-900' : 'text-secondary hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TbAdjustments style={{ fontSize: 14 }} />
            Sort: {activeSortLabel}
          </button>

          {sortOpen && (
            <div
              style={{ position: 'fixed', top: sortPos?.top, right: sortPos?.right }}
              className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
            >
              {SORT_OPTIONS.map(opt => {
                const active = opt.key === sortKey
                return (
                  <button
                    key={opt.key}
                    onClick={() => { setSortKey(opt.key); setSortOpen(false) }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[12.5px] text-left transition-colors ${
                      active ? 'bg-blue-50 text-blue-action font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                    {active && <TbCheck style={{ fontSize: 13 }} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── card grid — single column on mobile, two on larger screens ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(app => (
          <ApplicationCard key={app.id} app={app} />
        ))}
      </div>

      {/* ── Override modal (portal-like, renders above everything) ── */}
    </>
  )
}

ApplicationQueueView.propTypes = {
  apps: PropTypes.array.isRequired,
}

export default ApplicationQueueView
