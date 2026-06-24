import { useMemo, useState } from 'react'
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbArrowRight,
  TbBuilding,
  TbCheck,
  TbClock,
  TbLoader2,
  TbReportMoney,
  TbSparkles,
  TbUser,
} from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import ContextChat from '../chat/ContextChat'
import { ADVISORY_QUEUE_PROMPT } from '../chat/chatPrompts'
import { useClientQueues } from '../hooks/useClientQueues'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

const TABS = [
  { key: 'personal-advisory', label: 'Personal Advisory', icon: TbUser },
  { key: 'business-advisory', label: 'Business Advisory', icon: TbBuilding },
]

const STATUS = {
  queued:     { label: 'Queued',     color: 'text-tertiary',     bg: 'bg-gray-100',   icon: TbClock,        dot: 'bg-gray-400' },
  processing: { label: 'Processing', color: 'text-blue-action',  bg: 'bg-blue-50',    icon: TbLoader2,      dot: 'bg-blue-action', spin: true },
  ready:      { label: 'Ready',      color: 'text-success',      bg: 'bg-green-50',   icon: TbCheck,        dot: 'bg-success' },
  error:      { label: 'Error',      color: 'text-error',        bg: 'bg-red-50',     icon: TbAlertCircle,  dot: 'bg-error' },
}

const fmtTime = iso => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

const initialsOf = name => (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const AdvisoryQueuePage = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tab, setTab]               = useState('personal-advisory')
  const queues                      = useClientQueues()

  const items = queues[tab] ?? []

  const stats = useMemo(() => ({
    total:      items.length,
    queued:     items.filter(i => i.status === 'queued').length,
    processing: items.filter(i => i.status === 'processing').length,
    ready:      items.filter(i => i.status === 'ready').length,
    error:      items.filter(i => i.status === 'error').length,
  }), [items])

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span className="text-[14px] font-semibold text-navy">Advisory</span>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 sm:py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-gray-900 leading-tight">Advisory queue</h1>
              <p className="text-[13px] text-secondary mt-1">
                AI reviews documents, flags gaps, and assigns each client to the best-fit advisor.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 sm:mt-6">
            <StatCard label="TOTAL"      value={stats.total}      sub="in this queue"   bar="bg-navy" />
            <StatCard label="QUEUED"     value={stats.queued}     sub="awaiting AI"     bar="bg-gray-400" />
            <StatCard label="PROCESSING" value={stats.processing} sub="AI analysing"    bar="bg-blue-action" />
            <StatCard label="READY"      value={stats.ready}      sub="awaiting review" bar="bg-success" />
            <StatCard label="ERRORS"     value={stats.error}      sub="failed to process" bar="bg-error" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5">
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mb-5 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = tab === key
              const count    = (queues[key] ?? []).length
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-action text-blue-action'
                      : 'border-transparent text-secondary hover:text-gray-800'
                  }`}
                >
                  <Icon style={{ fontSize: 15 }} />
                  {label}
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    isActive ? 'bg-blue-50 text-blue-action' : 'bg-gray-100 text-tertiary'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Queue items */}
          {items.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {items.map(item => <AdvisoryCard key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>

      <ContextChat
        storageKey={`chat:advisory-queue:${tab}`}
        contextLabel={`${tab === 'personal-advisory' ? 'personal' : 'business'} advisory queue · ${items.length} items`}
        contextData={{
          tab,
          totals: stats,
          items: items.map(it => ({
            id: it.id,
            status: it.status,
            createdAt: it.createdAt,
            processedAt: it.processedAt,
            client: it.client && {
              name: it.client.name, type: it.client.type, company: it.client.company,
              email: it.client.email, monthlyGross: it.client.monthlyGross,
            },
            result: it.result && {
              completenessScore: it.result.completenessScore,
              summary: it.result.summary,
              missingDocs: (it.result.documentChecklist ?? []).filter(d => d.status !== 'present').map(d => d.name),
              recommendations: it.result.recommendations,
              assignedAdvisor: it.result.assignedAdvisor && {
                id: it.result.assignedAdvisor.id, name: it.result.assignedAdvisor.name,
                specialty: it.result.assignedAdvisor.specialty,
              },
            },
          })),
        }}
        systemPrompt={ADVISORY_QUEUE_PROMPT}
        suggestions={[
          'Which clients are ready for the analyst now?',
          'What are the most common missing documents this week?',
          'Are any clients stuck in queue too long?',
          'Which assigned advisors are getting the most new clients?',
        ]}
      />
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, bar }) => (
  <div className="bg-white border border-gray-200 rounded-lg px-4 pt-4 pb-0 overflow-hidden">
    <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest">{label}</p>
    <p className="text-[30px] font-bold text-gray-900 leading-none mt-1">{value}</p>
    <p className="text-[11px] text-tertiary mt-1.5 mb-3">{sub}</p>
    <div className="h-[3px] w-full bg-gray-100">
      <div className={`h-full ${bar}`} style={{ width: '100%' }} />
    </div>
  </div>
)

/* ── Advisory card ───────────────────────────────────────────────────── */
const AdvisoryCard = ({ item }) => {
  const navigate   = useNavigate()
  const st         = STATUS[item.status] ?? STATUS.queued
  const StatusIcon = st.icon
  const client     = item.client ?? {}
  const result     = item.result
  const advisor    = result?.assignedAdvisor

  const isBiz = item.flowKey === 'business-advisory'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      {/* Top row — identity + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            {isBiz ? <TbBuilding className="text-secondary" style={{ fontSize: 17 }} /> : <TbUser className="text-secondary" style={{ fontSize: 17 }} />}
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-gray-900 leading-tight truncate">
              {client.name || '—'}
            </p>
            <p className="text-[11.5px] text-tertiary mt-[2px] leading-tight">
              {isBiz && client.company ? `${client.company} · ` : ''}{client.clientId} · added {fmtTime(item.createdAt)}
            </p>
          </div>
        </div>

        {item.engagementStatus === 'confirmed' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-success border border-green-200 text-[11px] font-semibold shrink-0">
            <TbCheck style={{ fontSize: 12 }} /> Engaged
          </span>
        ) : item.engagementStatus === 'declined' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-error border border-red-200 text-[11px] font-semibold shrink-0">
            <TbAlertCircle style={{ fontSize: 12 }} /> Declined
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg} text-[11px] font-semibold ${st.color} shrink-0`}>
            <StatusIcon className={st.spin ? 'animate-spin' : ''} style={{ fontSize: 12 }} />
            {st.label}
          </span>
        )}
      </div>

      {/* While queued/processing */}
      {item.status === 'queued' && (
        <p className="text-[12.5px] text-tertiary italic">Waiting for AI to start…</p>
      )}
      {item.status === 'processing' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11.5px] text-blue-action">
            <span>AI reviewing documents & assigning advisor…</span>
          </div>
          <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-action rounded-full adv-bar" />
          </div>
        </div>
      )}
      {item.status === 'error' && (
        <div className="flex items-start gap-2 text-[12px] text-error bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <TbAlertTriangle className="shrink-0 mt-[1px]" style={{ fontSize: 13 }} />
          <span>{item.error}</span>
        </div>
      )}

      {/* When ready — full result */}
      {item.status === 'ready' && result && (
        <>
          {/* Completeness score + summary */}
          <div className="flex items-start gap-3">
            <ScorePill score={result.completenessScore} />
            <p className="text-[13px] text-secondary leading-snug flex-1">{result.summary}</p>
          </div>

          {/* Document checklist preview */}
          {result.documentChecklist?.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {result.documentChecklist.slice(0, 6).map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11.5px]">
                  <DocDot status={d.status} />
                  <span className="text-gray-700 truncate">{d.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Top recommendation */}
          {result.recommendations?.[0] && (
            <div className="flex items-start gap-2 text-[12.5px] text-secondary border-t border-gray-100 pt-3">
              <TbSparkles className="text-blue-action shrink-0 mt-[1px]" style={{ fontSize: 13 }} />
              <span className="leading-snug">{result.recommendations[0]}</span>
            </div>
          )}

          {/* Assigned advisor */}
          {advisor && (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                {advisor.initials ?? initialsOf(advisor.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-gray-900 leading-tight truncate">
                  Assigned to {advisor.name}
                </p>
                <p className="text-[11px] text-tertiary truncate">{advisor.specialty}</p>
              </div>
              <span className="text-[10.5px] text-tertiary shrink-0">{advisor.id}</span>
            </div>
          )}
        </>
      )}

      {/* Footer — Review button always available */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-[11.5px] text-tertiary">
          {item.processedAt
            ? `Processed ${fmtTime(item.processedAt)}`
            : item.status === 'queued' ? 'Awaiting AI'
            : item.status === 'processing' ? 'AI in progress'
            : 'Submitted ' + fmtTime(item.createdAt)}
        </span>
        <button
          onClick={() => navigate(`/underwriting/advisory/review/${item.id}`)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-[13px] font-medium rounded-lg text-white bg-navy hover:opacity-90 transition-opacity"
        >
          Review
          <TbArrowRight style={{ fontSize: 14 }} />
        </button>
      </div>

      <style>{`
        @keyframes adv-bar-anim {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(60%); }
          100% { transform: translateX(220%); }
        }
        .adv-bar { width: 40%; animation: adv-bar-anim 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

/* ── Score pill ──────────────────────────────────────────────────────── */
const ScorePill = ({ score }) => {
  const { bg, text } =
    score >= 80 ? { bg: 'bg-green-50',  text: 'text-success' } :
    score >= 60 ? { bg: 'bg-orange-50', text: 'text-warning' } :
                  { bg: 'bg-red-50',    text: 'text-error'   }
  return (
    <div className={`${bg} ${text} rounded-lg px-2.5 py-1.5 text-center shrink-0`}>
      <p className="text-[15px] font-bold leading-none">{score}</p>
      <p className="text-[9px] font-semibold uppercase tracking-widest mt-0.5">Score</p>
    </div>
  )
}

/* ── Doc checklist dot ───────────────────────────────────────────────── */
const DocDot = ({ status }) => {
  const cls =
    status === 'present'      ? 'bg-success' :
    status === 'missing'      ? 'bg-error'   :
    status === 'low_quality'  ? 'bg-warning' :
                                'bg-warning'
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cls}`} />
}

const EmptyState = () => (
  <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
    <TbReportMoney className="mx-auto text-tertiary" style={{ fontSize: 32 }} />
    <p className="text-[14px] text-gray-700 font-medium mt-3">No advisory clients in this queue yet</p>
    <p className="text-[12.5px] text-tertiary mt-1">
      Add a client via <span className="font-semibold">Loan Applications → Add Client</span> and select an Advisory flow.
    </p>
  </div>
)

export default AdvisoryQueuePage
