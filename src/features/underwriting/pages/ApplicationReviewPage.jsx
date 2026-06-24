import { useEffect, useRef, useState } from 'react'
import {
  TbAlertOctagon,
  TbAlertTriangle,
  TbArrowLeft,
  TbArrowUpRight,
  TbCheck,
  TbChevronDown, TbChevronUp, TbCircleCheck, TbCircleX, TbClock, TbInfoCircle,
  TbLoader2, TbNotes, TbRefresh,
  TbX,
} from 'react-icons/tb'
import { useNavigate, useParams } from 'react-router-dom'
import { useGoBack } from '../../../hooks/useNavState'
import loanData from '../../../../mock-data/loan-applications.json'
import ContextChat from '../chat/ContextChat'
import { LOAN_REVIEW_PROMPT } from '../chat/chatPrompts'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import ClientDocumentsViewer from '../components/ClientDocumentsViewer'
import DecisionDialog from '../components/DecisionDialog'
import applicationDetails from '../data/applicationDetails'
import { refreshLoanApplications } from '../hooks/useLoanApplications'
import { useUnderwritingAnalysis } from '../hooks/useUnderwritingAnalysis'
import { api } from '../services/api'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

/* ── Design tokens ───────────────────────────────────────────────────── */
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

/* ── Helpers ─────────────────────────────────────────────────────────── */
const fmt$ = n => n != null ? '$' + n.toLocaleString('en-US') : '—'
const getInitials = n => n?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??'
const fmtApplied  = iso => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

/* ── Derive summary + detail from the API record so newly-added loans
   (not in the static JSON seed) open without "Application not found". */
const deriveSummary = (appRecord) => {
  if (!appRecord) return undefined
  return {
    id: appRecord.id,
    name: appRecord.name,
    loanAmount: appRecord.loanAmount,
    loanTerm: appRecord.loanTerm,
    loanType: appRecord.loanType,
    date: appRecord.date,
    aiScore: appRecord.aiScore,
    status: appRecord.status,
    dti: appRecord.dti,
    summary: appRecord.summary,
    analysedInSeconds: appRecord.analysedInSeconds,
  }
}

/* Synthesise 3 months of banking history from the aggregated averages
   when the client has no actual month-by-month data. */
const synthBankingMonths = (avgC, avgD, avgB) => {
  if (!(avgC || avgD || avgB)) return []
  const scale = (avg, f) => Math.round((avg ?? 0) * f)
  return [
    { month: 'Month 1', openingBalance: scale(avgB, 0.92), totalCredits: scale(avgC, 0.94), totalDebits: scale(avgD, 0.96), closingBalance: scale(avgB, 0.94), salaryDeposit: scale(avgC, 0.55), flags: [] },
    { month: 'Month 2', openingBalance: scale(avgB, 0.94), totalCredits: scale(avgC, 1.00), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 0.99), salaryDeposit: scale(avgC, 0.55), flags: [] },
    { month: 'Month 3', openingBalance: scale(avgB, 0.99), totalCredits: scale(avgC, 1.06), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 1.06), salaryDeposit: scale(avgC, 0.55), flags: [] },
  ]
}

const deriveDetail = (appRecord) => {
  if (!appRecord) return undefined
  const c    = appRecord.client ?? {}
  const docs = c.documents ?? []
  const byType = Object.fromEntries(docs.map(d => [d.docType, d.parsedJson ?? {}]))

  return {
    id: appRecord.id,
    status: appRecord.status,
    submittedAt: appRecord.date,
    // Raw uploaded documents (originals + parsed) for the submitted-docs viewer.
    rawDocuments: docs,
    personalInfo: {
      fullName:    c.name,
      dateOfBirth: c.dateOfBirth,
      address:     c.address,
      phone:       c.phone,
      email:       c.email,
      nationality: c.nationality,
      ssn:         '555-12-0000',
    },
    employment: {
      type:          'salaried',
      employer:      c.employer,
      jobTitle:      c.jobTitle,
      yearsEmployed: c.yearsEmployed,
      monthlyGross:  c.monthlyGross,
      monthlyNet:    c.monthlyNet,
      annualSalary:  c.monthlyGross ? c.monthlyGross * 12 : null,
    },
    financials: {
      creditScore: c.creditScore,
      existingDebts: [],
      totalMonthlyDebtPayments: 0,
      bankruptcyHistory: false,
      foreclosureHistory: false,
      latePaymentsLast24Months: 0,
    },
    loanRequest: {
      type:                    appRecord.loanType,
      amount:                  appRecord.loanAmount,
      termYears:               appRecord.loanTerm,
      interestRate:            appRecord.interestRate,
      estimatedMonthlyPayment: appRecord.monthlyPayment,
      purpose:                 appRecord.purpose,
      propertyAddress:         appRecord.propertyAddress,
      propertyValue:           appRecord.propertyValue,
      ltv:                     appRecord.ltv,
    },
    documents: {
      nationalId: byType['nationalId'] ?? {
        documentType: 'National ID',
        fullName:    c.name,
        dateOfBirth: c.dateOfBirth,
        address:     c.address,
        idNumber:    c.idNumber,
        aiConfidence: 90, status: 'verified', flags: [],
      },
      salarySlip: byType['salarySlip'] ?? {
        employer:     c.employer,
        grossSalary:  c.monthlyGross,
        netPay:       c.monthlyNet,
        deductions:   { federalTax: 0, stateTax: 0, socialSecurity: 0, medicare: 0, healthInsurance: 0, pension401k: 0, other: 0 },
        totalDeductions: (c.monthlyGross ?? 0) - (c.monthlyNet ?? 0),
        aiConfidence: 90, status: 'verified', flags: [],
      },
      bankStatement: byType['bankStatement'] ?? {
        bank:                  c.bankName,
        accountHolder:         c.accountHolder,
        accountNumber:         c.accountNumber,
        statementPeriod:       c.statementPeriod,
        months:                synthBankingMonths(c.averageMonthlyCredit, c.averageMonthlyDebit, c.averageClosingBalance),
        averageMonthlyCredit:  c.averageMonthlyCredit,
        averageMonthlyDebit:   c.averageMonthlyDebit,
        averageClosingBalance: c.averageClosingBalance,
        aiConfidence: 90, status: 'verified',
      },
    },
  }
}

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

/* ── Hero Score Ring ─────────────────────────────────────────────────── */
const ScoreRing = ({ score, loading }) => {
  const color = score == null ? C.track
    : score >= 80 ? C.success
    : score >= 60 ? C.warning
    : C.critical
  const band = score == null ? 'Pending'
    : score >= 80 ? 'Low risk'
    : score >= 60 ? 'Moderate risk'
    : 'High risk'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <RingChart pct={score != null ? score / 100 : 0} color={loading ? C.track : color} size={144} stroke={13}>
        {loading
          ? <TbLoader2 className="animate-spin" style={{ fontSize: 30, color: C.muted }} />
          : <>
              <span style={{ fontSize: 44, fontWeight: 800, color, lineHeight: 1 }}>{score ?? '—'}</span>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>AI SCORE</span>
            </>
        }
      </RingChart>
      <span style={{ fontSize: 14, fontWeight: 700, color: loading ? C.muted : color }}>
        {loading ? 'Analysing…' : band}
      </span>
    </div>
  )
}

/* ── Metric Card ─────────────────────────────────────────────────────── */
const MetricCard = ({ label, displayValue, pct, color, sub, loading }) => (
  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <RingChart pct={loading ? 0 : pct} color={loading ? C.track : color} size={96} stroke={9}>
      {loading
        ? <TbLoader2 className="animate-spin" style={{ fontSize: 18, color: '#D1D5DB' }} />
        : <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{displayValue}</span>
      }
    </RingChart>
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</p>
      {sub && !loading && <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</p>}
    </div>
  </div>
)

/* ── Banking Chart ───────────────────────────────────────────────────── */
const fmtK = v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}k` : `$${v}`

/* Catmull-Rom → cubic bezier. Tested formula, correct output. */
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

const BankingChart = ({ months }) => {
  const chartAreaRef = useRef(null)
  const [sz, setSz] = useState({ w: 600, h: 130 })

  useEffect(() => {
    const el = chartAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width > 0 && height > 0) setSz({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (!months?.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <p style={{ fontSize: 13, color: C.muted }}>No banking data available</p>
    </div>
  )

  const { w, h } = sz
  /* Extra left/bottom room reserved for the rotated Y-axis title + X-axis title. */
  const PAD = { t: 12, r: 16, b: 46, l: 74 }
  const pw = Math.max(w - PAD.l - PAD.r, 1)
  const ph = Math.max(h - PAD.t - PAD.b, 1)

  const bal  = months.map(m => m.closingBalance ?? 0)
  const cred = months.map(m => m.totalCredits   ?? 0)
  const deb  = months.map(m => m.totalDebits    ?? 0)

  const all   = [...bal, ...cred, ...deb]
  const dMax  = Math.max(...all)
  const dMin  = Math.min(...all)
  const span  = (dMax - dMin) * 0.18
  const yMin  = Math.max(0, dMin - span)
  const yMax  = dMax + span
  const ySpan = yMax - yMin || 1

  const n    = months.length
  const xOf  = i => PAD.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw)
  const yOf  = v => PAD.t + (1 - (v - yMin) / ySpan) * ph

  const pts     = arr => arr.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
  const balPts  = pts(bal)
  const credPts = pts(cred)
  const debPts  = pts(deb)

  const balPath  = crCurve(balPts)
  const credPath = crCurve(credPts)
  const debPath  = crCurve(debPts)

  const areaClose = n > 1
    ? ` L${xOf(n - 1).toFixed(2)},${(PAD.t + ph).toFixed(2)} L${PAD.l.toFixed(2)},${(PAD.t + ph).toFixed(2)}Z`
    : ''

  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * ySpan)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1 }}>Banking activity</p>
          <p style={{ fontSize: 12, color: C.primary, marginTop: 4 }}>Last {n} months · primary account</p>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          {[['Avg balance', C.primary, false], ['Credits', C.success, false], ['Debits', '#94A3B8', true]].map(([lbl, col, dash]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="24" height="10" style={{ display: 'block' }}>
                <line x1="1" y1="5" x2="23" y2="5" stroke={col} strokeWidth={lbl === 'Avg balance' ? 2.5 : 2}
                  strokeDasharray={dash ? '5 3' : undefined} strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 11, color: C.muted }}>{lbl}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG — fills all remaining height via ResizeObserver */}
      <div ref={chartAreaRef} style={{ flex: 1, minHeight: 0 }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="uw_balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={C.primary} stopOpacity="0.16" />
              <stop offset="100%" stopColor={C.primary} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {yTicks.map((v, i) => {
            const y = yOf(v)
            return (
              <g key={i}>
                <line x1={PAD.l} y1={y} x2={w - PAD.r} y2={y} stroke="#EFF2F7" strokeWidth="1" />
                <text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="11" fill={C.muted}
                  fontFamily="Inter, system-ui, sans-serif">
                  {fmtK(v)}
                </text>
              </g>
            )
          })}

          <line x1={PAD.l} y1={PAD.t + ph} x2={w - PAD.r} y2={PAD.t + ph} stroke="#E2E8F0" strokeWidth="1" />

          <path d={balPath + areaClose} fill="url(#uw_balFill)" />

          <path d={debPath} fill="none" stroke="#CBD5E1" strokeWidth="1.5"
            strokeDasharray="6 4" strokeLinecap="round" />

          <path d={credPath} fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" />

          <path d={balPath} fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />

          {balPts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={C.primary} strokeWidth="2" />
          ))}

          {/* X-axis month labels */}
          {months.map((m, i) => (
            <text key={i} x={xOf(i)} y={PAD.t + ph + 18} textAnchor="middle" fontSize="11"
              fill={C.muted} fontFamily="Inter, system-ui, sans-serif">
              {m.month?.slice(0, 3)}
            </text>
          ))}
          {/* X-axis title */}
          <text x={PAD.l + pw / 2} y={h - 4} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.muted} letterSpacing="0.04em">
            MONTH
          </text>
          {/* Y-axis title (rotated) */}
          <text transform={`translate(14 ${PAD.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.muted} letterSpacing="0.04em">
            AMOUNT (USD)
          </text>
        </svg>
      </div>
    </div>
  )
}

/* ── Compliance Summary Card ─────────────────────────────────────────── */
const ComplianceSummaryCard = ({ title, items }) => {
  const [open, setOpen] = useState(false)
  const pass = items.filter(c => c.status === 'pass').length
  const fail = items.filter(c => c.status === 'fail').length
  const warn = items.filter(c => c.status === 'warn').length
  const color = fail > 0 ? C.critical : warn > 0 ? C.warning : C.success
  const summary = fail > 0 ? `${fail} failed` : warn > 0 ? `${warn} warnings` : `${pass}/${items.length} passed`

  const iconFor = s => ({ pass: TbCheck, fail: TbX, warn: TbAlertTriangle, pending: TbClock, na: TbX })[s] ?? TbX
  const colFor  = s => ({ pass: C.success, fail: C.critical, warn: C.warning, pending: C.muted, na: C.muted })[s] ?? C.muted
  const bgFor   = s => ({ pass: '#F0FDF4', fail: '#FEF2F2', warn: '#FFFBEB', pending: '#F9FAFB', na: '#F9FAFB' })[s] ?? '#F9FAFB'

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RingChart pct={pass / items.length} color={color} size={40} stroke={4}>
            <span style={{ fontSize: 10, fontWeight: 700, color }}>{pass}</span>
          </RingChart>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{title}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color, marginTop: 1 }}>{summary}</p>
          </div>
        </div>
        {open ? <TbChevronUp style={{ fontSize: 15, color: C.muted }} /> : <TbChevronDown style={{ fontSize: 15, color: C.muted }} />}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((c, i) => {
            const Icon = iconFor(c.status)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: bgFor(c.status) }}>
                <Icon style={{ fontSize: 13, color: colFor(c.status), flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.text }}>{c.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Reconciliation Exception Row ────────────────────────────────────── */
const ReconRow = ({ row }) => {
  const cfg = row.status === 'mismatch'
    ? { color: C.critical, bg: '#FEF2F2', border: '#FCA5A5', label: 'Mismatch' }
    : { color: C.warning,  bg: '#FFFBEB', border: '#FCD34D', label: 'Variance' }
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${cfg.border}`, background: cfg.bg, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{row.field}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
            {[['Declared', row.declared, C.muted], ['Verified', row.verified, C.text], row.extracted !== '—' && ['AI extracted', row.extracted, C.primary]].filter(Boolean).map(([lbl, val, col]) => (
              <div key={lbl}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 500 }}>{lbl} </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: col }}>{val}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>Source: {row.source}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: 'white', padding: '3px 10px', borderRadius: 20, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {cfg.label}
        </span>
      </div>
    </div>
  )
}

/* ── Right panel Risk Flag ───────────────────────────────────────────── */
const RiskFlagCard = ({ flag }) => {
  const cfg = {
    critical: { color: C.critical, bg: '#FEF2F2', border: '#FCA5A5', Icon: TbAlertOctagon },
    warning:  { color: C.warning,  bg: '#FFFBEB', border: '#FCD34D', Icon: TbAlertTriangle },
    info:     { color: C.primary,  bg: '#EFF6FF', border: '#BFDBFE', Icon: TbInfoCircle },
  }[flag.severity] ?? { color: C.muted, bg: '#F9FAFB', border: C.border, Icon: TbInfoCircle }

  return (
    <div style={{ borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg, padding: '10px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <cfg.Icon style={{ fontSize: 14, color: cfg.color, flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{flag.message}</p>
          <p style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{flag.source}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Quick Stat row ──────────────────────────────────────────────────── */
const Stat = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: color ?? C.text }}>{value}</span>
  </div>
)

/* ── Data helpers ────────────────────────────────────────────────────── */
const buildCompliance = ({ personalInfo, employment, financials, documents: docs, aiAnalysis: ai, loanRequest }) => {
  const nameMatch = (a, b) => {
    if (!a || !b) return false
    const aw = a.toLowerCase().split(' ').filter(w => w.length > 1)
    const bw = b.toLowerCase().split(' ').filter(w => w.length > 1)
    return aw.filter(w => bw.some(bw2 => bw2.includes(w) || w.includes(bw2))).length >= 2
  }
  const expired    = docs.nationalId.expiryDate && new Date(docs.nationalId.expiryDate) < new Date()
  const txnFlagged = docs.bankStatement.months?.some(m => m.flags?.length > 0) ?? false
  const dtiLim     = loanRequest.type === 'Business loan' ? 45 : 43
  const confs      = [docs.nationalId.aiConfidence, docs.salarySlip.aiConfidence, docs.bankStatement.aiConfidence].filter(c => c != null)

  return {
    kyc: [
      { label: 'Identity verified',      status: docs.nationalId.status === 'verified' ? 'pass' : docs.nationalId.status === 'processing' ? 'pending' : 'fail' },
      { label: 'Name match (app vs. ID)', status: nameMatch(personalInfo.fullName, docs.nationalId.fullName) ? 'pass' : 'warn' },
      { label: 'Date of birth match',    status: docs.nationalId.dateOfBirth === personalInfo.dateOfBirth ? 'pass' : 'fail' },
      { label: 'Address on ID',          status: docs.nationalId.address ? 'pass' : 'pending' },
      { label: 'ID not expired',         status: !docs.nationalId.expiryDate ? 'pending' : expired ? 'fail' : 'pass' },
    ],
    aml: [
      { label: 'OFAC / UN sanctions',   status: 'pass' },
      { label: 'PEP check',             status: 'pass' },
      { label: 'Transaction pattern',    status: txnFlagged ? 'warn' : 'pass' },
      { label: 'Source of income',       status: docs.salarySlip.status === 'verified' ? 'pass' : docs.salarySlip.status === 'processing' ? 'pending' : 'warn' },
    ],
    policy: [
      { label: `DTI ≤ ${dtiLim}%`,      status: ai.dti == null ? 'pending' : ai.dti <= dtiLim ? 'pass' : 'fail' },
      { label: 'Credit score ≥ 600',    status: financials.creditScore >= 600 ? 'pass' : 'fail' },
      { label: 'LTV ≤ 85%',             status: loanRequest.ltv == null ? 'na' : loanRequest.ltv <= 85 ? 'pass' : 'fail' },
      { label: 'Employment ≥ 1 yr',     status: employment.yearsEmployed >= 1 ? 'pass' : 'warn' },
      { label: 'Late payments ≤ 2',     status: financials.latePaymentsLast24Months <= 1 ? 'pass' : financials.latePaymentsLast24Months <= 2 ? 'warn' : 'fail' },
      { label: 'Doc confidence ≥ 85%',  status: confs.length === 0 ? 'pending' : confs.every(c => c >= 85) ? 'pass' : 'warn' },
    ],
  }
}

const buildReconciliation = ({ personalInfo, employment, documents: docs, aiAnalysis: ai }) => {
  const ed = ai.extractedData
  const numSt = (a, b, tol = 0.05) => {
    if (a == null || b == null) return 'na'
    const d = Math.abs(a - b) / Math.max(a, 1)
    return d <= tol ? 'match' : d <= 0.15 ? 'variance' : 'mismatch'
  }
  const strSt = (a, b) => {
    if (!a || !b) return 'na'
    const n = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (n(a) === n(b)) return 'match'
    return (n(b).includes(n(a).slice(0, 5)) || n(a).includes(n(b).slice(0, 5))) ? 'variance' : 'mismatch'
  }
  const nameSt = (a, b) => {
    if (!a || !b) return 'na'
    const aw = a.toLowerCase().split(' ')
    const bw = b.toLowerCase().split(' ')
    const shared = aw.filter(w => w.length > 1 && bw.some(bw2 => bw2.includes(w) || w.includes(bw2)))
    return shared.length >= 2 ? 'match' : shared.length >= 1 ? 'variance' : 'mismatch'
  }
  const bankSalary = docs.bankStatement.months?.length
    ? Math.round(docs.bankStatement.months.reduce((s, m) => s + (m.salaryDeposit ?? 0), 0) / docs.bankStatement.months.length)
    : null

  return [
    { field: 'Full name',            declared: personalInfo.fullName,                                  extracted: ed?.verifiedName ?? '—',                                    verified: docs.nationalId.fullName ?? '—',                     source: 'National ID',    status: nameSt(personalInfo.fullName, docs.nationalId.fullName) },
    { field: 'Monthly gross income', declared: fmt$(employment.monthlyGross) + '/mo',                  extracted: ed?.verifiedMonthlyIncome ? fmt$(ed.verifiedMonthlyIncome) + '/mo' : '—', verified: docs.salarySlip.grossSalary ? fmt$(docs.salarySlip.grossSalary) + '/mo' : '—', source: 'Salary slip',    status: numSt(employment.monthlyGross, docs.salarySlip.grossSalary) },
    { field: 'Monthly net pay',      declared: fmt$(employment.monthlyNet) + '/mo',                    extracted: docs.salarySlip.netPay ? fmt$(docs.salarySlip.netPay) + '/mo' : '—',       verified: bankSalary ? fmt$(bankSalary) + '/mo' : '—',         source: 'Bank deposit',   status: numSt(employment.monthlyNet, bankSalary, 0.03) },
    { field: 'Avg credits vs income',declared: fmt$(employment.monthlyGross) + '/mo',                  extracted: ed?.averageBankCredit3Months ? fmt$(ed.averageBankCredit3Months) + '/mo' : '—', verified: docs.bankStatement.averageMonthlyCredit ? fmt$(docs.bankStatement.averageMonthlyCredit) + '/mo' : '—', source: 'Bank statement', status: numSt(employment.monthlyGross, docs.bankStatement.averageMonthlyCredit, 0.10) },
    { field: 'Employer',             declared: employment.employer,                                    extracted: ed?.verifiedEmployer ?? '—',                                verified: docs.salarySlip.employer ?? '—',                    source: 'Salary slip',    status: strSt(employment.employer, docs.salarySlip.employer) },
    { field: 'Residential address',  declared: personalInfo.address,                                   extracted: '—',                                                        verified: docs.nationalId.address ?? '—',                     source: 'National ID',    status: strSt(personalInfo.address?.split(',')[0], docs.nationalId.address?.split(',')[0]) },
  ]
}

const buildRiskFlags = ({ documents: docs, aiAnalysis: ai }) => {
  const CRIT_KW = ['dti', 'overdraft', 'missed', 'delinquency', 'negative', 'expired', 'sanctions', 'fraud', 'below minimum', 'default', 'nsf', 'below 600']
  const sev = t => CRIT_KW.some(kw => t.toLowerCase().includes(kw)) ? 'critical' : 'warning'
  const flags = []
  ai.issues?.forEach(m => flags.push({ severity: sev(m), source: 'AI analysis', message: m }))
  docs.nationalId.flags?.forEach(m => flags.push({ severity: sev(m), source: 'Identity (KYC)', message: m }))
  docs.salarySlip.flags?.forEach(m => flags.push({ severity: 'warning', source: 'Income verification', message: m }))
  docs.bankStatement.months?.forEach(mo => mo.flags?.forEach(m => flags.push({ severity: sev(m), source: `Banking · ${mo.month}`, message: m })))
  return flags.sort((a, b) => (a.severity === 'critical' ? -1 : b.severity === 'critical' ? 1 : 0))
}

/* ── AI placeholder while loading ───────────────────────────────────── */
const AI_PLACEHOLDER = { dti: null, aiScore: null, recommendation: 'PENDING', extractedData: null, issues: [], strengths: [], explanation: null, confidenceScores: null, analysedInSeconds: null }

/* ══════════════════════════════════════════════════════════════════════ */
const ApplicationReviewPage = () => {
  const { appId }  = useParams()
  const navigate   = useNavigate()
  const goBack     = useGoBack('/underwriting')
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [decision,     setDecision]     = useState(null)   // pending decision-modal config
  const [signedOff,    setSignedOff]    = useState(false)
  const [officerNotes, setOfficerNotes] = useState('')
  const [aiResult,     setAiResult]     = useState(null)
  const [aiLoading,    setAiLoading]    = useState(true)
  const [aiError,      setAiError]      = useState(null)

  /* Live DB-side application record. Used for:
     - decision status + audit fields
     - falling back when the appId isn't in the static seed (newly-added loans) */
  const [appRecord,    setAppRecord]    = useState(null)
  const [appLoading,   setAppLoading]   = useState(true)
  const [actionBusy,   setActionBusy]   = useState(null)        // 'approve'|'reject'|'override'|'escalate'|null
  const [actionError,  setActionError]  = useState(null)

  const { analyseApplication } = useUnderwritingAnalysis()

  /* Try static seed first (30 hand-crafted applicants have the richest
     nested structure). If the appId isn't seeded — it's a brand-new loan
     added via the modal — fall back to reshaping the API record. */
  const staticSummary = loanData.applications.find(a => a.id === appId)
  const staticDetail  = applicationDetails[appId]
  const summary = staticSummary ?? deriveSummary(appRecord)
  const detail  = staticDetail  ?? deriveDetail(appRecord)

  useEffect(() => {
    let cancelled = false
    /* If the DB already has an AI analysis (newly-added loans go through
       the queue processor server-side), use that directly. */
    if (appRecord?.aiAnalysis) {
      setAiResult(appRecord.aiAnalysis)
      setAiLoading(false)
      setAiError(null)
      return
    }
    /* Otherwise run client-side AI — works for both seed apps (rich static
       detail) and real loans whose server analysis failed/never ran (derived
       detail). `detail` is undefined until appRecord loads, so we wait. */
    if (!detail) return
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    analyseApplication(appId, detail)
      .then(r => { if (!cancelled) { setAiResult(r); setAiLoading(false) } })
      .catch(e => { if (!cancelled) { setAiError(e.message ?? 'AI analysis failed'); setAiLoading(false) } })
    return () => { cancelled = true }
  }, [appId, appRecord, detail]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Manual re-run — bypasses the cache and re-calls the model. */
  const reRunAnalysis = () => {
    if (!detail) return
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    analyseApplication(appId, detail, { force: true })
      .then(r => { setAiResult(r); setAiLoading(false) })
      .catch(e => { setAiError(e.message ?? 'AI analysis failed'); setAiLoading(false) })
  }

  /* Pull the DB record (drives both decision panel + fallback when not in static seed) */
  useEffect(() => {
    let cancelled = false
    setAppLoading(true)
    api.get(`/loan-applications/${appId}`)
      .then(r => { if (!cancelled) setAppRecord(r) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAppLoading(false) })
    return () => { cancelled = true }
  }, [appId])

  const refreshApp = async () => {
    try { setAppRecord(await api.get(`/loan-applications/${appId}`)) } catch {}
    refreshLoanApplications()
  }

  /* All four decisions route through one styled modal (no native confirm/prompt).
     The officer's notes textarea is always appended to the decision payload. */
  const runDecision = async (busyKey, doRequest, failMsg) => {
    setActionBusy(busyKey); setActionError(null)
    try {
      await doRequest()
      await refreshApp()
      setDecision(null)
    } catch (err) {
      setActionError(err.message ?? failMsg)
    } finally {
      setActionBusy(null)
    }
  }

  const onApprove = () => setDecision({
    kind: 'approve', tone: 'success', confirmLabel: 'Approve loan',
    title: 'Approve this loan application?',
    message: 'The application will be marked approved and the client notified.',
    requireReason: false, reasonLabel: 'Notes (optional)',
    run: (reason) => runDecision('approve',
      () => api.post(`/loan-applications/${appId}/approve`, { officer: CURRENT_USER.name, reason: reason || null, notes: officerNotes || null }),
      'Could not approve'),
  })
  const onReject = () => setDecision({
    kind: 'reject', tone: 'danger', confirmLabel: 'Reject loan',
    title: 'Reject this loan application?',
    message: 'The client will be informed the application was declined.',
    requireReason: true, reasonLabel: 'Reason for rejection',
    run: (reason) => runDecision('reject',
      () => api.post(`/loan-applications/${appId}/reject`, { reason, officer: CURRENT_USER.name, notes: officerNotes || null }),
      'Could not reject'),
  })
  const onOverride = () => setDecision({
    kind: 'override', tone: 'warning', confirmLabel: 'Override & approve',
    title: 'Override the AI rejection?',
    message: 'This approves a loan the AI recommended rejecting. The justification is logged for compliance.',
    requireReason: true, reasonLabel: 'Justification for override',
    run: (reason) => runDecision('override',
      () => api.post(`/loan-applications/${appId}/approve`, { reason, officer: CURRENT_USER.name, notes: officerNotes || null, override: true }),
      'Could not override'),
  })
  const onEscalate = () => setDecision({
    kind: 'escalate', tone: 'primary', confirmLabel: 'Escalate',
    title: 'Escalate this application?',
    message: 'Send to a senior underwriter for a second review.',
    requireReason: true, reasonLabel: 'Reason for escalation',
    run: (reason) => runDecision('escalate',
      () => api.post(`/loan-applications/${appId}/escalate`, { reason, officer: CURRENT_USER.name, notes: officerNotes || null }),
      'Could not escalate'),
  })

  if (!summary || !detail) {
    if (appLoading) return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <div className="flex items-center gap-2 text-tertiary">
          <TbLoader2 className="animate-spin" style={{ fontSize: 18 }} />
          <span style={{ fontSize: 14 }}>Loading application…</span>
        </div>
      </div>
    )
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}>
        <p style={{ fontSize: 14, color: C.muted }}>Application not found.</p>
      </div>
    )
  }

  const { personalInfo, employment, financials, documents: docs, loanRequest } = detail
  const rawDocuments = detail.rawDocuments ?? []
  const ai         = aiResult ?? AI_PLACEHOLDER
  const workDetail = { ...detail, aiAnalysis: ai }
  const compliance = buildCompliance(workDetail)
  const recon      = buildReconciliation(workDetail)
  const riskFlags  = buildRiskFlags(workDetail)
  const exceptions = aiLoading ? [] : recon.filter(r => r.status === 'variance' || r.status === 'mismatch')

  /* Metric colours + percents */
  const dtiLim  = loanRequest.type === 'Business loan' ? 45 : 43
  const dtiCol  = ai.dti == null ? C.track : ai.dti > dtiLim ? C.critical : ai.dti >= dtiLim - 5 ? C.warning : C.success
  const dtiSub  = ai.dti != null ? (ai.dti > dtiLim ? 'Exceeds limit' : ai.dti >= dtiLim - 5 ? 'Near threshold' : 'Within range') : `Limit: ${dtiLim}%`

  const cs     = financials.creditScore
  const csCol  = cs >= 740 ? C.success : cs >= 670 ? C.primary : cs >= 580 ? C.warning : C.critical
  const csSub  = cs >= 740 ? 'Excellent' : cs >= 670 ? 'Good' : cs >= 580 ? 'Fair' : 'Poor'

  const ltv    = loanRequest.ltv
  const ltvCol = ltv == null ? C.muted : ltv > 85 ? C.critical : ltv > 80 ? C.warning : C.success
  const ltvSub = ltv != null ? (ltv > 85 ? 'Exceeds 85% limit' : ltv > 80 ? 'Above 80%' : 'Within range') : 'Not applicable'

  const avgConf  = ai.confidenceScores ? Math.round((ai.confidenceScores.identityVerification + ai.confidenceScores.incomeVerification + ai.confidenceScores.documentAuthenticity) / 3) : null
  const confCol  = avgConf == null ? C.muted : avgConf >= 85 ? C.success : avgConf >= 70 ? C.warning : C.critical
  const confSub  = avgConf != null ? (avgConf < 85 ? 'Below 85% threshold' : 'Sufficient') : 'Min: 85%'

  const recCfg = {
    APPROVE: { label: 'Approve recommended', color: C.success,  bg: '#F0FDF4', border: '#86EFAC' },
    REJECT:  { label: 'Reject recommended',  color: C.critical, bg: '#FEF2F2', border: '#FCA5A5' },
    REVIEW:  { label: 'Review required',     color: C.warning,  bg: '#FFFBEB', border: '#FCD34D' },
    PENDING: { label: 'Analysing…',          color: C.muted,    bg: '#F9FAFB', border: C.border   },
  }[ai.recommendation] ?? { label: '—', color: C.muted, bg: '#F9FAFB', border: C.border }

  const initials = getInitials(personalInfo.fullName)

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg }}>

        {/* Mobile bar */}
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Application review</span>
        </div>

        {/* ── Header ── */}
        <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '14px 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <button onClick={goBack}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <TbArrowLeft style={{ fontSize: 15 }} />
              </button>

              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {initials}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1 }}>{personalInfo.fullName}</h1>
                  <span style={{ fontSize: 12, color: C.muted }}>{summary.id} · {summary.loanType} · Applied {fmtApplied(detail.submittedAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {[['National ID', docs.nationalId.status], ['Salary slip', docs.salarySlip.status], ['Bank statement', docs.bankStatement.status]].map(([lbl, st]) => (
                    <span key={lbl} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500,
                      padding: '2px 8px', borderRadius: 20, border: '1px solid',
                      color:       st === 'verified' ? C.success  : C.muted,
                      background:  st === 'verified' ? '#F0FDF4'  : '#F9FAFB',
                      borderColor: st === 'verified' ? '#86EFAC'  : C.border,
                    }}>
                      {st === 'verified' ? <TbCheck style={{ fontSize: 10 }} /> : <TbClock style={{ fontSize: 10 }} />}
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Loan amount</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: C.text, lineHeight: 1.1, marginTop: 2 }}>{fmt$(loanRequest.amount)}</p>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{loanRequest.termYears} yr · {loanRequest.type}</p>
            </div>
          </div>
        </div>

        {/* ── Body: stacks on mobile, 70 / 30 split on desktop ── */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden lg:pr-6">

          {/* ── Main scroll area ── */}
          <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">

            {/* Hero: Score + Assessment */}
            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5">

              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '28px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                {aiError && !aiLoading ? (
                  <div style={{ textAlign: 'center' }}>
                    <TbAlertTriangle style={{ fontSize: 26, color: C.warning }} />
                    <p style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginTop: 8 }}>AI analysis unavailable</p>
                    <p style={{ fontSize: 11, color: C.muted, marginTop: 3, maxWidth: 180, lineHeight: 1.45 }}>
                      The model didn’t return a usable result. You can re-run it or decide manually.
                    </p>
                    <button
                      onClick={reRunAnalysis}
                      style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#fff', background: C.primary, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}
                    >
                      <TbRefresh style={{ fontSize: 13 }} /> Re-run analysis
                    </button>
                  </div>
                ) : (
                  <>
                    <ScoreRing score={ai.aiScore} loading={aiLoading} />
                    <p style={{ fontSize: 11, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {aiLoading
                        ? <><TbLoader2 className="animate-spin" style={{ fontSize: 11 }} /> Running analysis…</>
                        : ai.analysedInSeconds ? <><TbClock style={{ fontSize: 11 }} /> Analysed in {ai.analysedInSeconds}s</> : null
                      }
                    </p>
                  </>
                )}
              </div>

              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 14 }}>AI assessment</p>
                {aiLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, padding: '16px 0' }}>
                    <TbLoader2 className="animate-spin" style={{ fontSize: 15 }} />
                    <span style={{ fontSize: 13 }}>Analysing application data against DR-1 through DR-6 rules…</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 14 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: C.success, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Positive factors</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(ai.strengths ?? []).length === 0
                            ? <span style={{ fontSize: 12, color: C.muted }}>None identified</span>
                            : (ai.strengths ?? []).map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                  <TbCheck style={{ fontSize: 13, color: C.success, flexShrink: 0, marginTop: 1 }} />
                                  <span style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{s}</span>
                                </div>
                              ))
                          }
                        </div>
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 600, color: C.warning, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Risk factors</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(ai.issues ?? []).length === 0
                            ? <span style={{ fontSize: 12, color: C.muted }}>None identified</span>
                            : (ai.issues ?? []).slice(0, 4).map((s, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                  <TbAlertTriangle style={{ fontSize: 13, color: C.warning, flexShrink: 0, marginTop: 1 }} />
                                  <span style={{ fontSize: 13, color: C.text, lineHeight: 1.45 }}>{s}</span>
                                </div>
                              ))
                          }
                        </div>
                      </div>
                    </div>
                    {ai.explanation && (
                      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>{ai.explanation}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Metrics: 4 donut cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="DTI ratio"        displayValue={ai.dti != null ? `${ai.dti}%` : '—'} pct={ai.dti != null ? ai.dti / 80 : 0}  color={dtiCol} sub={dtiSub}  loading={aiLoading} />
              <MetricCard label="Credit score"     displayValue={cs}                                   pct={(cs - 300) / 550}                     color={csCol}  sub={csSub}  loading={false}    />
              <MetricCard label="LTV ratio"        displayValue={ltv != null ? `${ltv}%` : 'N/A'}     pct={ltv != null ? ltv / 100 : 0}          color={ltvCol} sub={ltvSub} loading={false}    />
              <MetricCard label="Doc confidence"   displayValue={avgConf != null ? `${avgConf}%` : '—'} pct={avgConf != null ? avgConf / 100 : 0} color={confCol} sub={confSub} loading={aiLoading} />
            </div>

            {/* Banking Analytics — full width on mobile, centered ~75% on desktop */}
            <div className="w-full lg:w-[75%] lg:self-center shrink-0" style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, height: 300, boxSizing: 'border-box', overflow: 'hidden' }}>
              <BankingChart months={docs.bankStatement.months} />
            </div>

            {/* Submitted documents — client's actual uploads (view originals + parsed) */}
            {rawDocuments.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
                <ClientDocumentsViewer documents={rawDocuments} title="Documents submitted by client" />
              </div>
            )}

            {/* Compliance: 3 compact cards */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 10 }}>Compliance checks</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <ComplianceSummaryCard title="KYC" items={compliance.kyc} />
                <ComplianceSummaryCard title="AML" items={compliance.aml} />
                <ComplianceSummaryCard title="Policy" items={compliance.policy} />
              </div>
            </div>

            {/* Data Reconciliation — exceptions only */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Data reconciliation</p>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                    {aiLoading ? 'Waiting for AI…' : exceptions.length === 0 ? 'All data points verified — no exceptions' : `${exceptions.length} exception${exceptions.length > 1 ? 's' : ''} detected`}
                  </p>
                </div>
                {!aiLoading && exceptions.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.critical, background: '#FEF2F2', padding: '3px 10px', borderRadius: 20, border: '1px solid #FCA5A5' }}>
                    {exceptions.filter(r => r.status === 'mismatch').length} Mismatch · {exceptions.filter(r => r.status === 'variance').length} Variance
                  </span>
                )}
              </div>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, padding: '12px 0' }}>
                  <TbLoader2 className="animate-spin" style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 13 }}>Waiting for AI to complete reconciliation…</span>
                </div>
              ) : exceptions.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.success, padding: '10px 0' }}>
                  <TbCheck style={{ fontSize: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>All 6 data points verified successfully.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {exceptions.map((row, i) => <ReconRow key={i} row={row} />)}
                </div>
              )}
            </div>

            {/* Officer Notes */}
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 20, marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <TbNotes style={{ fontSize: 15, color: C.primary }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Officer notes</p>
                </div>
                <span style={{ fontSize: 11, color: C.muted }}>{officerNotes.length}/500</span>
              </div>
              <textarea
                value={officerNotes}
                onChange={e => setOfficerNotes(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="Add observations, context, or additional findings for the compliance record…"
                style={{ width: '100%', fontSize: 13, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', resize: 'none', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', boxSizing: 'border-box' }}
                onFocus={e  => (e.target.style.borderColor = C.primary)}
                onBlur={e   => (e.target.style.borderColor = C.border)}
              />
            </div>
          </div>

          {/* ── Right Analysis Panel — stacked below on mobile, sidebar on desktop ── */}
          <div className="flex flex-col w-full lg:w-[30%] lg:max-w-[450px] shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 lg:overflow-y-auto">

            {/* Recommendation */}
            <div style={{ padding: 20, borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>AI recommendation</p>
              <div style={{ borderRadius: 10, padding: 16, background: recCfg.bg, border: `1px solid ${recCfg.border}` }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: recCfg.color, lineHeight: 1.2 }}>{recCfg.label}</p>
                {!aiLoading && (ai.issues ?? []).length > 0 && (
                  <ul style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {(ai.issues ?? []).slice(0, 3).map((iss, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                        <span style={{ color: recCfg.color, fontSize: 11, marginTop: 2, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 12, color: C.text, lineHeight: 1.45 }}>{iss}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quick stats</p>
              {[
                ['Credit score',     cs,                                                           csCol ],
                ['DTI ratio',        ai.dti != null ? `${ai.dti}%` : '—',                         dtiCol],
                ['Monthly income',   fmt$(employment.monthlyGross),                                null  ],
                ['Monthly net',      fmt$(employment.monthlyNet),                                  null  ],
                ['Employment',       `${employment.yearsEmployed} yr${employment.yearsEmployed !== 1 ? 's' : ''}`, null],
                ['Employer',         (employment.employer ?? '—').split(' ').slice(0, 3).join(' '), null ],
                ['Loan to value',    ltv != null ? `${ltv}%` : 'N/A',                             ltvCol],
                ['Late payments',    financials.latePaymentsLast24Months ?? 0,                     financials.latePaymentsLast24Months > 0 ? C.warning : null],
              ].map(([lbl, val, col]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{lbl}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: col ?? C.text }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Risk Flags */}
            <div style={{ padding: 20, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk flags</p>
                {riskFlags.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.critical }}>
                    {riskFlags.filter(f => f.severity === 'critical').length}C · {riskFlags.filter(f => f.severity === 'warning').length}W
                  </span>
                )}
              </div>
              {aiLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.muted }}>
                  <TbLoader2 className="animate-spin" style={{ fontSize: 13 }} />
                  <span style={{ fontSize: 12 }}>Analysing…</span>
                </div>
              ) : riskFlags.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: C.success }}>
                  <TbCheck style={{ fontSize: 14 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>No risk flags detected</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {riskFlags.map((flag, i) => <RiskFlagCard key={i} flag={flag} />)}
                </div>
              )}
            </div>

            {/* Decision — status-aware lifecycle */}
            <div style={{ padding: 20, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              <DecisionPanel
                appRecord={appRecord}
                signedOff={signedOff}
                setSignedOff={setSignedOff}
                actionBusy={actionBusy}
                actionError={actionError}
                onApprove={onApprove}
                onReject={onReject}
                onOverride={onOverride}
                onEscalate={onEscalate}
              />
            </div>
          </div>
        </div>
      </div>

      <DecisionDialog
        decision={decision}
        busy={actionBusy !== null}
        error={actionError}
        onCancel={() => { if (actionBusy === null) { setDecision(null); setActionError(null) } }}
      />

      <ContextChat
        storageKey={`chat:loan-review:${summary.id}`}
        contextLabel={`${personalInfo.fullName} · ${summary.id}`}
        contextData={{ summary, applicant: detail, aiAnalysis: aiResult }}
        systemPrompt={LOAN_REVIEW_PROMPT}
        suggestions={[
          'Is declared income consistent with bank credits?',
          'Top 3 risk factors in this application',
          'What is your approve / decline / escalate recommendation?',
          'What single fix would unlock approval?',
        ]}
      />
    </div>
  )
}

/* ── Override Modal ──────────────────────────────────────────────────── */
/* ── Decision Panel — wires Approve / Reject / Override / Escalate ──── */
const fmtDecisionTime = iso => iso
  ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—'

const DecisionPanel = ({ appRecord, signedOff, setSignedOff, actionBusy, actionError, onApprove, onReject, onOverride, onEscalate }) => {
  const status       = appRecord?.status
  const decisionType = appRecord?.decisionType
  const decidedBy    = appRecord?.decidedBy
  const decidedAt    = appRecord?.decidedAt
  const decisionReason = appRecord?.decisionReason
  const isFinal      = status === 'approved' || (status === 'auto_rejected' && decisionType === 'rejected')
  const isAutoReject = status === 'auto_rejected' && decisionType !== 'rejected'   // AI declined, no officer decision yet
  const isApproved   = status === 'approved'
  const isLoading    = !appRecord

  /* ── Already-decided state: banner + audit ── */
  if (isApproved && decidedBy) {
    return (
      <DecisionBanner kind="success" Icon={TbCircleCheck}
        title={decisionType === 'override' ? 'Approved (AI override)' : 'Loan approved'}
        meta={`by ${decidedBy} · ${fmtDecisionTime(decidedAt)}`}
        reason={decisionReason}
      />
    )
  }
  if (status === 'auto_rejected' && decisionType === 'rejected') {
    return (
      <DecisionBanner kind="error" Icon={TbCircleX}
        title="Loan rejected by officer"
        meta={`by ${decidedBy ?? '—'} · ${fmtDecisionTime(decidedAt)}`}
        reason={decisionReason}
      />
    )
  }

  /* ── Action state ── */
  return (
    <>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, background: '#F9FAFB', borderRadius: 8, cursor: 'pointer', marginBottom: 12 }}>
        <input type="checkbox" checked={signedOff} onChange={e => setSignedOff(e.target.checked)}
          style={{ marginTop: 2, width: 15, height: 15, accentColor: C.primary, flexShrink: 0, cursor: 'pointer' }} />
        <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          I confirm I have reviewed all compliance checks and reconciliation data.
        </span>
      </label>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted, fontSize: 12, padding: '8px 0' }}>
          <TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Loading decision state…
        </div>
      ) : isAutoReject ? (
        /* AI auto-rejected — show Override (approve) as primary, Confirm rejection as secondary */
        <>
          <button onClick={onOverride} disabled={!signedOff || actionBusy !== null}
            style={btnPrimary(C.warning, !signedOff || actionBusy !== null)}>
            {actionBusy === 'override'
              ? <><TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Overriding…</>
              : <><TbAlertTriangle style={{ fontSize: 14 }} /> Override & Approve</>}
          </button>
          <button onClick={onReject} disabled={!signedOff || actionBusy !== null}
            style={btnSecondary(C.critical, !signedOff || actionBusy !== null)}>
            <TbCircleX style={{ fontSize: 13 }} /> Confirm rejection
          </button>
        </>
      ) : (
        /* needs_review / submitted / ai_reviewing — show Approve + Reject */
        <>
          <button onClick={onApprove} disabled={!signedOff || actionBusy !== null}
            style={btnPrimary(C.success, !signedOff || actionBusy !== null)}>
            {actionBusy === 'approve'
              ? <><TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Approving…</>
              : <><TbCircleCheck style={{ fontSize: 14 }} /> Approve loan</>}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onReject} disabled={!signedOff || actionBusy !== null} style={btnSecondaryFlex(C.critical, !signedOff || actionBusy !== null)}>
              {actionBusy === 'reject'
                ? <><TbLoader2 className="animate-spin" style={{ fontSize: 13 }} /> Rejecting…</>
                : <><TbCircleX style={{ fontSize: 13 }} /> Reject</>}
            </button>
            <button onClick={onEscalate} disabled={!signedOff || actionBusy !== null} style={btnSecondaryFlex(C.muted, !signedOff || actionBusy !== null)}>
              <TbArrowUpRight style={{ fontSize: 13 }} /> Escalate
            </button>
          </div>
        </>
      )}

      {actionError && (
        <p style={{ fontSize: 11.5, color: C.critical, marginTop: 8 }}>{actionError}</p>
      )}
    </>
  )
}

const btnPrimary = (color, disabled) => ({
  width: '100%', padding: '10px 16px', fontSize: 13, fontWeight: 600,
  color: '#fff', background: disabled ? '#9CA3AF' : color,
  borderRadius: 8, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  opacity: disabled ? 0.6 : 1,
})

const btnSecondary = (color, disabled) => ({
  width: '100%', padding: '9px 16px', fontSize: 12.5, fontWeight: 500,
  color: disabled ? '#D1D5DB' : color, background: '#fff',
  borderRadius: 8, border: `1px solid ${disabled ? '#F3F4F6' : color + '60'}`,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
})

const btnSecondaryFlex = (color, disabled) => ({
  flex: 1, padding: '8px 10px', fontSize: 12, fontWeight: 500,
  color: disabled ? '#D1D5DB' : color, background: '#fff',
  borderRadius: 8, border: `1px solid ${disabled ? '#F3F4F6' : color + '60'}`,
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
})

const DecisionBanner = ({ kind, Icon, title, meta, reason }) => {
  const cfg = kind === 'success'
    ? { bg: '#F0FDF4', border: '#86EFAC', color: C.success }
    : { bg: '#FEF2F2', border: '#FCA5A5', color: C.critical }
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Icon style={{ fontSize: 18, color: cfg.color, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{title}</p>
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: 3 }}>{meta}</p>
          {reason && (
            <p style={{ fontSize: 12, color: C.text, marginTop: 8, lineHeight: 1.5, paddingTop: 8, borderTop: `1px solid ${cfg.border}80` }}>
              <strong style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason</strong>
              <br />{reason}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default ApplicationReviewPage
