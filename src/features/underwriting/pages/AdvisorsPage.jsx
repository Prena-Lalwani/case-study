import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TbAward,
  TbBriefcase,
  TbEdit,
  TbLanguage,
  TbPlus,
  TbSearch,
  TbStar,
  TbTrash,
  TbUserStar,
  TbUsers,
} from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import AdvisorFormModal from '../components/AdvisorFormModal'
import ContextChat from '../chat/ContextChat'
import { ADVISORS_PROMPT } from '../chat/chatPrompts'
import { createAdvisor, deleteAdvisor, updateAdvisor } from '../data/advisorStore'
import { useAdvisors } from '../hooks/useAdvisors'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

const FOCUS_LABEL = {
  'personal-advisory': 'Personal Advisory',
  'business-advisory': 'Business Advisory',
  'personal-loan':     'Personal Loan',
  'business-loan':     'Business Loan',
}

const FILTERS = [
  { key: 'all',                label: 'All advisors' },
  { key: 'personal-advisory',  label: 'Personal Advisory' },
  { key: 'business-advisory',  label: 'Business Advisory' },
  { key: 'personal-loan',      label: 'Personal Loan' },
  { key: 'business-loan',      label: 'Business Loan' },
]

const AdvisorsPage = () => {
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [filter, setFilter]           = useState('all')
  const [query, setQuery]             = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState(null)

  const advisors = useAdvisors()

  const stats = useMemo(() => {
    if (advisors.length === 0) return { total: 0, avgLoad: 0, avgYears: 0, languages: 0 }
    const totalLoad = advisors.reduce((s, a) => s + a.clientLoad, 0)
    return {
      total:     advisors.length,
      avgLoad:   Math.round(totalLoad / advisors.length),
      avgYears:  Math.round(advisors.reduce((s, a) => s + a.yearsExperience, 0) / advisors.length),
      languages: new Set(advisors.flatMap(a => a.languages ?? [])).size,
    }
  }, [advisors])

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit   = (advisor) => { setEditTarget(advisor); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const handleSave = (payload) => {
    if (editTarget) {
      updateAdvisor(editTarget.id, payload)
    } else {
      createAdvisor(payload)
    }
    closeModal()
  }

  const handleDelete = (advisor) => {
    if (!confirm(`Remove ${advisor.name} from the advisor pool?\n\nThis cannot be undone — existing assignments stay intact, but the AI won't pick this advisor for new clients.`)) return
    deleteAdvisor(advisor.id)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return advisors
      .filter(a => filter === 'all' || (a.focus ?? []).includes(filter))
      .filter(a => {
        if (!q) return true
        return (
          a.name.toLowerCase().includes(q) ||
          a.specialty.toLowerCase().includes(q) ||
          (a.credentials ?? []).some(c => c.toLowerCase().includes(q)) ||
          (a.languages ?? []).some(l => l.toLowerCase().includes(q))
        )
      })
  }, [advisors, filter, query])

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span className="text-[14px] font-semibold text-navy">Advisors</span>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-gray-900 leading-tight">Advisors</h1>
              <p className="text-[13px] text-secondary mt-1">
                {stats.total} advisors across personal & business engagements — AI assigns the best fit at intake.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity"
            >
              <TbPlus style={{ fontSize: 15 }} />
              Add advisor
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <StatCard label="TOTAL ADVISORS" value={stats.total}     sub="active on the bench" bar="bg-navy" />
            <StatCard label="AVG CASELOAD"   value={stats.avgLoad}   sub="clients per advisor" bar="bg-blue-action" />
            <StatCard label="AVG EXPERIENCE" value={`${stats.avgYears} yr`} sub="years in practice" bar="bg-success" />
            <StatCard label="LANGUAGES"      value={stats.languages} sub="spoken across team" bar="bg-warning" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-5">

          {/* Filter + search */}
          <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
            <div className="flex items-center border-b border-gray-200 -mb-px">
              {FILTERS.map(({ key, label }) => {
                const isActive = filter === key
                const count = key === 'all' ? advisors.length : advisors.filter(a => (a.focus ?? []).includes(key)).length
                return (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-blue-action text-blue-action'
                        : 'border-transparent text-secondary hover:text-gray-800'
                    }`}
                  >
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

            <div className="relative">
              <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" style={{ fontSize: 15 }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, specialty, credential…"
                className="w-[320px] text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-action transition-colors"
              />
            </div>
          </div>

          {/* Grid */}
          {filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filtered.map(a => (
                <AdvisorCard
                  key={a.id}
                  advisor={a}
                  onEdit={() => openEdit(a)}
                  onDelete={() => handleDelete(a)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ContextChat
        storageKey="chat:advisors"
        contextLabel="the advisor pool"
        contextData={{ advisors }}
        systemPrompt={ADVISORS_PROMPT}
        suggestions={[
          'Who has the lightest caseload right now?',
          'Best-fit advisor for a small business succession case?',
          'Which specialties are underrepresented?',
          'Who should I assign new estate-planning clients to?',
        ]}
      />

      <AdvisorFormModal
        open={modalOpen}
        mode={editTarget ? 'edit' : 'create'}
        advisor={editTarget}
        onClose={closeModal}
        onSave={handleSave}
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

/* ── Advisor card ────────────────────────────────────────────────────── */
const AdvisorCard = ({ advisor, onEdit, onDelete }) => {
  const navigate = useNavigate()
  const loadLevel = advisor.clientLoad >= 35 ? 'high' : advisor.clientLoad >= 25 ? 'medium' : 'low'
  const loadStyle = {
    low:    { color: 'text-success',     bg: 'bg-green-50',  label: 'Light load' },
    medium: { color: 'text-warning',     bg: 'bg-orange-50', label: 'Moderate load' },
    high:   { color: 'text-error',       bg: 'bg-red-50',    label: 'Heavy load' },
  }[loadLevel]

  return (
    <div
      onClick={() => navigate(`/underwriting/advisors/${advisor.id}`)}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-action/40 transition-all flex flex-col gap-4 relative cursor-pointer"
    >
      {/* Edit / Delete — visible on card hover. stopPropagation so the card click doesn't fire. */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          title="Edit advisor"
          className="p-1.5 rounded-md bg-white border border-gray-200 text-secondary hover:text-blue-action hover:border-blue-action transition-colors shadow-sm"
        >
          <TbEdit style={{ fontSize: 14 }} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="Remove advisor"
          className="p-1.5 rounded-md bg-white border border-gray-200 text-secondary hover:text-error hover:border-error transition-colors shadow-sm"
        >
          <TbTrash style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-[14px] font-semibold shrink-0">
            {advisor.initials}
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-gray-900 leading-tight truncate">{advisor.name}</p>
            <p className="text-[12px] text-secondary mt-0.5 leading-tight truncate">{advisor.title}</p>
            <p className="text-[10.5px] text-tertiary mt-1 font-mono">{advisor.id}</p>
          </div>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10.5px] font-semibold ${loadStyle.bg} ${loadStyle.color} shrink-0`}>
          <span className={`w-1.5 h-1.5 rounded-full ${loadStyle.color.replace('text-', 'bg-')}`} />
          {loadStyle.label}
        </span>
      </div>

      {/* Specialty */}
      <div className="flex items-start gap-2">
        <TbStar className="text-warning shrink-0 mt-[2px]" style={{ fontSize: 14 }} />
        <p className="text-[13px] font-medium text-gray-900 leading-snug">{advisor.specialty}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100">
        <Mini icon={TbBriefcase} label="Experience" value={`${advisor.yearsExperience} yr`} />
        <Mini icon={TbUsers}     label="Caseload"   value={advisor.clientLoad} />
        <Mini icon={TbAward}     label="Credentials" value={(advisor.credentials ?? []).join(' · ') || '—'} />
      </div>

      {/* Languages */}
      {advisor.languages?.length > 0 && (
        <div className="flex items-center gap-2">
          <TbLanguage className="text-tertiary" style={{ fontSize: 13 }} />
          <span className="text-[11.5px] text-secondary">{advisor.languages.join(' · ')}</span>
        </div>
      )}

      {/* Bio */}
      <p className="text-[12.5px] text-secondary leading-relaxed">{advisor.bio}</p>

      {/* Focus chips */}
      {advisor.focus?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          {advisor.focus.map(f => (
            <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-action border border-blue-100">
              {FOCUS_LABEL[f] ?? f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const Mini = ({ icon: Icon, label, value }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1 text-tertiary">
      <Icon style={{ fontSize: 11 }} />
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-[13px] font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
  </div>
)

const EmptyState = () => (
  <div className="bg-white border border-dashed border-gray-300 rounded-xl py-16 text-center">
    <TbUserStar className="mx-auto text-tertiary" style={{ fontSize: 32 }} />
    <p className="text-[14px] text-gray-700 font-medium mt-3">No advisors match your filters</p>
    <p className="text-[12.5px] text-tertiary mt-1">Try a different focus area or clear the search.</p>
  </div>
)

export default AdvisorsPage
