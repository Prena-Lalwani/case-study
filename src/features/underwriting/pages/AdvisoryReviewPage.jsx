import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TbAlertCircle,
  TbAlertTriangle,
  TbArrowLeft,
  TbBuilding,
  TbCheck,
  TbCircleCheck,
  TbCircleX,
  TbClock,
  TbExchange,
  TbFileText,
  TbHistory,
  TbId,
  TbLoader2,
  TbReportMoney,
  TbSparkles,
  TbTrendingUp,
  TbUserStar,
  TbWallet,
} from 'react-icons/tb'
import { useNavigate, useParams } from 'react-router-dom'
import ContextChat from '../chat/ContextChat'
import { ADVISORY_REVIEW_PROMPT } from '../chat/chatPrompts'
import ReassignAdvisorModal from '../components/ReassignAdvisorModal'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import { useClientQueues } from '../hooks/useClientQueues'
import { refreshClients } from '../hooks/useClients'
import { refreshQueues } from '../services/clientQueueStore'
import {
  confirmAssignment,
  declineEngagement,
  getEngagement,
  reassignAdvisor,
} from '../services/engagementService'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

const C = {
  primary:  '#2563EB',
  success:  '#16A34A',
  warning:  '#F59E0B',
  critical: '#DC2626',
  track:    '#F3F4F6',
  text:     '#111827',
  muted:    '#6B7280',
  border:   '#E5E7EB',
  bg:       '#F8FAFC',
}

const STATUS = {
  queued:     { label: 'Queued',     color: 'text-tertiary',    bg: 'bg-gray-100', border: 'border-gray-200',  icon: TbClock },
  processing: { label: 'Processing', color: 'text-blue-action', bg: 'bg-blue-50',  border: 'border-blue-200',  icon: TbLoader2, spin: true },
  ready:      { label: 'Ready',      color: 'text-success',     bg: 'bg-green-50', border: 'border-green-200', icon: TbCheck },
  error:      { label: 'Error',      color: 'text-error',       bg: 'bg-red-50',   border: 'border-red-200',   icon: TbAlertCircle },
}

const fmt$ = v => (v === '' || v == null || Number(v) === 0) ? '—' : `$${Number(v).toLocaleString()}`
const fmtK = v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k` : `$${v}`
const initialsOf = name => (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtTime = iso => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const scoreColor = s => s >= 80 ? C.success : s >= 60 ? C.warning : C.critical

/* ── SVG Ring ────────────────────────────────────────────────────────── */
const RingChart = ({ pct = 0, color = C.primary, size = 96, stroke = 9, children }) => {
  const r    = (size - stroke * 2) / 2
  const cx   = size / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(pct, 0), 1) * circ
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}

/* Round a value up to a "nice" boundary so ticks look clean (0, 50k, 100k, …) */
const niceCeil = v => {
  if (v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const base = Math.pow(10, exp)
  const f = v / base
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * base
}

/* ── Smooth curve helper (Catmull-Rom → cubic bezier) ────────────────── */
const crCurve = pts => {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : ''
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${cp1.x.toFixed(2)},${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)},${cp2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

/* Synthesise 3 months of plausible banking data from the aggregated averages. */
const synthMonths = (client) => {
  const avgC = Number(client.averageMonthlyCredit  ?? 0)
  const avgD = Number(client.averageMonthlyDebit   ?? 0)
  const avgB = Number(client.averageClosingBalance ?? 0)
  if (avgC === 0 && avgD === 0 && avgB === 0) return []
  const labels = ['Mar 2026', 'Apr 2026', 'May 2026']
  const scale = (avg, factor) => Math.round(avg * factor)
  return [
    { month: labels[0], totalCredits: scale(avgC, 0.94), totalDebits: scale(avgD, 0.96), closingBalance: scale(avgB, 0.94) },
    { month: labels[1], totalCredits: scale(avgC, 1.00), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 0.99) },
    { month: labels[2], totalCredits: scale(avgC, 1.06), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 1.06) },
  ]
}

/* ── Banking Chart ───────────────────────────────────────────────────── */
const BankingChart = ({ months }) => {
  const chartRef = useRef(null)
  const [sz, setSz] = useState({ w: 600, h: 200 })

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width > 0 && height > 0) setSz({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!months?.length) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-tertiary text-[13px]">
        No banking activity available
      </div>
    )
  }

  const { w, h } = sz
  const PAD = { t: 12, r: 16, b: 32, l: 56 }
  const pw = Math.max(w - PAD.l - PAD.r, 1)
  const ph = Math.max(h - PAD.t - PAD.b, 1)

  const bal  = months.map(m => m.closingBalance ?? 0)
  const cred = months.map(m => m.totalCredits   ?? 0)
  const deb  = months.map(m => m.totalDebits    ?? 0)
  const all  = [...bal, ...cred, ...deb]
  const dMax = Math.max(...all)
  /* Nice rounded Y range so labels don't end up at awkward fractions */
  const yMin = 0
  const yMax = niceCeil(dMax * 1.12)
  const ySpan = yMax - yMin || 1

  const n = months.length
  const xOf = i => PAD.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw)
  const yOf = v => PAD.t + (1 - (v - yMin) / ySpan) * ph

  const pts = arr => arr.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
  const balPts = pts(bal), credPts = pts(cred), debPts = pts(deb)
  const balPath = crCurve(balPts), credPath = crCurve(credPts), debPath = crCurve(debPts)
  const areaClose = n > 1 ? ` L${xOf(n - 1).toFixed(2)},${(PAD.t + ph).toFixed(2)} L${PAD.l.toFixed(2)},${(PAD.t + ph).toFixed(2)}Z` : ''
  /* 4 ticks (instead of 5) for tighter charts so labels never collide */
  const tickCount = h < 200 ? 4 : 5
  const yTicks = Array.from({ length: tickCount }, (_, i) => (i / (tickCount - 1)) * ySpan)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-start justify-between mb-2 shrink-0">
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1 }}>Banking activity</p>
          <p style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>Last {n} months · primary account</p>
        </div>
        <div className="flex gap-3 text-[10.5px] text-secondary">
          <Legend color={C.primary} dash={false} label="Balance" />
          <Legend color={C.success} dash={false} label="Credits" />
          <Legend color="#94A3B8"   dash={true}  label="Debits" />
        </div>
      </div>

      <div ref={chartRef} style={{ flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="adv_balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={C.primary} stopOpacity="0.18" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0.00" />
            </linearGradient>
          </defs>
          {yTicks.map((v, i) => {
            const y = yOf(v)
            return (
              <g key={i}>
                <line x1={PAD.l} y1={y} x2={w - PAD.r} y2={y} stroke="#EFF2F7" strokeWidth="1" />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="10.5" fill={C.muted}>{fmtK(v)}</text>
              </g>
            )
          })}
          <line x1={PAD.l} y1={PAD.t + ph} x2={w - PAD.r} y2={PAD.t + ph} stroke="#E2E8F0" strokeWidth="1" />
          <path d={balPath + areaClose} fill="url(#adv_balFill)" />
          <path d={debPath}  fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
          <path d={credPath} fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" />
          <path d={balPath}  fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
          {balPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={C.primary} strokeWidth="2" />
          ))}
          {months.map((m, i) => (
            <text key={i} x={xOf(i)} y={h - 6} textAnchor="middle" fontSize="11" fill={C.muted}>
              {m.month?.split(' ')[0]}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}

const Legend = ({ color, dash, label }) => (
  <div className="flex items-center gap-1.5">
    <svg width="20" height="8"><line x1="1" y1="4" x2="19" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash ? '4 3' : undefined} strokeLinecap="round" /></svg>
    {label}
  </div>
)

/* ── Page ────────────────────────────────────────────────────────────── */
const AdvisoryReviewPage = () => {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const queues = useClientQueues()

  const item = useMemo(() => {
    for (const flowKey of Object.keys(queues)) {
      const found = queues[flowKey].find(it => it.id === itemId)
      if (found) return found
    }
    return null
  }, [queues, itemId])

  /* All hooks must run unconditionally — early return comes AFTER. */
  const client     = item?.client ?? {}
  const result     = item?.result
  const advisor    = result?.assignedAdvisor
  const isBusiness = item?.flowKey === 'business-advisory'
  const st         = STATUS[item?.status] ?? STATUS.queued
  const StIcon     = st.icon
  const months     = useMemo(() => synthMonths(client), [client])

  /* ── Engagement state — lifecycle status + timeline ── */
  const engagementId    = item?.advisoryEngagementId
  const initialStatus   = item?.engagementStatus ?? (advisor ? 'proposed' : 'pending')
  const [engagement, setEngagement] = useState(null)
  const [actionBusy, setActionBusy] = useState(null)   // 'confirm' | 'reassign' | 'decline' | null
  const [actionError, setActionError] = useState(null)
  const [reassignOpen, setReassignOpen] = useState(false)

  /* Hydrate full engagement (with timeline) when the page mounts. */
  useEffect(() => {
    if (!engagementId) return
    let cancelled = false
    getEngagement(engagementId)
      .then(e => { if (!cancelled) setEngagement(e) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [engagementId])

  /* Not-found state — placed AFTER all hooks to satisfy Rules of Hooks */
  if (!item) {
    return (
      <div className="fixed inset-0 flex bg-white overflow-hidden">
        <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="flex-1 flex items-center justify-center bg-page">
          <div className="text-center">
            <p className="text-[14px] text-gray-700">Advisory item not found.</p>
            <button onClick={() => navigate('/underwriting/advisory')} className="mt-3 px-4 py-2 text-[13px] font-medium text-white bg-navy rounded-lg">
              Back to advisory queue
            </button>
          </div>
        </div>
      </div>
    )
  }

  const refresh = async () => {
    if (!engagementId) return
    const e = await getEngagement(engagementId).catch(() => null)
    if (e) setEngagement(e)
    refreshQueues()
    refreshClients()
  }

  const engagementStatus = engagement?.status ?? initialStatus  // 'pending'|'proposed'|'confirmed'|'declined'
  const isReady          = item.status === 'ready'
  const canAct           = isReady && engagementStatus === 'proposed'
  const isConfirmed      = engagementStatus === 'confirmed'
  const isDeclined       = engagementStatus === 'declined'

  /* ── Action handlers ── */
  const onConfirm = async () => {
    setActionBusy('confirm'); setActionError(null)
    try { await confirmAssignment(engagementId, CURRENT_USER.name); await refresh() }
    catch (err) { setActionError(err.message ?? 'Could not confirm') }
    finally { setActionBusy(null) }
  }
  const onReassign = async (newAdvisorId, reason) => {
    setActionBusy('reassign'); setActionError(null)
    try { await reassignAdvisor(engagementId, newAdvisorId, reason, CURRENT_USER.name); await refresh() }
    catch (err) { setActionError(err.message ?? 'Reassign failed'); throw err }
    finally { setActionBusy(null) }
  }
  const onDecline = async () => {
    const reason = prompt('Reason for declining this engagement? (optional)') ?? ''
    if (!confirm('Decline this engagement? This will close it and the client will be marked inactive.')) return
    setActionBusy('decline'); setActionError(null)
    try { await declineEngagement(engagementId, reason.trim() || null, CURRENT_USER.name); await refresh() }
    catch (err) { setActionError(err.message ?? 'Decline failed') }
    finally { setActionBusy(null) }
  }

  /* derived metrics */
  const gross    = Number(client.monthlyGross ?? 0)
  const net      = Number(client.monthlyNet   ?? 0)
  const balance  = Number(client.averageClosingBalance ?? 0)
  const credit   = Number(client.creditScore ?? 0)
  const savingsRate = gross > 0 ? Math.max(0, Math.min(1, (gross - net) / gross)) : 0

  /* Doc completeness summary for the side panel */
  const docStats = useMemo(() => {
    const list = result?.documentChecklist ?? []
    return {
      total:    list.length,
      present:  list.filter(d => d.status === 'present').length,
      missing:  list.filter(d => d.status === 'missing').length,
      issues:   list.filter(d => d.status === 'low_quality' || d.status === 'inconsistent').length,
    }
  }, [result])

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Advisory review</span>
        </div>

        {/* Compact header */}
        <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '14px 24px', flexShrink: 0 }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => navigate('/underwriting/advisory')} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <TbArrowLeft style={{ fontSize: 15 }} /> Queue
              </button>
              <div className="w-9 h-9 rounded-full bg-blue-action text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                {initialsOf(client.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1 }}>{client.name ?? '—'}</h1>
                  <span style={{ fontSize: 12, color: C.muted }}>
                    {isBusiness ? 'Business' : 'Personal'} advisory · {item.id}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                  Submitted {fmtTime(item.createdAt)}
                  {item.processedAt && ` · Processed ${fmtTime(item.processedAt)}`}
                </p>
              </div>
            </div>

            {isConfirmed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-success border border-green-200 text-[12px] font-semibold shrink-0">
                <TbCircleCheck style={{ fontSize: 13 }} /> Engaged
              </span>
            ) : isDeclined ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-error border border-red-200 text-[12px] font-semibold shrink-0">
                <TbCircleX style={{ fontSize: 13 }} /> Declined
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${st.bg} text-[12px] font-semibold ${st.color} border ${st.border} shrink-0`}>
                <StIcon className={st.spin ? 'animate-spin' : ''} style={{ fontSize: 13 }} />
                {st.label}
              </span>
            )}
          </div>
        </div>

        {/* Body — split 70/30 */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Main column */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* HERO — Score + Summary */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, display: 'grid', gridTemplateColumns: '180px 1fr', gap: 24, alignItems: 'center' }}>
              {/* Score ring */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <RingChart
                  pct={result ? result.completenessScore / 100 : 0}
                  color={result ? scoreColor(result.completenessScore) : C.track}
                  size={144} stroke={13}
                >
                  {item.status === 'queued' || item.status === 'processing' ? (
                    <TbLoader2 className="animate-spin" style={{ fontSize: 30, color: C.muted }} />
                  ) : item.status === 'error' ? (
                    <TbAlertCircle style={{ fontSize: 30, color: C.critical }} />
                  ) : (
                    <>
                      <span style={{ fontSize: 38, fontWeight: 800, color: scoreColor(result.completenessScore), lineHeight: 1 }}>
                        {result.completenessScore}
                      </span>
                      <span style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                        Completeness
                      </span>
                    </>
                  )}
                </RingChart>
                <span style={{ fontSize: 12, fontWeight: 700, color: result ? scoreColor(result.completenessScore) : C.muted }}>
                  {item.status === 'queued' ? 'Queued'
                    : item.status === 'processing' ? 'Analysing…'
                    : item.status === 'error' ? 'Failed'
                    : result.completenessScore >= 80 ? 'Engagement-ready'
                    : result.completenessScore >= 60 ? 'Needs follow-up'
                    : 'Significant gaps'}
                </span>
              </div>

              {/* Summary text */}
              <div>
                {item.status === 'ready' && result ? (
                  <>
                    <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>AI executive summary</p>
                    <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6, marginTop: 8 }}>{result.summary}</p>

                    {/* AI processing time */}
                    <div className="flex items-center gap-3 mt-4 text-[11px] text-tertiary">
                      <span className="flex items-center gap-1">
                        <TbClock style={{ fontSize: 11 }} /> Analysed in {result.analysedInSeconds}s
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <TbSparkles style={{ fontSize: 11 }} /> Gemini 2.5 Flash
                      </span>
                    </div>
                  </>
                ) : item.status === 'error' ? (
                  <div className="flex items-start gap-2 text-error">
                    <TbAlertTriangle style={{ fontSize: 16, marginTop: 1 }} className="shrink-0" />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>AI processing failed</p>
                      <p style={{ fontSize: 12, marginTop: 3, opacity: 0.85 }}>{item.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-action">
                    <TbLoader2 className="animate-spin" style={{ fontSize: 16 }} />
                    <span style={{ fontSize: 13 }}>
                      {item.status === 'queued' ? 'In queue — AI will start shortly…' : 'AI is reading documents and matching to an advisor…'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* METRIC TILES — 4 donut cards */}
            <div className="grid grid-cols-4 gap-3">
              <MetricCard
                label={isBusiness ? 'Monthly revenue' : 'Monthly income'}
                value={fmtK(gross)}
                pct={Math.min(gross / (isBusiness ? 500_000 : 20_000), 1)}
                color={C.primary}
                sub={net > 0 ? `Net: ${fmtK(net)}` : null}
              />
              <MetricCard
                label="Savings rate"
                value={`${Math.round(savingsRate * 100)}%`}
                pct={savingsRate}
                color={savingsRate >= 0.2 ? C.success : savingsRate >= 0.1 ? C.warning : C.critical}
                sub={savingsRate >= 0.2 ? 'Healthy' : savingsRate >= 0.1 ? 'Adequate' : 'Low'}
              />
              <MetricCard
                label="Avg balance"
                value={fmtK(balance)}
                pct={Math.min(balance / (isBusiness ? 1_000_000 : 50_000), 1)}
                color={C.primary}
                sub={client.statementPeriod || '—'}
              />
              {credit > 0 ? (
                <MetricCard
                  label="Credit score"
                  value={credit}
                  pct={(credit - 300) / 550}
                  color={credit >= 740 ? C.success : credit >= 670 ? C.warning : C.critical}
                  sub={credit >= 740 ? 'Excellent' : credit >= 670 ? 'Good' : credit >= 580 ? 'Fair' : 'Poor'}
                />
              ) : (
                <MetricCard
                  label="Doc coverage"
                  value={docStats.total > 0 ? `${docStats.present}/${docStats.total}` : '—'}
                  pct={docStats.total > 0 ? docStats.present / docStats.total : 0}
                  color={docStats.missing === 0 ? C.success : C.warning}
                  sub={docStats.missing > 0 ? `${docStats.missing} missing` : 'Complete'}
                />
              )}
            </div>

            {/* BANKING CHART — fixed 22vh × 60% to match loan review.
                Outer wrapper constrains width; inner card fills it. This pattern
                survives any flex-column stretching that an inline `width: 60%` alone misses. */}
            <div style={{ width: '60%', alignSelf: 'flex-start', flexShrink: 0 }}>
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, height: '22vh', width: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                <BankingChart months={months} />
              </div>
            </div>

            {/* DOCUMENT CHECKLIST — visual grid */}
            {result?.documentChecklist?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Document checklist</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>AI-audited document review</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span className="flex items-center gap-1.5 text-success"><span className="w-2 h-2 rounded-full bg-success" />{docStats.present} present</span>
                    {docStats.issues > 0 && <span className="flex items-center gap-1.5 text-warning"><span className="w-2 h-2 rounded-full bg-warning" />{docStats.issues} issues</span>}
                    {docStats.missing > 0 && <span className="flex items-center gap-1.5 text-error"><span className="w-2 h-2 rounded-full bg-error" />{docStats.missing} missing</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {result.documentChecklist.map((d, i) => <DocTile key={i} doc={d} />)}
                </div>
              </div>
            )}

            {/* STRENGTHS / ISSUES side-by-side */}
            {result && (result.strengths?.length > 0 || result.issues?.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <FactorPanel
                  title="Strengths"
                  count={result.strengths?.length ?? 0}
                  items={result.strengths}
                  icon={TbCircleCheck}
                  accent={C.success}
                  accentBg="#F0FDF4"
                  accentBorder="#86EFAC"
                />
                <FactorPanel
                  title="Issues"
                  count={result.issues?.length ?? 0}
                  items={result.issues}
                  icon={TbAlertTriangle}
                  accent={C.warning}
                  accentBg="#FFFBEB"
                  accentBorder="#FCD34D"
                />
              </div>
            )}

            {/* RECOMMENDATIONS — visual numbered cards */}
            {result?.recommendations?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <div className="flex items-center gap-2 mb-3">
                  <TbSparkles className="text-blue-action" style={{ fontSize: 16 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Recommendations</p>
                  <span className="ml-auto text-[11px] text-tertiary">{result.recommendations.length} actions</span>
                </div>
                <div className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gradient-to-r from-blue-50/60 to-transparent border border-blue-100 rounded-lg px-3 py-3">
                      <div className="w-7 h-7 rounded-full bg-blue-action text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                        {i + 1}
                      </div>
                      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.55, paddingTop: 4 }}>{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ENGAGEMENT TIMELINE — audit trail */}
            {engagement?.timeline?.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <div className="flex items-center gap-2 mb-3">
                  <TbHistory className="text-secondary" style={{ fontSize: 16 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Engagement timeline</p>
                  <span className="ml-auto text-[11px] text-tertiary">{engagement.timeline.length} events</span>
                </div>
                <TimelineList events={engagement.timeline} />
              </div>
            )}

            {/* CLIENT DATA — compact rows with visual emphasis */}
            <div className="grid grid-cols-2 gap-3">
              <DataCard title="Identity" icon={TbId}>
                <DataRow label="Full name"    value={client.name} />
                {isBusiness && <DataRow label="Company" value={client.company} />}
                <DataRow label="Email"        value={client.email} />
                <DataRow label="Phone"        value={client.phone} />
                <DataRow label="Date of birth" value={client.dateOfBirth} />
                <DataRow label="ID number"    value={client.idNumber} mono />
                <DataRow label="Address"      value={client.address} wrap />
              </DataCard>

              <DataCard title={isBusiness ? 'Business operations' : 'Employment'} icon={TbBuilding}>
                <DataRow label={isBusiness ? 'Entity'  : 'Employer'}  value={client.employer} />
                <DataRow label={isBusiness ? 'Sector'  : 'Job title'} value={client.jobTitle} />
                <DataRow label={isBusiness ? 'Revenue/mo' : 'Gross/mo'}  value={fmt$(gross)} highlight />
                <DataRow label="Net/mo"                                  value={fmt$(net)} />
                <DataRow label={isBusiness ? 'Years in business' : 'Years employed'} value={client.yearsEmployed} />
                <DataRow label="Credit score" value={client.creditScore || '—'} />
              </DataCard>
            </div>

            <DataCard title="Banking" icon={TbWallet}>
              <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                <DataRow label="Bank"              value={client.bankName} />
                <DataRow label="Account holder"    value={client.accountHolder} />
                <DataRow label="Account number"    value={client.accountNumber} mono />
                <DataRow label="Statement period"  value={client.statementPeriod} />
                <DataRow label="Avg credit"        value={fmt$(client.averageMonthlyCredit)} highlight />
                <DataRow label="Avg balance"       value={fmt$(client.averageClosingBalance)} highlight />
              </div>
            </DataCard>

            {client.notes && (
              <DataCard title="Internal notes" icon={TbFileText}>
                <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{client.notes}</p>
              </DataCard>
            )}
          </div>

          {/* Right panel — Advisor + Actions */}
          <div className="hidden lg:flex" style={{ width: '30%', maxWidth: 450, flexDirection: 'column', background: '#fff', borderLeft: `1px solid ${C.border}`, overflowY: 'auto' }}>
            <div className="p-5 border-b border-gray-200">
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assigned advisor</p>

              {advisor ? (
                <>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-14 h-14 rounded-full bg-navy text-white flex items-center justify-center text-[16px] font-semibold shrink-0">
                      {advisor.initials ?? initialsOf(advisor.name)}
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{advisor.name}</p>
                      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{advisor.title}</p>
                      <p style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: 'monospace' }}>{advisor.id}</p>
                    </div>
                  </div>

                  {/* Specialty pill */}
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-action text-[11.5px] font-semibold border border-blue-100">
                    <TbUserStar style={{ fontSize: 12 }} />
                    {advisor.specialty}
                  </div>

                  {/* Visual stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <MiniStat label="Experience" value={`${advisor.yearsExperience}y`} icon={TbTrendingUp} />
                    <MiniStat label="Caseload"   value={advisor.clientLoad} icon={TbReportMoney} />
                  </div>

                  {advisor.credentials?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {advisor.credentials.map(c => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}

                  {advisor.languages?.length > 0 && (
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
                      Speaks {advisor.languages.join(' · ')}
                    </p>
                  )}

                  {result?.advisorRationale && (
                    <div className="mt-4 flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-lg px-3 py-2.5">
                      <TbSparkles className="text-blue-action shrink-0 mt-[2px]" style={{ fontSize: 13 }} />
                      <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                        <span className="font-semibold">Why this advisor: </span>{result.advisorRationale}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 mt-3 text-tertiary">
                  <TbLoader2 className="animate-spin" style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12.5 }}>
                    {item.status === 'ready' ? 'No advisor assigned.' : 'Waiting for AI…'}
                  </span>
                </div>
              )}
            </div>

            {/* Officer actions — state-aware */}
            <div className="p-5 space-y-2">
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Officer actions</p>

              {isConfirmed && (
                <div className="mt-2 px-3 py-3 rounded-lg bg-green-50 border border-green-200 flex items-start gap-2.5">
                  <TbCircleCheck className="text-success shrink-0 mt-[1px]" style={{ fontSize: 17 }} />
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.success }}>Engagement confirmed</p>
                    {engagement?.assignment?.confirmedAt && (
                      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                        by {engagement.assignment.confirmedBy ?? '—'} · {fmtTime(engagement.assignment.confirmedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isDeclined && (
                <div className="mt-2 px-3 py-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5">
                  <TbCircleX className="text-error shrink-0 mt-[1px]" style={{ fontSize: 17 }} />
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.critical }}>Engagement declined</p>
                    {engagement?.assignment?.declineReason && (
                      <p style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{engagement.assignment.declineReason}</p>
                    )}
                  </div>
                </div>
              )}

              {!isConfirmed && !isDeclined && (
                <>
                  <button
                    onClick={onConfirm}
                    disabled={!canAct || actionBusy !== null}
                    className="w-full mt-2 px-4 py-2.5 text-[13px] font-semibold text-white bg-success rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {actionBusy === 'confirm'
                      ? <><TbLoader2 className="animate-spin" style={{ fontSize: 15 }} /> Confirming…</>
                      : <><TbCircleCheck style={{ fontSize: 15 }} /> Confirm assignment</>}
                  </button>
                  <button
                    onClick={() => setReassignOpen(true)}
                    disabled={!canAct || actionBusy !== null}
                    className="w-full px-4 py-2.5 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    <TbExchange style={{ fontSize: 14 }} /> Reassign advisor
                  </button>
                  <button
                    onClick={onDecline}
                    disabled={!canAct || actionBusy !== null}
                    className="w-full px-4 py-2.5 text-[13px] font-medium text-error border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                  >
                    {actionBusy === 'decline'
                      ? <><TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Declining…</>
                      : <><TbCircleX style={{ fontSize: 14 }} /> Decline engagement</>}
                  </button>
                </>
              )}

              {actionError && (
                <p className="text-[11.5px] text-error mt-1">{actionError}</p>
              )}
            </div>

            {/* Uploaded docs chips */}
            {client.uploadedDocuments?.length > 0 && (
              <div className="p-5 border-t border-gray-200">
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Uploaded files ({client.uploadedDocuments.length})
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {client.uploadedDocuments.map(d => (
                    <span key={d} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-[11px] text-gray-700 border border-gray-200">
                      <TbFileText style={{ fontSize: 11 }} /> {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ContextChat
        storageKey={`chat:advisory-review:${item.id}`}
        contextLabel={`${client.name ?? 'client'} · ${item.id}`}
        contextData={{ flow: item.flowKey, client, aiReview: result, assignedAdvisor: advisor }}
        systemPrompt={ADVISORY_REVIEW_PROMPT}
        suggestions={[
          'What are this client\'s top 3 financial priorities?',
          'What should I cover in the first meeting?',
          'Biggest red flag I should be aware of?',
          'Which questions should I prepare answers for?',
        ]}
      />

      <ReassignAdvisorModal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        onSubmit={onReassign}
        flowKey={item.flowKey}
        currentAdvisorId={advisor?.id}
        aiPickAdvisorId={result?.recommendedAdvisorId}
      />
    </div>
  )
}

/* ── Metric Card (donut + label) ─────────────────────────────────────── */
const TIMELINE_VISUALS = {
  submitted:  { color: '#6B7280',   bg: '#F3F4F6',  icon: TbClock        },
  analysed:   { color: '#2563EB',   bg: '#EFF6FF',  icon: TbSparkles     },
  proposed:   { color: '#F59E0B',   bg: '#FFFBEB',  icon: TbUserStar     },
  confirmed:  { color: '#16A34A',   bg: '#F0FDF4',  icon: TbCircleCheck  },
  reassigned: { color: '#2563EB',   bg: '#EFF6FF',  icon: TbExchange     },
  declined:   { color: '#DC2626',   bg: '#FEF2F2',  icon: TbCircleX      },
  note:       { color: '#6B7280',   bg: '#F9FAFB',  icon: TbFileText     },
}

const TimelineList = ({ events }) => (
  <div className="space-y-3 relative pl-1">
    <div className="absolute left-[14px] top-2 bottom-2 w-px bg-gray-200" />
    {events.map((e, i) => {
      const v = TIMELINE_VISUALS[e.eventType] ?? TIMELINE_VISUALS.note
      const Icon = v.icon
      return (
        <div key={i} className="relative flex items-start gap-3 pl-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative z-10"
            style={{ background: v.bg, border: `1px solid ${v.color}30` }}>
            <Icon style={{ fontSize: 13, color: v.color }} />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{e.description}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              {fmtTime(e.occurredAt)}{e.actor ? ` · ${e.actor}` : ''}
            </p>
          </div>
        </div>
      )
    })}
  </div>
)

const MetricCard = ({ label, value, pct, color, sub }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <RingChart pct={pct} color={color} size={84} stroke={8}>
      <span style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
    </RingChart>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{label}</p>
      {sub && <p style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{sub}</p>}
    </div>
  </div>
)

/* ── Document tile ───────────────────────────────────────────────────── */
const DocTile = ({ doc }) => {
  const cfg =
    doc.status === 'present'      ? { color: C.success,  bg: '#F0FDF4',  border: '#86EFAC', Icon: TbCheck,         label: 'Present' } :
    doc.status === 'missing'      ? { color: C.critical, bg: '#FEF2F2',  border: '#FCA5A5', Icon: TbCircleX,       label: 'Missing' } :
    doc.status === 'low_quality'  ? { color: C.warning,  bg: '#FFFBEB',  border: '#FCD34D', Icon: TbAlertTriangle, label: 'Low quality' } :
                                    { color: C.warning,  bg: '#FFFBEB',  border: '#FCD34D', Icon: TbAlertTriangle, label: 'Inconsistent' }

  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: 12 }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <TbFileText className="shrink-0" style={{ fontSize: 14, color: cfg.color }} />
          <p style={{ fontSize: 12.5, fontWeight: 600, color: C.text }} className="truncate">{doc.name}</p>
        </div>
        <cfg.Icon className="shrink-0" style={{ fontSize: 14, color: cfg.color }} />
      </div>
      <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em', background: '#fff', padding: '2px 6px', borderRadius: 4 }}>
        {cfg.label}
      </span>
      {doc.note && (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{doc.note}</p>
      )}
    </div>
  )
}

/* ── Strengths/Issues panel ──────────────────────────────────────────── */
const FactorPanel = ({ title, count, items, icon: Icon, accent, accentBg, accentBorder }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon style={{ fontSize: 15, color: accent }} />
        <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</p>
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: accentBg, border: `1px solid ${accentBorder}`, padding: '1px 8px', borderRadius: 20 }}>
        {count}
      </span>
    </div>
    <div className="space-y-2">
      {items.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent, marginTop: 7, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{s}</span>
        </div>
      ))}
    </div>
  </div>
)

/* ── Mini stat (advisor side panel) ──────────────────────────────────── */
const MiniStat = ({ label, value, icon: Icon }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
    <div className="flex items-center gap-1.5 text-tertiary">
      <Icon style={{ fontSize: 11 }} />
      <span className="text-[9.5px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 2 }}>{value}</p>
  </div>
)

/* ── Data card + row (used for compact identity/employment/banking sections) */
const DataCard = ({ title, icon: Icon, children }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
      {Icon && <Icon className="text-secondary" style={{ fontSize: 14 }} />}
      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
    </div>
    {children}
  </div>
)

const DataRow = ({ label, value, mono, highlight, wrap }) => (
  <div className={`flex items-center justify-between py-1.5 gap-3 ${wrap ? 'items-start' : ''}`}>
    <span style={{ fontSize: 11.5, color: C.muted, flexShrink: 0 }}>{label}</span>
    <span style={{
      fontSize: 13,
      fontWeight: highlight ? 700 : 500,
      color: highlight ? C.primary : C.text,
      fontFamily: mono ? 'monospace' : 'inherit',
      textAlign: 'right',
      wordBreak: 'break-word',
    }}>
      {value ?? '—'}
    </span>
  </div>
)

export default AdvisoryReviewPage
