import { useEffect, useState } from 'react'
import {
  TbArrowLeft,
  TbArrowRight,
  TbAward,
  TbBriefcase,
  TbBuilding,
  TbCheck,
  TbCircleCheck,
  TbCircleX,
  TbEdit,
  TbLanguage,
  TbLoader2,
  TbSparkles,
  TbStar,
  TbTrash,
  TbUser,
  TbUsers,
  TbUserStar
} from 'react-icons/tb'
import { useNavigate, useParams } from 'react-router-dom'
import AdvisorHandoffDeleteModal from '../components/AdvisorHandoffDeleteModal'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import { api } from '../services/api'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

const FOCUS_OPTIONS = [
  { key: 'personal-advisory', label: 'Personal Advisory' },
  { key: 'business-advisory', label: 'Business Advisory' },
  { key: 'personal-loan',     label: 'Personal Loan' },
  { key: 'business-loan',     label: 'Business Loan' },
]

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

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

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

/* ── Page ────────────────────────────────────────────────────────────── */
const AdvisorDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [advisor, setAdvisor] = useState(null)
  const [error, setError]     = useState(null)

  /* Edit state */
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({})
  const [saving, setSaving]   = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = () => api.get(`/advisors/${id}`).then(a => { setAdvisor(a); setDraft(toDraft(a)) }).catch(e => setError(e.message))
  useEffect(() => { load() }, [id])

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100"><TbMenu2 style={{ fontSize: 20 }} /></button>
          <span className="text-[14px] font-semibold text-navy">Advisor</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && <div className="px-8 py-6"><Banner kind="error" text={error} /></div>}
          {!advisor && !error && (
            <div className="flex items-center justify-center py-20 text-tertiary">
              <TbLoader2 className="animate-spin mr-2" style={{ fontSize: 18 }} /> Loading advisor…
            </div>
          )}
          {advisor && (
            <Body
              advisor={advisor}
              navigate={navigate}
              editing={editing}
              draft={draft}
              setDraft={setDraft}
              saving={saving}
              onEdit={() => { setDraft(toDraft(advisor)); setEditing(true) }}
              onCancel={() => { setDraft(toDraft(advisor)); setEditing(false) }}
              onSave={async () => {
                setSaving(true)
                try {
                  await api.patch(`/advisors/${advisor.id}`, normalize(draft))
                  await load()
                  setEditing(false)
                } catch (e) { setError(e.message) }
                finally { setSaving(false) }
              }}
              onDelete={() => setDeleteOpen(true)}
            />
          )}
        </div>
      </div>

      <AdvisorHandoffDeleteModal
        open={deleteOpen}
        advisor={advisor}
        onClose={() => setDeleteOpen(false)}
        onDone={() => {
          setDeleteOpen(false)
          navigate('/underwriting/advisors')
        }}
      />
    </div>
  )
}

const toDraft = (a) => ({
  name: a.name ?? '',
  title: a.title ?? '',
  specialty: a.specialty ?? '',
  bio: a.bio ?? '',
  yearsExperience: a.yearsExperience ?? 0,
  clientLoad: a.clientLoad ?? 0,
  credentials: (a.credentials ?? []).join(', '),
  languages:   (a.languages ?? []).join(', '),
  focus:       a.focus ?? [],
})

const normalize = (d) => ({
  name: d.name.trim(),
  title: d.title.trim(),
  specialty: d.specialty.trim(),
  bio: d.bio.trim(),
  yearsExperience: Number(d.yearsExperience) || 0,
  clientLoad:      Number(d.clientLoad) || 0,
  credentials: d.credentials.split(',').map(s => s.trim()).filter(Boolean),
  languages:   d.languages.split(',').map(s => s.trim()).filter(Boolean),
  focus: d.focus,
})

/* ── Body ────────────────────────────────────────────────────────────── */
const Body = ({ advisor, navigate, editing, draft, setDraft, saving, onEdit, onCancel, onSave, onDelete }) => {
  const p = advisor.performance ?? {}
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const toggleFocus = (k) => setDraft(d => ({
    ...d, focus: d.focus.includes(k) ? d.focus.filter(x => x !== k) : [...d.focus, k]
  }))

  const caseloadCapacity = 40
  const loadColor = advisor.clientLoad >= 35 ? C.critical
                  : advisor.clientLoad >= 25 ? C.warning
                  :                            C.success

  return (
    <div className="px-4 sm:px-8 py-5 sm:py-6 max-w-[1400px] mx-auto">
      {/* Back + Edit toggle */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button onClick={() => navigate('/underwriting/advisors')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-secondary bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0">
          <TbArrowLeft style={{ fontSize: 14 }} />
        </button>
        {!editing ? (
          <div className="flex items-center gap-2">
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[12.5px] font-medium text-error bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors">
              <TbTrash style={{ fontSize: 14 }} /> <span className="hidden sm:inline">Delete advisor</span><span className="sm:hidden">Delete</span>
            </button>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[12.5px] font-medium text-blue-action bg-white border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors">
              <TbEdit style={{ fontSize: 14 }} /> <span className="hidden sm:inline">Edit profile</span><span className="sm:hidden">Edit</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={onCancel} disabled={saving}
              className="px-3.5 py-1.5 text-[12.5px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button onClick={onSave} disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-white bg-navy rounded-lg hover:opacity-90 disabled:opacity-40">
              {saving ? <><TbLoader2 className="animate-spin" style={{ fontSize: 13 }} /> Saving…</> : <><TbCheck style={{ fontSize: 13 }} /> Save changes</>}
            </button>
          </div>
        )}
      </div>

      {/* Hero card with gradient */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-200 mb-5">
        <div className="px-4 sm:px-7 py-5 sm:py-7 bg-gradient-to-r from-[#1D3557] via-[#1f3d63] to-[#2a4a7a] text-white relative">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-[18px] sm:text-[22px] font-semibold shrink-0">
              {advisor.initials}
            </div>
            <div className="min-w-0 flex-1">
              {editing ? (
                <>
                  <input
                    value={draft.name}
                    onChange={e => set('name', e.target.value)}
                    className="block w-full max-w-[420px] text-[24px] font-semibold bg-white/15 placeholder-white/40 text-white border border-white/30 rounded-md px-2 py-0.5 outline-none focus:border-white/70"
                  />
                  <input
                    value={draft.title}
                    onChange={e => set('title', e.target.value)}
                    className="block w-full max-w-[420px] mt-2 text-[13px] bg-white/10 text-white/90 placeholder-white/40 border border-white/20 rounded-md px-2 py-0.5 outline-none focus:border-white/60"
                  />
                </>
              ) : (
                <>
                  <h1 className="text-[20px] sm:text-[26px] font-semibold leading-tight break-words">{advisor.name}</h1>
                  <p className="text-[13.5px] text-white/80 mt-1">{advisor.title}</p>
                </>
              )}
              <p className="text-[11px] text-white/60 mt-1 font-mono">{advisor.id}</p>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {editing ? (
                  <input
                    value={draft.specialty}
                    onChange={e => set('specialty', e.target.value)}
                    placeholder="Specialty"
                    className="text-[12.5px] bg-white/15 text-white placeholder-white/40 border border-white/30 rounded-full px-3 py-1 outline-none focus:border-white/70"
                  />
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-[12.5px] font-medium">
                    <TbStar style={{ fontSize: 12 }} /> {advisor.specialty}
                  </span>
                )}
                {advisor.languages?.length > 0 && !editing && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/85">
                    <TbLanguage style={{ fontSize: 12 }} /> {advisor.languages.join(' · ')}
                  </span>
                )}
              </div>
            </div>

            {/* Hero right — clean stat tiles (no awkward empty rings) */}
            {!editing && (
              <div className="hidden md:flex items-stretch gap-0 shrink-0 rounded-xl overflow-hidden border border-white/15 bg-white/5 backdrop-blur-sm">
                <HeroStat value={advisor.clientLoad} label="CASELOAD" />
                <HeroStat
                  value={p.confirmationRate != null ? `${Math.round(p.confirmationRate * 100)}%` : '—'}
                  label="CONFIRM RATE"
                  divider
                />
                <HeroStat
                  value={p.avgCompletenessScore != null ? p.avgCompletenessScore : '—'}
                  label="AVG SCORE"
                  divider
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="TOTAL ASSIGNMENTS" value={p.totalAssignments ?? 0} sub="all AI matches" accent={C.primary} icon={TbUsers} />
        <KpiCard label="CONFIRMED" value={p.confirmed ?? 0} sub="active engagements" accent={C.success} icon={TbCircleCheck} />
        <KpiCard label="PROPOSED" value={p.proposed ?? 0} sub="awaiting officer" accent={C.warning} icon={TbSparkles} />
        <KpiCard label="DECLINED" value={p.declined ?? 0} sub="closed engagements" accent={C.critical} icon={TbCircleX} />
      </div>

      {/* Caseload utilisation */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Caseload utilisation</p>
            <p className="text-[11.5px] text-tertiary mt-0.5">Active clients vs target capacity ({caseloadCapacity})</p>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ color: loadColor, background: loadColor + '15' }}>
            {advisor.clientLoad >= 35 ? 'Heavy' : advisor.clientLoad >= 25 ? 'Moderate' : 'Light'}
          </span>
        </div>
        <div className="h-8 bg-gray-100 rounded-full overflow-hidden relative">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${Math.max(2, Math.min(advisor.clientLoad / caseloadCapacity * 100, 100))}%`, background: `linear-gradient(90deg, ${loadColor}cc, ${loadColor})` }} />
          <span className="absolute inset-0 flex items-center justify-center text-[12.5px] font-semibold text-gray-700">
            {advisor.clientLoad} / {caseloadCapacity}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
          <Marker label="Light" value="< 25" color={C.success} active={loadColor === C.success} />
          <Marker label="Moderate" value="25 – 34" color={C.warning} active={loadColor === C.warning} />
          <Marker label="Heavy" value="≥ 35" color={C.critical} active={loadColor === C.critical} />
        </div>
      </div>

      {/* Editable profile */}
      <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Profile</p>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Years of experience" icon={TbBriefcase}>
            {editing
              ? <NumInput value={draft.yearsExperience} onChange={v => set('yearsExperience', v)} />
              : <Display value={`${advisor.yearsExperience} years`} />}
          </Field>
          <Field label="Caseload" icon={TbUsers}>
            {editing
              ? <NumInput value={draft.clientLoad} onChange={v => set('clientLoad', v)} />
              : <Display value={advisor.clientLoad} />}
          </Field>
          <Field label="Credentials" icon={TbAward} wide>
            {editing
              ? <TextInput value={draft.credentials} onChange={v => set('credentials', v)} placeholder="CFP, CFA, MBA" />
              : (
                <div className="flex flex-wrap gap-1.5">
                  {(advisor.credentials ?? []).length === 0
                    ? <Display value="—" />
                    : advisor.credentials.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-gray-100 text-gray-700 border border-gray-200">{c}</span>
                      ))}
                </div>
              )}
          </Field>
          <Field label="Languages" icon={TbLanguage} wide>
            {editing
              ? <TextInput value={draft.languages} onChange={v => set('languages', v)} placeholder="English, Mandarin" />
              : <Display value={(advisor.languages ?? []).join(' · ') || '—'} />}
          </Field>
          <Field label="Focus areas" icon={TbSparkles} wide>
            {editing
              ? (
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_OPTIONS.map(f => {
                    const active = draft.focus.includes(f.key)
                    return (
                      <button key={f.key} type="button" onClick={() => toggleFocus(f.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12.5px] font-medium transition-colors ${
                          active ? 'border-blue-action bg-blue-50 text-blue-action' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${active ? 'bg-blue-action border-blue-action' : 'border-gray-300'}`}>
                          {active && <TbCheck className="text-white" style={{ fontSize: 11 }} />}
                        </span>
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              )
              : (
                <div className="flex flex-wrap gap-1.5">
                  {(advisor.focus ?? []).length === 0
                    ? <Display value="—" />
                    : advisor.focus.map(f => (
                        <span key={f} className="px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-action border border-blue-100">
                          {FOCUS_OPTIONS.find(o => o.key === f)?.label ?? f}
                        </span>
                      ))}
                </div>
              )}
          </Field>
          <Field label="Bio" icon={TbUserStar} wide>
            {editing
              ? <textarea value={draft.bio} onChange={e => set('bio', e.target.value)} rows={4}
                  className="w-full text-[13px] text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action resize-none" />
              : <p className="text-[13px] text-secondary leading-relaxed">{advisor.bio || '—'}</p>}
          </Field>
        </div>
      </div>

      {/* Assigned clients */}
      <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">Assigned clients</p>
      {advisor.assignments.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-12 text-center">
          <TbUsers className="mx-auto text-tertiary" style={{ fontSize: 32 }} />
          <p className="text-[13px] text-gray-700 font-medium mt-2">No clients assigned yet</p>
          <p className="text-[11.5px] text-tertiary mt-1">The AI hasn't matched any clients to this advisor yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-[12.5px] min-w-[640px]">
            <thead className="bg-gray-50 text-secondary">
              <tr>
                <Th>Client</Th>
                <Th>Flow</Th>
                <Th>Status</Th>
                <Th className="text-right">Score</Th>
                <Th>Assigned</Th>
                <Th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {advisor.assignments.map(a => <AssignmentRow key={a.id} assignment={a} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Atoms ───────────────────────────────────────────────────────────── */

/* Clean stat tile for the hero strip — no ring, no awkward empty state.
   Just a value + label, with optional left divider when stacked. */
const HeroStat = ({ value, label, divider }) => (
  <div className={`px-5 py-3 text-center ${divider ? 'border-l border-white/15' : ''}`}>
    <p className="text-[22px] font-bold text-white leading-none">{value}</p>
    <p className="text-[9.5px] font-semibold uppercase tracking-widest text-white/65 mt-2">{label}</p>
  </div>
)

const HeroRing = ({ pct, color, value, sub }) => (
  <div style={{ width: 76, height: 76, position: 'relative' }}>
    <svg width="76" height="76">
      <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
      <circle cx="38" cy="38" r="32" fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${Math.min(Math.max(pct, 0), 1) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
        strokeLinecap="round" transform="rotate(-90 38 38)" />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-[15px] font-bold leading-none">{value}</span>
      <span className="text-[8.5px] uppercase tracking-widest text-white/70 mt-1">{sub}</span>
    </div>
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

const Marker = ({ label, value, color, active }) => (
  <div className={`px-3 py-2 rounded-lg ${active ? 'border-2' : 'border'}`} style={{ borderColor: active ? color : '#E5E7EB', background: active ? `${color}10` : 'transparent' }}>
    <p className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: active ? color : '#9CA3AF' }}>{label}</p>
    <p className="text-[13px] font-bold text-gray-900 mt-0.5">{value}</p>
  </div>
)

const Field = ({ label, icon: Icon, wide, children }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <p className="text-[10.5px] font-semibold text-tertiary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon style={{ fontSize: 12 }} />}
      {label}
    </p>
    {children}
  </div>
)

const Display = ({ value }) => (
  <p className="text-[13.5px] font-medium text-gray-900">{value}</p>
)

const TextInput = ({ value, onChange, placeholder }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action" />
)

const NumInput = ({ value, onChange }) => (
  <input type="number" value={value} onChange={e => onChange(e.target.value)}
    className="w-32 text-[13px] text-gray-800 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action" />
)

const Banner = ({ kind, text }) => (
  <div className={`rounded-lg px-4 py-3 text-[13px] border ${kind === 'error' ? 'bg-red-50 border-red-200 text-error' : 'bg-blue-50 border-blue-200 text-blue-action'}`}>{text}</div>
)

const AssignmentRow = ({ assignment }) => {
  const navigate = useNavigate()
  const e = assignment.engagement
  if (!e) return null

  const statusStyle = {
    proposed:  { label: 'Proposed',  bg: 'bg-orange-50', text: 'text-warning',  border: 'border-orange-200' },
    confirmed: { label: 'Confirmed', bg: 'bg-green-50',  text: 'text-success',  border: 'border-green-200'  },
    declined:  { label: 'Declined',  bg: 'bg-red-50',    text: 'text-error',    border: 'border-red-200'   },
  }[assignment.status] ?? { label: assignment.status, bg: 'bg-gray-100', text: 'text-tertiary', border: 'border-gray-200' }

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => navigate(`/underwriting/team/${e.client?.id}`)}>
      <Td>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-full ${e.client?.type === 'business' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-action'} flex items-center justify-center shrink-0`}>
            {e.client?.type === 'business' ? <TbBuilding style={{ fontSize: 13 }} /> : <TbUser style={{ fontSize: 13 }} />}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{e.client?.name ?? '—'}</p>
            <p className="text-[10.5px] text-tertiary truncate">{e.client?.id}{e.client?.company ? ` · ${e.client.company}` : ''}</p>
          </div>
        </div>
      </Td>
      <Td className="text-secondary">{FOCUS_OPTIONS.find(o => o.key === e.flowKey)?.label ?? e.flowKey}</Td>
      <Td>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
          {statusStyle.label}
        </span>
      </Td>
      <Td className="text-right">
        {e.completenessScore != null ? <ScorePill score={e.completenessScore} /> : '—'}
      </Td>
      <Td className="text-secondary tabular-nums whitespace-nowrap">{fmtDate(assignment.assignedAt)}</Td>
      <Td className="text-right"><TbArrowRight className="text-tertiary inline" style={{ fontSize: 14 }} /></Td>
    </tr>
  )
}

const ScorePill = ({ score }) => {
  const color = score >= 80 ? C.success : score >= 60 ? C.warning : C.critical
  const bg    = score >= 80 ? 'bg-green-50' : score >= 60 ? 'bg-orange-50' : 'bg-red-50'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg}`} style={{ color }}>
      {score}
    </span>
  )
}

const Th = ({ children, className = '' }) => (<th className={`px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wider ${className}`}>{children}</th>)
const Td = ({ children, className = '' }) => (<td className={`px-3 py-2.5 ${className}`}>{children}</td>)

export default AdvisorDetailPage
