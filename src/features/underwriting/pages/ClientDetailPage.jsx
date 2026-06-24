import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TbAlertCircle,
  TbArrowLeft,
  TbArrowRight,
  TbBuilding,
  TbCash,
  TbCheck,
  TbCircleCheck,
  TbEdit,
  TbFileText,
  TbId,
  TbLoader2,
  TbMail,
  TbPhone,
  TbReportMoney,
  TbUpload,
  TbUser,
  TbWallet,
} from 'react-icons/tb'
import { useNavigate, useParams } from 'react-router-dom'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import ClientDocumentsViewer from '../components/ClientDocumentsViewer'
import { api } from '../services/api'

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
}

const fmt$ = v => (v === '' || v == null || Number(v) === 0) ? '—' : `$${Number(v).toLocaleString()}`
const fmtK = v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v ?? 0)
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const initialsOf = name => (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const STATUS_STYLE = {
  active:   { label: 'Active',   color: 'text-success',  bg: 'bg-green-50',  border: 'border-green-200' },
  pending:  { label: 'Pending',  color: 'text-warning',  bg: 'bg-orange-50', border: 'border-orange-200' },
  inactive: { label: 'Inactive', color: 'text-tertiary', bg: 'bg-gray-100',  border: 'border-gray-200' },
}

/* ── Field rules ──────────────────────────────────────────────────────────
   Each rule defines: input filtering (sanitize), constraints (maxLength,
   inputMode, type), and a validate() function returning an error string or
   '' when the value is acceptable. Empty string ⇒ field unset ⇒ valid.    */
const digitsOnly = (s) => String(s ?? '').replace(/\D/g, '')

const FIELD_RULES = {
  name:        { type: 'text',  maxLength: 80,
                 validate: v => !v?.trim() ? 'Name is required' : v.trim().length < 2 ? 'Too short' : '' },
  email:       { type: 'email', maxLength: 120,
                 validate: v => !v?.trim() ? 'Email is required'
                              : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email' : '' },
  phone:       { type: 'tel',   maxLength: 11, inputMode: 'numeric', sanitize: digitsOnly,
                 validate: v => !v ? '' : v.length < 7 ? 'Phone is too short' : v.length > 11 ? 'Phone is too long' : '' },
  dateOfBirth: { type: 'date',
                 validate: v => !v ? '' : new Date(v) > new Date() ? 'Date cannot be in the future'
                              : new Date(v).getFullYear() < 1900 ? 'Year is too far in the past' : '' },
  idNumber:    { type: 'text',  maxLength: 20, sanitize: s => String(s ?? '').replace(/[^A-Za-z0-9-]/g, '').toUpperCase(),
                 validate: v => !v ? '' : v.length < 4 ? 'ID is too short' : '' },
  nationality: { type: 'text',  maxLength: 40, sanitize: s => String(s ?? '').replace(/[^A-Za-z\s-]/g, '') },
  location:    { type: 'text',  maxLength: 80 },
  address:     { type: 'text',  maxLength: 200 },
  company:     { type: 'text',  maxLength: 80 },
  employer:    { type: 'text',  maxLength: 80 },
  jobTitle:    { type: 'text',  maxLength: 60 },
  monthlyGross: { type: 'text', inputMode: 'numeric', maxLength: 10, sanitize: digitsOnly,
                  validate: v => !v ? '' : Number(v) > 9_999_999_999 ? 'Value too large' : '' },
  monthlyNet:   { type: 'text', inputMode: 'numeric', maxLength: 10, sanitize: digitsOnly,
                  validate: v => !v ? '' : Number(v) > 9_999_999_999 ? 'Value too large' : '' },
  yearsEmployed:{ type: 'text', inputMode: 'numeric', maxLength: 2, sanitize: digitsOnly,
                  validate: v => !v ? '' : Number(v) > 60 ? 'Must be 0–60' : '' },
  creditScore:  { type: 'text', inputMode: 'numeric', maxLength: 3, sanitize: digitsOnly,
                  validate: v => !v ? '' : Number(v) < 300 ? 'Below 300' : Number(v) > 850 ? 'Above 850' : '' },
  bankName:     { type: 'text', maxLength: 60 },
  accountHolder:{ type: 'text', maxLength: 80 },
  accountNumber:{ type: 'text', maxLength: 20, inputMode: 'numeric', sanitize: digitsOnly,
                  validate: v => !v ? '' : v.length < 6 ? 'Account too short' : '' },
  statementPeriod: { type: 'text', maxLength: 40 },
  averageMonthlyCredit:  { type: 'text', inputMode: 'numeric', maxLength: 12, sanitize: digitsOnly },
  averageMonthlyDebit:   { type: 'text', inputMode: 'numeric', maxLength: 12, sanitize: digitsOnly },
  averageClosingBalance: { type: 'text', inputMode: 'numeric', maxLength: 12, sanitize: digitsOnly },
  notes:        { type: 'text', maxLength: 1000 },
}

/** Validate the whole draft. Returns { [field]: errorString } only for fields with errors. */
const validateDraft = (draft) => {
  const errs = {}
  for (const [name, rule] of Object.entries(FIELD_RULES)) {
    if (!rule.validate) continue
    const msg = rule.validate(draft?.[name])
    if (msg) errs[name] = msg
  }
  return errs
}

/* ── Ring chart ───────────────────────────────────────────────────────── */
const RingChart = ({ pct = 0, color = C.primary, size = 110, stroke = 10, children }) => {
  const r = (size - stroke * 2) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(Math.max(pct, 0), 1) * circ
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size}>
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

/* ── Smooth-curve helper ──────────────────────────────────────────────── */
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

const niceCeil = v => {
  if (v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const base = Math.pow(10, exp)
  const f = v / base
  /* Finer steps so values like 2.7 round to 3 (not 5) — keeps the axis tight
     and stops the lines from bunching in the lower third of the chart. */
  const nf = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5
           : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10
  return nf * base
}

/* Synthesise 3 months of plausible banking data from the aggregates. */
const synthMonths = (client) => {
  const avgC = Number(client.averageMonthlyCredit  ?? 0)
  const avgD = Number(client.averageMonthlyDebit   ?? 0)
  const avgB = Number(client.averageClosingBalance ?? 0)
  if (avgC === 0 && avgD === 0 && avgB === 0) return []
  const labels = ['Mar', 'Apr', 'May']
  const scale  = (avg, f) => Math.round(avg * f)
  return [
    { month: labels[0], totalCredits: scale(avgC, 0.94), totalDebits: scale(avgD, 0.96), closingBalance: scale(avgB, 0.94) },
    { month: labels[1], totalCredits: scale(avgC, 1.00), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 0.99) },
    { month: labels[2], totalCredits: scale(avgC, 1.06), totalDebits: scale(avgD, 1.02), closingBalance: scale(avgB, 1.06) },
  ]
}

/* ── Banking chart ────────────────────────────────────────────────────── */
const BankingChart = ({ months }) => {
  const ref = useRef(null)
  const [sz, setSz] = useState({ w: 600, h: 220 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width > 0 && height > 0) setSz({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  if (!months?.length) return <div className="text-center py-8 text-tertiary text-[13px]">No banking activity</div>

  const { w, h } = sz
  /* Extra left/bottom room reserved for the rotated Y-axis title + X-axis title. */
  const PAD = { t: 12, r: 16, b: 44, l: 72 }
  const pw = Math.max(w - PAD.l - PAD.r, 1)
  const ph = Math.max(h - PAD.t - PAD.b, 1)

  const bal  = months.map(m => m.closingBalance)
  const cred = months.map(m => m.totalCredits)
  const deb  = months.map(m => m.totalDebits)
  const dMax = Math.max(...bal, ...cred, ...deb)
  const yMax = niceCeil(dMax * 1.12)
  const ySpan = yMax || 1

  const n = months.length
  const xOf = i => PAD.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw)
  const yOf = v => PAD.t + (1 - v / ySpan) * ph
  const pts = arr => arr.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
  const balPath  = crCurve(pts(bal))
  const credPath = crCurve(pts(cred))
  const debPath  = crCurve(pts(deb))
  const areaClose = n > 1 ? ` L${xOf(n - 1).toFixed(2)},${(PAD.t + ph).toFixed(2)} L${PAD.l.toFixed(2)},${(PAD.t + ph).toFixed(2)}Z` : ''
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => p * ySpan)

  return (
    <div style={{ height: 260 }} ref={ref}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="cdp_balfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.primary} stopOpacity="0.18" />
            <stop offset="100%" stopColor={C.primary} stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} y1={yOf(v)} x2={w - PAD.r} y2={yOf(v)} stroke="#EFF2F7" />
            <text x={PAD.l - 6} y={yOf(v) + 4} textAnchor="end" fontSize="10.5" fill={C.muted}>${fmtK(v)}</text>
          </g>
        ))}
        <path d={balPath + areaClose} fill="url(#cdp_balfill)" />
        <path d={debPath}  fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="6 4" strokeLinecap="round" />
        <path d={credPath} fill="none" stroke={C.success} strokeWidth="2" strokeLinecap="round" />
        <path d={balPath}  fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" />
        {pts(bal).map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={C.primary} strokeWidth="2" />)}
        {/* X-axis month labels */}
        {months.map((m, i) => (
          <text key={i} x={xOf(i)} y={PAD.t + ph + 18} textAnchor="middle" fontSize="11" fill={C.muted}>{m.month}</text>
        ))}
        {/* X-axis title */}
        <text x={PAD.l + pw / 2} y={h - 4} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.muted} letterSpacing="0.04em">MONTH</text>
        {/* Y-axis title (rotated) */}
        <text transform={`translate(14 ${PAD.t + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize="10.5" fontWeight="600" fill={C.muted} letterSpacing="0.04em">AMOUNT (USD)</text>
      </svg>
    </div>
  )
}

/* ── Page ────────────────────────────────────────────────────────────── */
const ClientDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [client, setClient] = useState(null)
  const [error, setError]   = useState(null)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({})
  const [saving, setSaving]   = useState(false)

  const load = () => api.get(`/clients/${id}`).then(c => { setClient(c); setDraft(toDraft(c)) }).catch(e => setError(e.message))
  useEffect(() => { load() }, [id])

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><TbMenu2 style={{ fontSize: 20 }} /></button>
          <span className="text-[14px] font-semibold text-navy">Client</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="px-8 py-6"><div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-error text-[13px]">{error}</div></div>}
          {!client && !error && (
            <div className="flex items-center justify-center py-20 text-tertiary">
              <TbLoader2 className="animate-spin mr-2" style={{ fontSize: 18 }} /> Loading client…
            </div>
          )}
          {client && (
            <Body
              client={client}
              navigate={navigate}
              editing={editing}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onUploaded={load}
              onEdit={() => { setDraft(toDraft(client)); setEditing(true) }}
              onCancel={() => { setDraft(toDraft(client)); setEditing(false) }}
              onSave={async (errors) => {
                if (Object.keys(errors).length > 0) return
                setSaving(true)
                try {
                  await api.patch(`/clients/${client.id}`, normalize(draft))
                  await load()
                  setEditing(false)
                } catch (e) { setError(e.message) }
                finally { setSaving(false) }
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const toDraft = (c) => ({
  status: c.status ?? 'pending',
  name: c.name ?? '', email: c.email ?? '', phone: c.phone ?? '',
  company: c.company ?? '', location: c.location ?? '',
  dateOfBirth: c.dateOfBirth ?? '', address: c.address ?? '',
  idNumber: c.idNumber ?? '', nationality: c.nationality ?? '',
  notes: c.notes ?? '',
  employer: c.employer ?? '', jobTitle: c.jobTitle ?? '',
  monthlyGross: c.monthlyGross ?? '',  monthlyNet: c.monthlyNet ?? '',
  yearsEmployed: c.yearsEmployed ?? '', creditScore: c.creditScore ?? '',
  bankName: c.bankName ?? '', accountHolder: c.accountHolder ?? '',
  accountNumber: c.accountNumber ?? '', statementPeriod: c.statementPeriod ?? '',
  averageMonthlyCredit: c.averageMonthlyCredit ?? '',
  averageMonthlyDebit:  c.averageMonthlyDebit ?? '',
  averageClosingBalance: c.averageClosingBalance ?? '',
})

const num = v => v === '' || v == null ? null : Number(v)
const normalize = (d) => ({
  status: d.status,
  name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(),
  company: d.company.trim() || null, location: d.location.trim(),
  notes: d.notes,
  employer: d.employer, jobTitle: d.jobTitle,
  monthlyGross: num(d.monthlyGross), monthlyNet: num(d.monthlyNet),
  yearsEmployed: num(d.yearsEmployed), creditScore: num(d.creditScore),
  bankName: d.bankName, accountHolder: d.accountHolder,
  accountNumber: d.accountNumber, statementPeriod: d.statementPeriod,
  averageMonthlyCredit: num(d.averageMonthlyCredit),
  averageMonthlyDebit:  num(d.averageMonthlyDebit),
  averageClosingBalance: num(d.averageClosingBalance),
})

/* ── Body ────────────────────────────────────────────────────────────── */
const Body = ({ client, navigate, editing, draft, setDraft, saving, onEdit, onCancel, onSave, onUploaded }) => {
  const isBusiness = client.type === 'business'
  const st = STATUS_STYLE[client.status] ?? STATUS_STYLE.pending

  /* Field setter applies the rule's sanitizer + maxLength before writing. */
  const set = (k, v) => {
    const rule = FIELD_RULES[k]
    let next = v
    if (rule?.sanitize) next = rule.sanitize(next)
    if (rule?.maxLength != null) next = String(next ?? '').slice(0, rule.maxLength)
    setDraft(d => ({ ...d, [k]: next }))
  }

  const errors      = useMemo(() => editing ? validateDraft(draft) : {}, [draft, editing])
  const errorCount  = Object.keys(errors).length
  const canSave     = !saving && errorCount === 0

  const apps          = client.loanApplications ?? []
  const engagements   = client.advisoryEngagements ?? []
  const documents     = client.documents ?? []
  const totalApproved = apps.filter(a => a.status === 'approved').reduce((s, a) => s + (a.amount ?? 0), 0)

  const gross    = Number(client.monthlyGross ?? 0)
  const net      = Number(client.monthlyNet   ?? 0)
  const balance  = Number(client.averageClosingBalance ?? 0)
  const credit   = Number(client.creditScore ?? 0)
  const savingsRate = gross > 0 ? Math.max(0, Math.min(1, (gross - net) / gross)) : 0
  const months = useMemo(() => synthMonths(client), [client])

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-6 max-w-[1400px] mx-auto">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/underwriting/team')}
          className="flex items-center gap-1.5 text-[12.5px] text-secondary hover:text-gray-800">
          <TbArrowLeft style={{ fontSize: 14 }} /> 
        </button>
        {!editing ? (
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium text-blue-action bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
            <TbEdit style={{ fontSize: 14 }} /> Edit profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-error">
                <TbAlertCircle style={{ fontSize: 13 }} />
                {errorCount} field{errorCount === 1 ? '' : 's'} need attention
              </span>
            )}
            <button onClick={onCancel} disabled={saving}
              className="px-3.5 py-1.5 text-[12.5px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              Cancel
            </button>
            <button onClick={() => onSave(errors)} disabled={!canSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-40">
              {saving ? <><TbLoader2 className="animate-spin" style={{ fontSize: 13 }} /> Saving…</> : <><TbCheck style={{ fontSize: 13 }} /> Save changes</>}
            </button>
          </div>
        )}
      </div>

      {/* Hero with gradient */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-5">
        <div className="px-4 sm:px-7 py-5 sm:py-7 bg-gradient-to-r from-[#1D3557] via-[#1f3d63] to-[#2a4a7a] text-white relative">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[18px] sm:text-[22px] font-semibold shrink-0">
              {initialsOf(client.name)}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input value={draft.name}
                  maxLength={FIELD_RULES.name.maxLength}
                  onChange={e => set('name', e.target.value)}
                  className={`block w-full max-w-[420px] text-[20px] sm:text-[24px] font-semibold bg-white/15 text-white border rounded-md px-2 py-0.5 outline-none focus:border-white/70 ${errors.name ? 'border-red-300' : 'border-white/30'}`} />
              ) : (
                <h1 className="text-[20px] sm:text-[26px] font-semibold leading-tight break-words">{client.name}</h1>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-white/80">
                {isBusiness ? <TbBuilding style={{ fontSize: 14 }} /> : <TbUser style={{ fontSize: 14 }} />}
                {isBusiness ? 'Business' : 'Individual'}
                {(client.company || editing) && (
                  <>
                    <span className="text-white/40">·</span>
                    {editing ? (
                      <input value={draft.company}
                        maxLength={FIELD_RULES.company.maxLength}
                        onChange={e => set('company', e.target.value)} placeholder="Company"
                        className="bg-white/10 text-white placeholder-white/40 border border-white/20 rounded px-2 py-0 text-[13px] outline-none focus:border-white/60" />
                    ) : (
                      client.company
                    )}
                  </>
                )}
              </div>
              <p className="text-[11px] text-white/60 mt-1 font-mono">{client.id}</p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {editing ? (
                  <select
                    value={draft.status}
                    onChange={e => set('status', e.target.value)}
                    className="text-[12.5px] font-medium bg-white/15 text-white border border-white/30 rounded-full px-3 py-1 outline-none focus:border-white/70 [&>option]:text-gray-900"
                    title="Client status"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                ) : (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[12.5px] font-medium`}>
                    {st.label}
                  </span>
                )}
                {client.email && !editing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/85">
                    <TbMail style={{ fontSize: 12 }} /> {client.email}
                  </span>
                )}
                {client.phone && !editing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/85">
                    <TbPhone style={{ fontSize: 12 }} /> {client.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Hero right — clean stat tiles (no awkward empty rings) */}
            {!editing && (
              <div className="hidden md:flex items-stretch gap-0 shrink-0 rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                <HeroStat value={'$' + fmtK(gross)} label={isBusiness ? 'REVENUE / MO' : 'INCOME / MO'} />
                <HeroStat value={'$' + fmtK(balance)} label="BALANCE" divider />
                {credit > 0 && <HeroStat value={credit} label="CREDIT" divider />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="LOAN APPS" value={apps.length} sub={`${apps.filter(a => a.status === 'approved').length} approved`} accent={C.primary} icon={TbCash} />
        <KpiCard label="ADVISORY" value={engagements.length} sub={`${engagements.filter(e => e.status === 'confirmed').length} confirmed`} accent={C.success} icon={TbReportMoney} />
        <KpiCard label="APPROVED" value={fmt$(totalApproved)} sub="loan history" accent="#8B5CF6" icon={TbCash} />
        <KpiCard label="DOCUMENTS" value={documents.length} sub="on file" accent={C.warning} icon={TbFileText} />
      </div>

      {/* Banking chart + savings donut */}
      {months.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-gray-900">Banking activity</p>
                <p className="text-[11.5px] text-tertiary mt-0.5">3-month rolling average · primary account</p>
              </div>
              <div className="flex gap-3 text-[10.5px] text-secondary">
                <Legend color={C.primary} dash={false} label="Balance" />
                <Legend color={C.success} dash={false} label="Credits" />
                <Legend color="#94A3B8"   dash={true}  label="Debits" />
              </div>
            </div>
            <BankingChart months={months} />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center">
            <RingChart pct={savingsRate} color={savingsRate >= 0.2 ? C.success : savingsRate >= 0.1 ? C.warning : C.critical} size={130} stroke={12}>
              <span className="text-[24px] font-bold text-gray-900 leading-none">{Math.round(savingsRate * 100)}%</span>
              <span className="text-[9.5px] font-semibold uppercase tracking-widest text-tertiary mt-1">Savings rate</span>
            </RingChart>
            <p className="text-[11px] text-tertiary mt-3 text-center max-w-[180px]">
              {savingsRate >= 0.2 ? 'Healthy — strong cushion for goals' : savingsRate >= 0.1 ? 'Adequate — room to grow' : 'Low — consider belt-tightening'}
            </p>
          </div>
        </div>
      )}

      {/* Editable identity + employment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Identity" icon={TbId}>
          <FieldRow name="email"       label="Email"         value={client.email}        editing={editing} draft={draft.email}        error={errors.email}        onChange={v => set('email', v)} />
          <FieldRow name="phone"       label="Phone"         value={client.phone}        editing={editing} draft={draft.phone}        error={errors.phone}        onChange={v => set('phone', v)} />
          <FieldRow name="dateOfBirth" label="Date of birth" value={client.dateOfBirth}  editing={editing} draft={draft.dateOfBirth}  error={errors.dateOfBirth}  onChange={v => set('dateOfBirth', v)} />
          <FieldRow name="idNumber"    label="ID number"     value={client.idNumber}     editing={editing} draft={draft.idNumber}     error={errors.idNumber}     onChange={v => set('idNumber', v)} mono />
          <FieldRow name="nationality" label="Nationality"   value={client.nationality}  editing={editing} draft={draft.nationality}  error={errors.nationality}  onChange={v => set('nationality', v)} />
          <FieldRow name="location"    label="Location"      value={client.location}     editing={editing} draft={draft.location}     error={errors.location}     onChange={v => set('location', v)} />
          <FieldRow name="address"     label="Address"       value={client.address}      editing={editing} draft={draft.address}      error={errors.address}      onChange={v => set('address', v)} wide />
        </Section>

        <Section title={isBusiness ? 'Business operations' : 'Employment & finances'} icon={TbReportMoney}>
          <FieldRow name="employer"      label={isBusiness ? 'Operating entity' : 'Employer'} value={client.employer} editing={editing} draft={draft.employer} error={errors.employer} onChange={v => set('employer', v)} />
          <FieldRow name="jobTitle"      label={isBusiness ? 'Sector' : 'Job title'}          value={client.jobTitle} editing={editing} draft={draft.jobTitle} error={errors.jobTitle} onChange={v => set('jobTitle', v)} />
          <FieldRow name="monthlyGross"  label={isBusiness ? 'Monthly revenue' : 'Monthly gross'} value={fmt$(client.monthlyGross)} editing={editing} draft={draft.monthlyGross} error={errors.monthlyGross} onChange={v => set('monthlyGross', v)} />
          <FieldRow name="monthlyNet"    label="Monthly net"   value={fmt$(client.monthlyNet)} editing={editing} draft={draft.monthlyNet} error={errors.monthlyNet} onChange={v => set('monthlyNet', v)} />
          <FieldRow name="yearsEmployed" label={isBusiness ? 'Years in business' : 'Years employed'} value={client.yearsEmployed} editing={editing} draft={draft.yearsEmployed} error={errors.yearsEmployed} onChange={v => set('yearsEmployed', v)} />
          <FieldRow name="creditScore"   label="Credit score"  value={client.creditScore || '—'} editing={editing} draft={draft.creditScore} error={errors.creditScore} onChange={v => set('creditScore', v)} />
        </Section>
      </div>

      {/* Banking details */}
      <div className="mt-4">
        <Section title="Banking details" icon={TbWallet}>
          <FieldRow name="bankName"        label="Bank"             value={client.bankName}        editing={editing} draft={draft.bankName}        error={errors.bankName}        onChange={v => set('bankName', v)} />
          <FieldRow name="accountHolder"   label="Account holder"   value={client.accountHolder}   editing={editing} draft={draft.accountHolder}   error={errors.accountHolder}   onChange={v => set('accountHolder', v)} />
          <FieldRow name="accountNumber"   label="Account number"   value={client.accountNumber}   editing={editing} draft={draft.accountNumber}   error={errors.accountNumber}   onChange={v => set('accountNumber', v)} mono />
          <FieldRow name="statementPeriod" label="Statement period" value={client.statementPeriod} editing={editing} draft={draft.statementPeriod} error={errors.statementPeriod} onChange={v => set('statementPeriod', v)} />
          <FieldRow name="averageMonthlyCredit"  label="Avg credit / mo"  value={fmt$(client.averageMonthlyCredit)}  editing={editing} draft={draft.averageMonthlyCredit}  error={errors.averageMonthlyCredit}  onChange={v => set('averageMonthlyCredit', v)} />
          <FieldRow name="averageMonthlyDebit"   label="Avg debit / mo"   value={fmt$(client.averageMonthlyDebit)}   editing={editing} draft={draft.averageMonthlyDebit}   error={errors.averageMonthlyDebit}   onChange={v => set('averageMonthlyDebit', v)} />
          <FieldRow name="averageClosingBalance" label="Avg balance"      value={fmt$(client.averageClosingBalance)} editing={editing} draft={draft.averageClosingBalance} error={errors.averageClosingBalance} onChange={v => set('averageClosingBalance', v)} highlight />
        </Section>
      </div>

      {/* Loan applications */}
      {apps.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Loan applications</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-[12.5px] min-w-[640px]">
              <thead className="bg-gray-50 text-secondary">
                <tr>
                  <Th>App ID</Th><Th>Loan type</Th><Th className="text-right">Amount</Th>
                  <Th>Term</Th><Th>Status</Th><Th>Submitted</Th><Th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {apps.map(a => (
                  <tr key={a.id}
                      onClick={() => navigate(`/underwriting/review/${a.legacyId ?? a.id}`)}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <Td className="font-mono text-[11.5px] text-tertiary">{a.legacyId ?? a.id}</Td>
                    <Td className="text-gray-900 font-medium"><TbCash className="inline mr-1 text-secondary" style={{ fontSize: 13 }} /> {a.loanType}</Td>
                    <Td className="text-right font-semibold tabular-nums">{fmt$(a.amount)}</Td>
                    <Td className="text-secondary">{a.termYears ? `${a.termYears} yr` : '—'}</Td>
                    <Td><LoanStatusPill status={a.status} /></Td>
                    <Td className="text-secondary tabular-nums whitespace-nowrap">{fmtDate(a.submittedAt)}</Td>
                    <Td className="text-right"><TbArrowRight className="text-tertiary inline" style={{ fontSize: 14 }} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Advisory engagements */}
      {engagements.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Advisory engagements</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-[12.5px] min-w-[640px]">
              <thead className="bg-gray-50 text-secondary">
                <tr>
                  <Th>Engagement ID</Th>
                  <Th>Type</Th>
                  <Th>Advisor</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {engagements.map(e => (
                  <EngagementRow key={e.id} engagement={e} navigate={navigate} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents */}
      {(documents.length > 0 || editing) && (
        <div className="mt-5">
          <ClientDocumentsViewer
            documents={documents}
            title="Documents on file"
            emptyHint={editing ? 'No documents yet — add the client’s files below.' : undefined}
          />
          {editing && (
            <AddDocumentPanel
              clientId={client.id}
              existingTypes={documents.map(d => d.docType)}
              onUploaded={onUploaded}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ── Add-document panel (edit mode) ──────────────────────────────────────
   Pick a document type + upload a file (image/PDF stored as a data URL, or a
   JSON file parsed inline) → POST /clients/:id/documents → refresh. */
const DOC_TYPE_OPTIONS = [
  { value: 'national-id',         label: 'National ID' },
  { value: 'passport',            label: 'Passport' },
  { value: 'salary-slip',         label: 'Salary Slip' },
  { value: 'bank-statement',      label: 'Bank Statement' },
  { value: 'employment-letter',   label: 'Employment Letter' },
  { value: 'tax-return',          label: 'Tax Return' },
  { value: 'business-license',    label: 'Business License' },
  { value: 'financial-statement', label: 'Financial Statement' },
]

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload  = () => resolve(r.result)
  r.onerror = () => reject(r.error)
  r.readAsDataURL(file)
})

const AddDocumentPanel = ({ clientId, existingTypes = [], onUploaded }) => {
  const [docType, setDocType] = useState('')
  const [status, setStatus]   = useState('idle')   // idle | uploading | success | error
  const [errMsg, setErrMsg]   = useState(null)
  const [fileName, setFileName] = useState(null)
  const [requeued, setRequeued] = useState(0)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return
    if (!docType) { setErrMsg('Choose a document type first.'); setStatus('error'); return }
    setFileName(file.name); setErrMsg(null); setStatus('uploading')
    try {
      const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
      let parsedJson = null, fileDataUrl = null
      if (isJson) {
        parsedJson = JSON.parse(await file.text())
      } else {
        fileDataUrl = await fileToDataUrl(file)
      }
      const res = await api.post(`/clients/${clientId}/documents`, {
        docType,
        filename: file.name,
        mimeType: file.type || (isJson ? 'application/json' : 'application/octet-stream'),
        fileDataUrl,
        parsedJson,
        uploadSource: isJson ? 'json' : 'image',
        status: 'pending',
      })
      setRequeued(res?.requeuedForReview ?? 0)
      setStatus('success')
      setDocType('')
      onUploaded?.()
    } catch (e) {
      setStatus('error')
      setErrMsg(e.message ? `Upload failed: ${e.message}` : 'Upload failed')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const busy = status === 'uploading'

  return (
    <div className="mt-3 bg-white border border-dashed border-gray-300 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1 min-w-0">
          <label className="block text-[10.5px] font-semibold text-tertiary uppercase tracking-wider mb-1">Add a document</label>
          <select
            value={docType}
            onChange={e => { setDocType(e.target.value); setStatus('idle'); setErrMsg(null) }}
            className="w-full text-[13px] text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action bg-white"
          >
            <option value="">Select document type…</option>
            {DOC_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}{existingTypes.includes(o.value) ? ' (replace existing)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf,application/json,.json"
            className="hidden"
            onChange={e => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => { if (!docType) { setErrMsg('Choose a document type first.'); setStatus('error'); return } inputRef.current?.click() }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            {busy
              ? <><TbLoader2 className="animate-spin" style={{ fontSize: 14 }} /> Uploading…</>
              : <><TbUpload style={{ fontSize: 14 }} /> Choose file</>}
          </button>
        </div>
      </div>

      {/* status line */}
      {status === 'success' && (
        <p className="text-[12px] text-success mt-2 flex items-center gap-1.5">
          <TbCircleCheck style={{ fontSize: 13 }} />
          Uploaded {fileName}.{requeued > 0 ? ` AI is re-reviewing ${requeued} application${requeued === 1 ? '' : 's'}.` : ' It’s now on file.'}
        </p>
      )}
      {status === 'error' && errMsg && (
        <p className="text-[12px] text-error mt-2 flex items-center gap-1.5">
          <TbAlertCircle style={{ fontSize: 13 }} /> {errMsg}
        </p>
      )}
      {status === 'idle' && (
        <p className="text-[11px] text-tertiary mt-2">Images & PDFs are stored as the original file; JSON files are parsed into structured data.</p>
      )}
    </div>
  )
}

/* ── Atoms ───────────────────────────────────────────────────────────── */

const HeroStat = ({ value, label, divider }) => (
  <div className={`px-5 py-3 text-center ${divider ? 'border-l border-white/15' : ''}`}>
    <p className="text-[22px] font-bold text-white leading-none">{value}</p>
    <p className="text-[9.5px] font-semibold uppercase tracking-widest text-white/65 mt-2">{label}</p>
  </div>
)

const KpiCard = ({ label, value, sub, accent, icon: Icon }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
    <div className="flex items-center gap-2 mb-3">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: accent + '15' }}
      >
        <Icon style={{ fontSize: 14, color: accent }} />
      </div>
      <p className="text-[10.5px] font-semibold text-secondary uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-[28px] font-bold text-gray-900 leading-none">{value}</p>
    <p className="text-[11px] text-tertiary mt-2">{sub}</p>
  </div>
)

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
      <Icon className="text-secondary" style={{ fontSize: 15 }} />
      <p className="text-[12px] font-semibold text-gray-900 uppercase tracking-wider">{title}</p>
    </div>
    <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
      {children}
    </div>
  </div>
)

const FieldRow = ({ name, label, value, editing, draft, onChange, mono, highlight, wide, error }) => {
  const rule = name ? FIELD_RULES[name] : null
  const type = rule?.type ?? 'text'
  const inputMode = rule?.inputMode
  const maxLength = rule?.maxLength
  const hasError  = editing && !!error

  /* Show the count for numeric/limited-length fields (phone, account #, etc). */
  const showCounter = editing && maxLength != null && (inputMode === 'numeric' || maxLength <= 30)
  const length = String(draft ?? '').length

  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-[10.5px] text-tertiary uppercase tracking-wider mb-1 flex items-center justify-between">
        <span>{label}</span>
        {showCounter && (
          <span className={`text-[10px] tabular-nums ${length === maxLength ? 'text-warning' : 'text-tertiary'}`}>
            {length}/{maxLength}
          </span>
        )}
      </p>
      {editing ? (
        <>
          <input
            type={type}
            inputMode={inputMode}
            maxLength={maxLength}
            value={draft ?? ''}
            onChange={e => onChange(e.target.value)}
            className={`w-full text-[13px] text-gray-800 border rounded-lg px-3 py-1.5 outline-none transition-colors ${mono ? 'font-mono' : ''} ${
              hasError
                ? 'border-red-300 bg-red-50/40 focus:border-red-400'
                : 'border-gray-200 focus:border-blue-action'
            }`}
          />
          {hasError && (
            <p className="mt-1 text-[11px] text-error flex items-center gap-1">
              <TbAlertCircle style={{ fontSize: 11 }} /> {error}
            </p>
          )}
        </>
      ) : (
        <p className={`text-[13.5px] break-words ${highlight ? 'font-bold text-blue-action' : 'font-medium text-gray-900'} ${mono ? 'font-mono' : ''}`}>
          {value ?? '—'}
        </p>
      )}
    </div>
  )
}

const Legend = ({ color, dash, label }) => (
  <div className="flex items-center gap-1.5">
    <svg width="20" height="6"><line x1="1" y1="3" x2="19" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash ? '4 3' : undefined} strokeLinecap="round" /></svg>
    <span>{label}</span>
  </div>
)

const Th = ({ children, className = '' }) => (<th className={`px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider ${className}`}>{children}</th>)
const Td = ({ children, className = '' }) => (<td className={`px-3 py-2.5 ${className}`}>{children}</td>)

const FLOW_LABEL = {
  'personal-advisory': 'Personal Advisory',
  'business-advisory': 'Business Advisory',
}
const EngagementRow = ({ engagement, navigate }) => {
  const advisor = engagement.assignment?.advisor
  const queueId = engagement.queueItem?.id
  const clickable = !!queueId
  return (
    <tr
      onClick={() => clickable && navigate(`/underwriting/advisory/review/${queueId}`)}
      className={`border-t border-gray-100 transition-colors ${clickable ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
    >
      <Td className="font-mono text-[11.5px] text-tertiary">{engagement.id.slice(0, 8)}…</Td>
      <Td className="text-gray-900 font-medium">
        <TbReportMoney className="inline mr-1 text-secondary" style={{ fontSize: 13 }} /> {FLOW_LABEL[engagement.flowKey] ?? engagement.flowKey}
      </Td>
      <Td>
        {advisor ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[9.5px] font-semibold shrink-0">
              {advisor.initials ?? '?'}
            </div>
            <span className="text-gray-900 font-medium truncate">{advisor.name}</span>
          </div>
        ) : (
          <span className="text-tertiary">Unassigned</span>
        )}
      </Td>
      <Td><EngagementStatusPill status={engagement.status} /></Td>
      <Td className="text-secondary tabular-nums whitespace-nowrap">{fmtDate(engagement.submittedAt)}</Td>
      <Td className="text-right">{clickable && <TbArrowRight className="text-tertiary inline" style={{ fontSize: 14 }} />}</Td>
    </tr>
  )
}

const EngagementStatusPill = ({ status }) => {
  const cfg = {
    confirmed: { label: 'Confirmed', color: 'text-success',     bg: 'bg-green-50',  border: 'border-green-200' },
    proposed:  { label: 'Proposed',  color: 'text-warning',     bg: 'bg-orange-50', border: 'border-orange-200' },
    declined:  { label: 'Declined',  color: 'text-error',       bg: 'bg-red-50',    border: 'border-red-200' },
    pending:   { label: 'Pending',   color: 'text-blue-action', bg: 'bg-blue-50',   border: 'border-blue-200' },
  }[status] ?? { label: status, color: 'text-tertiary', bg: 'bg-gray-100', border: 'border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

const LoanStatusPill = ({ status }) => {
  const cfg = {
    approved:      { label: 'Approved',     color: 'text-success', bg: 'bg-green-50',  border: 'border-green-200' },
    auto_rejected: { label: 'Rejected',     color: 'text-error',   bg: 'bg-red-50',    border: 'border-red-200' },
    needs_review:  { label: 'Needs review', color: 'text-warning', bg: 'bg-orange-50', border: 'border-orange-200' },
    ai_reviewing:  { label: 'AI reviewing', color: 'text-blue-action', bg: 'bg-blue-50', border: 'border-blue-200' },
    submitted:     { label: 'Submitted',    color: 'text-tertiary', bg: 'bg-gray-100', border: 'border-gray-200' },
  }[status] ?? { label: status, color: 'text-tertiary', bg: 'bg-gray-100', border: 'border-gray-200' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      {cfg.label}
    </span>
  )
}

export default ClientDetailPage
