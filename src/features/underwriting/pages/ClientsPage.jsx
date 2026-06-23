import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TbAdjustments,
  TbBuilding,
  TbCheck,
  TbDotsVertical,
  TbDownload,
  TbPlus,
  TbSearch,
  TbUser,
} from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import AddClientModal from '../components/AddClientModal'
import ContextChat from '../chat/ContextChat'
import { CLIENTS_PROMPT } from '../chat/chatPrompts'
import { enqueue } from '../services/clientQueueStore'
import { refreshClients, useClients } from '../hooks/useClients'

const CURRENT_USER = {
  name:     'Marcus Webb',
  role:     'Senior Credit Analyst',
  initials: 'MW',
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
const initialsOf = name => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const fmtMoney = n => {
  if (n === 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

const fmtDate = iso => new Date(iso).toLocaleDateString('en-US', {
  day: 'numeric', month: 'short', year: 'numeric',
})

const STATUS_STYLES = {
  active:   { label: 'Active',   dot: 'bg-success', text: 'text-success', bg: 'bg-green-50',  border: 'border-green-200' },
  pending:  { label: 'Pending',  dot: 'bg-warning', text: 'text-warning', bg: 'bg-orange-50', border: 'border-orange-200' },
  inactive: { label: 'Inactive', dot: 'bg-gray-400', text: 'text-tertiary', bg: 'bg-gray-100', border: 'border-gray-200' },
}

const FILTERS = [
  { key: 'all',      label: 'All clients' },
  { key: 'active',   label: 'Active'      },
  { key: 'pending',  label: 'Pending'     },
  { key: 'inactive', label: 'Inactive'    },
]

const STATUS_RANK = { active: 0, pending: 1, inactive: 2 }

const SORT_OPTIONS = [
  { key: 'joined_desc',  label: 'Newest first',          apply: (a, b) => new Date(b.joinedDate ?? 0) - new Date(a.joinedDate ?? 0) },
  { key: 'joined_asc',   label: 'Oldest first',          apply: (a, b) => new Date(a.joinedDate ?? 0) - new Date(b.joinedDate ?? 0) },
  { key: 'name_asc',     label: 'Name (A → Z)',          apply: (a, b) => (a.name ?? '').localeCompare(b.name ?? '') },
  { key: 'name_desc',    label: 'Name (Z → A)',          apply: (a, b) => (b.name ?? '').localeCompare(a.name ?? '') },
  { key: 'approved_desc',label: 'Approved $ (high → low)', apply: (a, b) => (b.totalApproved ?? 0) - (a.totalApproved ?? 0) },
  { key: 'approved_asc', label: 'Approved $ (low → high)', apply: (a, b) => (a.totalApproved ?? 0) - (b.totalApproved ?? 0) },
  { key: 'apps_desc',    label: 'Applications (most)',   apply: (a, b) => (b.totalApplications ?? 0) - (a.totalApplications ?? 0) },
  { key: 'status',       label: 'Status (active first)', apply: (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) },
]

/* ── Page ────────────────────────────────────────────────────────────── */
const ClientsPage = () => {
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [modalOpen, setModalOpen]     = useState(false)
  const [query, setQuery]             = useState('')
  const [statusTab, setStatusTab]     = useState('all')
  const clients                       = useClients()
  const [sortKey, setSortKey]         = useState('joined_desc')
  const [sortOpen, setSortOpen]       = useState(false)
  const sortRef                       = useRef(null)

  useEffect(() => {
    if (!sortOpen) return
    const onClick = e => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [sortOpen])

  const stats = useMemo(() => {
    const total    = clients.length
    const active   = clients.filter(c => c.status === 'active').length
    const pending  = clients.filter(c => c.status === 'pending').length
    const business = clients.filter(c => c.type === 'business').length
    return { total, active, pending, business }
  }, [clients])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sortFn = (SORT_OPTIONS.find(o => o.key === sortKey) ?? SORT_OPTIONS[0]).apply
    return clients
      .filter(c => statusTab === 'all' || c.status === statusTab)
      .filter(c => {
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.company ?? '').toLowerCase().includes(q)
        )
      })
      .slice()
      .sort(sortFn)
  }, [clients, query, statusTab, sortKey])

  const activeSortLabel = (SORT_OPTIONS.find(o => o.key === sortKey) ?? SORT_OPTIONS[0]).label

  const handleSave = newClient => {
    /* Resolve the right queue from the modal payload. */
    const flowKey = newClient.flowKey ?? (
      newClient.applicationType === 'advisory'
        ? (newClient.type === 'business' ? 'business-advisory' : 'personal-advisory')
        : (newClient.type === 'business' ? 'business-loan'     : 'personal-loan')
    )

    /* Stable client ID for the table. The queue API upserts the client by legacyId. */
    const clientId = 'CL-' + (1000 + clients.length + 5)
    enqueue(flowKey, { ...newClient, clientId }).then(() => refreshClients())

    setModalOpen(false)
  }

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar
        user={CURRENT_USER}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">

        {/* Mobile bar */}
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span className="text-[14px] font-semibold text-navy">Clients</span>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-gray-900 leading-tight">Clients</h1>
              <p className="text-[13px] text-secondary mt-1">
                {stats.total} total · {stats.active} active · {stats.pending} pending
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TbDownload style={{ fontSize: 15 }} />
                Export
              </button>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity"
              >
                <TbPlus style={{ fontSize: 15 }} />
                Add client
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-6">
            <StatCard label="TOTAL CLIENTS" value={stats.total} sub="across all statuses"   bar="bg-navy" />
            <StatCard label="ACTIVE"        value={stats.active}  sub="currently engaged"    bar="bg-success" pct={stats.active / stats.total} />
            <StatCard label="PENDING"       value={stats.pending} sub="awaiting onboarding"  bar="bg-warning" pct={stats.pending / stats.total} />
            <StatCard label="BUSINESS"      value={stats.business} sub="corporate accounts" bar="bg-blue-action" pct={stats.business / stats.total} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-5">

          {/* Toolbar — tabs + search */}
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center border-b border-gray-200 -mb-px">
              {FILTERS.map(({ key, label }) => {
                const isActive = statusTab === key
                const count = key === 'all'
                  ? clients.length
                  : clients.filter(c => c.status === key).length
                return (
                  <button
                    key={key}
                    onClick={() => setStatusTab(key)}
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

            <div className="flex items-center gap-2">
              {/* Sort dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium border border-gray-200 rounded-lg transition-colors ${
                    sortOpen ? 'bg-gray-100 text-gray-900' : 'text-secondary hover:bg-gray-50'
                  }`}
                >
                  <TbAdjustments style={{ fontSize: 14 }} />
                  Sort: <span className="text-gray-900">{activeSortLabel}</span>
                </button>

                {sortOpen && (
                  <div className="absolute top-full right-0 mt-1 w-60 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
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

              <div className="relative">
                <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" style={{ fontSize: 15 }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, ID, company…"
                  className="w-[320px] text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-action transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <Th>Client</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Applications</Th>
                  <Th className="text-right">Total approved</Th>
                  <Th>Joined</Th>
                  <Th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-[13px] text-tertiary">
                      No clients match your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => <ClientRow key={c.id} client={c} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <ContextChat
        storageKey="chat:clients"
        contextLabel={`${clients.length} clients`}
        contextData={{
          totals: stats,
          clients: clients.map(c => ({
            id: c.id, name: c.name, type: c.type, status: c.status,
            company: c.company, location: c.location,
            totalApplications: c.totalApplications, totalApproved: c.totalApproved,
            joinedDate: c.joinedDate,
          })),
        }}
        systemPrompt={CLIENTS_PROMPT}
        suggestions={[
          'How is the active client base trending vs pending?',
          'Which business clients have the highest total approved value?',
          'Who has been pending the longest and needs follow-up?',
          'Where are most of our clients located?',
        ]}
      />
    </div>
  )
}

/* ── Stat card ───────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, bar, pct }) => {
  const width = pct == null ? '100%' : `${Math.round(pct * 100)}%`
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 pt-4 pb-0 overflow-hidden">
      <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest">{label}</p>
      <p className="text-[30px] font-bold text-gray-900 leading-none mt-1">{value}</p>
      <p className="text-[11px] text-tertiary mt-1.5 mb-3">{sub}</p>
      <div className="h-[3px] w-full bg-gray-100">
        <div className={`h-full ${bar}`} style={{ width }} />
      </div>
    </div>
  )
}

/* ── Single row ──────────────────────────────────────────────────────── */
const ClientRow = ({ client }) => {
  const navigate = useNavigate()
  const st = STATUS_STYLES[client.status] ?? STATUS_STYLES.inactive
  const Icon = client.type === 'business' ? TbBuilding : TbUser

  return (
    <tr
      onClick={() => navigate(`/underwriting/team/${client.id}`)}
      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
    >
      {/* Client */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center text-[12px] font-semibold shrink-0">
            {initialsOf(client.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-gray-900 leading-tight truncate">{client.name}</p>
            <p className="text-[12px] text-tertiary leading-tight mt-0.5 truncate">
              {client.email}{client.company ? ` · ${client.company}` : ''}
            </p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-5 py-3.5">
        <div className="inline-flex items-center gap-1.5 text-[12px] text-secondary">
          <Icon style={{ fontSize: 13 }} />
          {client.type === 'business' ? 'Business' : 'Individual'}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.bg} ${st.text} ${st.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </td>

      {/* Applications */}
      <td className="px-5 py-3.5 text-right text-[13px] text-gray-800 font-medium tabular-nums">
        {client.totalApplications}
      </td>

      {/* Total approved */}
      <td className="px-5 py-3.5 text-right text-[13px] text-gray-800 font-semibold tabular-nums">
        {fmtMoney(client.totalApproved)}
      </td>

      {/* Joined */}
      <td className="px-5 py-3.5 text-[12px] text-secondary tabular-nums whitespace-nowrap">
        {fmtDate(client.joinedDate)}
      </td>

      {/* Actions */}
      <td className="px-3 py-3.5">
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-tertiary hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <TbDotsVertical style={{ fontSize: 16 }} />
        </button>
      </td>
    </tr>
  )
}

/* ── Table header cell ───────────────────────────────────────────────── */
const Th = ({ children, className = '' }) => (
  <th className={`px-5 py-3 text-[11px] font-semibold text-secondary uppercase tracking-wider ${className}`}>
    {children}
  </th>
)

export default ClientsPage
