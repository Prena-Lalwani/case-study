import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  TbArrowLeft,
  TbArrowRight,
  TbBuilding,
  TbCash,
  TbCheck,
  TbEdit,
  TbFileText,
  TbId,
  TbLoader2,
  TbMail,
  TbPhone,
  TbReportMoney,
  TbUser,
  TbWallet,
} from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
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
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
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
  const PAD = { t: 12, r: 16, b: 28, l: 52 }
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
    <div style={{ height: 220 }} ref={ref}>
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
        {months.map((m, i) => (
          <text key={i} x={xOf(i)} y={h - 6} textAnchor="middle" fontSize="11" fill={C.muted}>{m.month}</text>
        ))}
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
              onEdit={() => { setDraft(toDraft(client)); setEditing(true) }}
              onCancel={() => { setDraft(toDraft(client)); setEditing(false) }}
              onSave={async () => {
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
const Body = ({ client, navigate, editing, draft, setDraft, saving, onEdit, onCancel, onSave }) => {
  const isBusiness = client.type === 'business'
  const st = STATUS_STYLE[client.status] ?? STATUS_STYLE.pending
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

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
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* Back + Edit */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/underwriting/team')}
          className="flex items-center gap-1.5 text-[12.5px] text-secondary hover:text-gray-800">
          <TbArrowLeft style={{ fontSize: 14 }} /> All clients
        </button>
        {!editing ? (
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-medium text-blue-action bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
            <TbEdit style={{ fontSize: 14 }} /> Edit profile
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onCancel} disabled={saving}
              className="px-3.5 py-1.5 text-[12.5px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-40">
              {saving ? <><TbLoader2 className="animate-spin" style={{ fontSize: 13 }} /> Saving…</> : <><TbCheck style={{ fontSize: 13 }} /> Save changes</>}
            </button>
          </div>
        )}
      </div>

      {/* Hero with gradient */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-5">
        <div className="px-7 py-7 bg-gradient-to-r from-[#1D3557] via-[#1f3d63] to-[#2a4a7a] text-white">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[20px] font-semibold shrink-0">
              {initialsOf(client.name)}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <input value={draft.name} onChange={e => set('name', e.target.value)}
                  className="block w-full max-w-[420px] text-[24px] font-semibold bg-white/15 text-white border border-white/30 rounded-md px-2 py-0.5 outline-none focus:border-white/70" />
              ) : (
                <h1 className="text-[26px] font-semibold leading-tight">{client.name}</h1>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 text-[13px] text-white/80">
                {isBusiness ? <TbBuilding style={{ fontSize: 14 }} /> : <TbUser style={{ fontSize: 14 }} />}
                {isBusiness ? 'Business' : 'Individual'}
                {(client.company || editing) && (
                  <>
                    <span className="text-white/40">·</span>
                    {editing ? (
                      <input value={draft.company} onChange={e => set('company', e.target.value)} placeholder="Company"
                        className="bg-white/10 text-white placeholder-white/40 border border-white/20 rounded px-2 py-0 text-[13px] outline-none focus:border-white/60" />
                    ) : (
                      client.company
                    )}
                  </>
                )}
              </div>
              <p className="text-[11px] text-white/60 mt-1 font-mono">{client.id}</p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[12.5px] font-medium`}>
                  {st.label}
                </span>
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

            {/* Hero right — 3 financial rings */}
            <div className="flex items-center gap-4 shrink-0">
              <HeroRing
                pct={gross > 0 ? Math.min(gross / (isBusiness ? 500_000 : 20_000), 1) : 0}
                color="#86EFAC"
                value={'$' + fmtK(gross)}
                sub={isBusiness ? 'Revenue/mo' : 'Income/mo'}
              />
              <HeroRing
                pct={balance > 0 ? Math.min(balance / (isBusiness ? 1_000_000 : 50_000), 1) : 0}
                color="#FCD34D"
                value={'$' + fmtK(balance)}
                sub="Balance"
              />
              {credit > 0 && (
                <HeroRing
                  pct={(credit - 300) / 550}
                  color={credit >= 740 ? '#86EFAC' : credit >= 670 ? '#FCD34D' : '#FCA5A5'}
                  value={credit}
                  sub="Credit"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <KpiCard label="LOAN APPS" value={apps.length} sub={`${apps.filter(a => a.status === 'approved').length} approved`} accent={C.primary} icon={TbCash} />
        <KpiCard label="ADVISORY" value={engagements.length} sub={`${engagements.filter(e => e.status === 'confirmed').length} confirmed`} accent={C.success} icon={TbReportMoney} />
        <KpiCard label="APPROVED" value={fmt$(totalApproved)} sub="loan history" accent="#8B5CF6" icon={TbCash} />
        <KpiCard label="DOCUMENTS" value={documents.length} sub="on file" accent={C.warning} icon={TbFileText} />
      </div>

      {/* Banking chart + savings donut */}
      {months.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
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
      <div className="grid grid-cols-2 gap-4">
        <Section title="Identity" icon={TbId}>
          <FieldRow label="Email"        value={client.email}        editing={editing} draft={draft.email}        onChange={v => set('email', v)} />
          <FieldRow label="Phone"        value={client.phone}        editing={editing} draft={draft.phone}        onChange={v => set('phone', v)} />
          <FieldRow label="Date of birth" value={client.dateOfBirth} editing={editing} draft={draft.dateOfBirth} onChange={v => set('dateOfBirth', v)} type="date" />
          <FieldRow label="ID number"    value={client.idNumber}     editing={editing} draft={draft.idNumber}     onChange={v => set('idNumber', v)} mono />
          <FieldRow label="Nationality"  value={client.nationality}  editing={editing} draft={draft.nationality}  onChange={v => set('nationality', v)} />
          <FieldRow label="Location"     value={client.location}     editing={editing} draft={draft.location}     onChange={v => set('location', v)} />
          <FieldRow label="Address"      value={client.address}      editing={editing} draft={draft.address}      onChange={v => set('address', v)} wide />
        </Section>

        <Section title={isBusiness ? 'Business operations' : 'Employment & finances'} icon={TbReportMoney}>
          <FieldRow label={isBusiness ? 'Operating entity' : 'Employer'} value={client.employer} editing={editing} draft={draft.employer} onChange={v => set('employer', v)} />
          <FieldRow label={isBusiness ? 'Sector' : 'Job title'}          value={client.jobTitle} editing={editing} draft={draft.jobTitle} onChange={v => set('jobTitle', v)} />
          <FieldRow label={isBusiness ? 'Monthly revenue' : 'Monthly gross'} value={fmt$(client.monthlyGross)} editing={editing} draft={draft.monthlyGross} onChange={v => set('monthlyGross', v)} type="number" />
          <FieldRow label="Monthly net"   value={fmt$(client.monthlyNet)} editing={editing} draft={draft.monthlyNet} onChange={v => set('monthlyNet', v)} type="number" />
          <FieldRow label={isBusiness ? 'Years in business' : 'Years employed'} value={client.yearsEmployed} editing={editing} draft={draft.yearsEmployed} onChange={v => set('yearsEmployed', v)} type="number" />
          <FieldRow label="Credit score"  value={client.creditScore || '—'} editing={editing} draft={draft.creditScore} onChange={v => set('creditScore', v)} type="number" />
        </Section>
      </div>

      {/* Banking details */}
      <div className="mt-4">
        <Section title="Banking details" icon={TbWallet}>
          <FieldRow label="Bank"             value={client.bankName}        editing={editing} draft={draft.bankName}        onChange={v => set('bankName', v)} />
          <FieldRow label="Account holder"   value={client.accountHolder}   editing={editing} draft={draft.accountHolder}   onChange={v => set('accountHolder', v)} />
          <FieldRow label="Account number"   value={client.accountNumber}   editing={editing} draft={draft.accountNumber}   onChange={v => set('accountNumber', v)} mono />
          <FieldRow label="Statement period" value={client.statementPeriod} editing={editing} draft={draft.statementPeriod} onChange={v => set('statementPeriod', v)} />
          <FieldRow label="Avg credit / mo"   value={fmt$(client.averageMonthlyCredit)}  editing={editing} draft={draft.averageMonthlyCredit}  onChange={v => set('averageMonthlyCredit', v)} type="number" />
          <FieldRow label="Avg debit / mo"    value={fmt$(client.averageMonthlyDebit)}   editing={editing} draft={draft.averageMonthlyDebit}   onChange={v => set('averageMonthlyDebit', v)} type="number" />
          <FieldRow label="Avg balance"       value={fmt$(client.averageClosingBalance)} editing={editing} draft={draft.averageClosingBalance} onChange={v => set('averageClosingBalance', v)} type="number" highlight />
        </Section>
      </div>

      {/* Loan applications */}
      {apps.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Loan applications</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-[12.5px]">
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

      {/* Documents */}
      {documents.length > 0 && (
        <div className="mt-5">
          <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Documents on file</p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-2">
            {documents.map(d => (
              <span key={d.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-50 border border-gray-200 text-[12px] text-gray-700">
                <TbFileText style={{ fontSize: 13 }} className="text-tertiary" />
                <span className="font-medium">{d.docType}</span>
                {d.aiConfidence && <span className="text-tertiary">· {d.aiConfidence}%</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Atoms ───────────────────────────────────────────────────────────── */

const HeroRing = ({ pct, color, value, sub }) => (
  <div style={{ width: 76, height: 76, position: 'relative' }}>
    <svg width="76" height="76">
      <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
      <circle cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${Math.min(Math.max(pct, 0), 1) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
        strokeLinecap="round" transform="rotate(-90 38 38)" />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-[13px] font-bold leading-none">{value}</span>
      <span className="text-[8.5px] uppercase tracking-widest text-white/70 mt-1">{sub}</span>
    </div>
  </div>
)

const KpiCard = ({ label, value, sub, accent, icon: Icon }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
    <div className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-10" style={{ background: accent }} />
    <div className="relative flex items-start justify-between">
      <p className="text-[10.5px] font-semibold text-secondary uppercase tracking-widest">{label}</p>
      <Icon style={{ fontSize: 14, color: accent }} />
    </div>
    <p className="text-[26px] font-bold text-gray-900 leading-none mt-2 relative">{value}</p>
    <p className="text-[11px] text-tertiary mt-2 relative">{sub}</p>
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

const FieldRow = ({ label, value, editing, draft, onChange, type = 'text', mono, highlight, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <p className="text-[10.5px] text-tertiary uppercase tracking-wider mb-1">{label}</p>
    {editing ? (
      <input
        type={type}
        value={draft ?? ''}
        onChange={e => onChange(e.target.value)}
        className={`w-full text-[13px] text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-action ${mono ? 'font-mono' : ''}`}
      />
    ) : (
      <p className={`text-[13.5px] break-words ${highlight ? 'font-bold text-blue-action' : 'font-medium text-gray-900'} ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    )}
  </div>
)

const Legend = ({ color, dash, label }) => (
  <div className="flex items-center gap-1.5">
    <svg width="20" height="6"><line x1="1" y1="3" x2="19" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash ? '4 3' : undefined} strokeLinecap="round" /></svg>
    <span>{label}</span>
  </div>
)

const Th = ({ children, className = '' }) => (<th className={`px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider ${className}`}>{children}</th>)
const Td = ({ children, className = '' }) => (<td className={`px-3 py-2.5 ${className}`}>{children}</td>)

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
