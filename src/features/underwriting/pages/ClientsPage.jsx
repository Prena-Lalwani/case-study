import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUrlState } from '../../../hooks/useNavState'
import {
  TbAdjustments,
  TbBuilding,
  TbBriefcase,
  TbCheck,
  TbCoin,
  TbCopy,
  TbDotsVertical,
  TbEye,
  TbId,
  TbMail,
  TbPlayerPause,
  TbPlayerPlay,
  TbPlus,
  TbSearch,
  TbUser,
  TbUserCircle,
} from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import AddClientModal from '../components/AddClientModal'
import ContextChat from '../chat/ContextChat'
import { CLIENTS_PROMPT } from '../chat/chatPrompts'
import { enqueue } from '../services/clientQueueStore'
import { refreshClients, useClients } from '../hooks/useClients'
import { api } from '../services/api.js'

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

const SERVICE_META = {
  'personal-loan':     { label: 'Personal loan',     Icon: TbCoin,      tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  'business-loan':     { label: 'Business loan',     Icon: TbBuilding,  tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  'personal-advisory': { label: 'Personal advisory', Icon: TbUser,      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'business-advisory': { label: 'Business advisory', Icon: TbBriefcase, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
}

const serviceFor = c => {
  if (c.serviceFlow && SERVICE_META[c.serviceFlow]) return SERVICE_META[c.serviceFlow]
  return c.type === 'business'
    ? { label: 'Business',   Icon: TbBuilding, tone: 'text-gray-700 bg-gray-50 border-gray-200' }
    : { label: 'Individual', Icon: TbUser,     tone: 'text-gray-700 bg-gray-50 border-gray-200' }
}

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
  const [query, setQuery]             = useUrlState('q', '')
  const [statusTab, setStatusTab]     = useUrlState('tab', 'all')
  const clients                       = useClients()
  const [sortKey, setSortKey]         = useUrlState('sort', 'joined_desc')
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
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 sm:py-6 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-gray-900 leading-tight">Clients</h1>
              <p className="text-[13px] text-secondary mt-1">
                {stats.total} total · {stats.active} active · {stats.pending} pending
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity"
              >
                <TbPlus style={{ fontSize: 15 }} />
                <span className="hidden sm:inline">Add client</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 sm:mt-6">
            <StatCard label="TOTAL CLIENTS" value={stats.total} sub="across all statuses"   bar="bg-navy" />
            <StatCard label="ACTIVE"        value={stats.active}  sub="currently engaged"    bar="bg-success" pct={stats.active / stats.total} />
            <StatCard label="PENDING"       value={stats.pending} sub="awaiting onboarding"  bar="bg-warning" pct={stats.pending / stats.total} />
            <StatCard label="BUSINESS"      value={stats.business} sub="corporate accounts" bar="bg-blue-action" pct={stats.business / stats.total} />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5">

          {/* Toolbar — tabs + search */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center border-b border-gray-200 -mb-px overflow-x-auto max-w-full">
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Sort dropdown */}
              <div className="relative shrink-0" ref={sortRef}>
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

              <div className="relative flex-1 sm:flex-none">
                <TbSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" style={{ fontSize: 15 }} />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search by name, email, ID, company…"
                  className="w-full sm:w-[320px] text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg pl-9 pr-3 py-2 outline-none focus:border-blue-action transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Table — scrolls horizontally on small screens instead of squishing */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left min-w-[820px]" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />{/* Client */}
                <col style={{ width: '15%' }} />{/* Service */}
                <col style={{ width: '18%' }} />{/* Assigned advisor */}
                <col style={{ width: '10%' }} />{/* Status */}
                <col style={{ width: '11%' }} />{/* Applications */}
                <col style={{ width: '12%' }} />{/* Total approved */}
                <col style={{ width: '9%'  }} />{/* Joined */}
                <col style={{ width: '3%'  }} />{/* Actions */}
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <Th>Client</Th>
                  <Th>Service</Th>
                  <Th>Assigned advisor</Th>
                  <Th>Status</Th>
                  <Th className="text-center">Applications</Th>
                  <Th className="text-center">Total approved</Th>
                  <Th>Joined</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-[13px] text-tertiary">
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
  const navigate     = useNavigate()
  const st           = STATUS_STYLES[client.status] ?? STATUS_STYLES.inactive
  const service      = serviceFor(client)
  const advisor      = client.assignedAdvisor
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos]   = useState(null)   // { top, right } for the fixed-position menu
  const menuRef      = useRef(null)
  const btnRef       = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey   = e => { if (e.key === 'Escape') setMenuOpen(false) }
    /* The menu is fixed-positioned (to escape the table's scroll clipping), so
       close it on any scroll/resize rather than trying to keep it glued. */
    const onScroll = () => setMenuOpen(false)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [menuOpen])

  const stop = e => { e.stopPropagation(); e.preventDefault() }

  /* Anchor the fixed menu to the button; flip upward if it would overflow the bottom. */
  const toggleMenu = (e) => {
    stop(e)
    if (menuOpen) { setMenuOpen(false); return }
    const r = btnRef.current.getBoundingClientRect()
    const MENU_H = 290
    const openUp = r.bottom + MENU_H > window.innerHeight && r.top > MENU_H
    setMenuPos({
      top:   openUp ? undefined : r.bottom + 4,
      bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
      right: window.innerWidth - r.right,
    })
    setMenuOpen(true)
  }

  const copy = async (text, e) => {
    stop(e)
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked */ }
    setMenuOpen(false)
  }

  const setStatus = async (next, e) => {
    stop(e)
    setMenuOpen(false)
    try {
      await api.patch(`/clients/${client.id}`, { status: next })
      refreshClients()
    } catch (err) {
      console.error('Failed to update client status:', err.message)
    }
  }

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

      {/* Service */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${service.tone}`}>
          <service.Icon style={{ fontSize: 12 }} />
          <span className="truncate">{service.label}</span>
        </span>
      </td>

      {/* Assigned advisor */}
      <td className="px-5 py-3.5">
        {advisor ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10.5px] font-semibold shrink-0">
              {advisor.initials ?? initialsOf(advisor.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[12.5px] font-medium text-gray-900 leading-tight truncate">{advisor.name}</p>
              {advisor.specialty && (
                <p className="text-[11px] text-tertiary leading-tight mt-0.5 truncate">{advisor.specialty}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-[12px] text-tertiary">
            <TbUserCircle style={{ fontSize: 14 }} />
            Unassigned
          </div>
        )}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.bg} ${st.text} ${st.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          {st.label}
        </span>
      </td>

      {/* Applications */}
      <td className="px-5 py-3.5 text-center text-[13px] text-gray-800 font-medium tabular-nums">
        {client.totalApplications}
      </td>

      {/* Total approved */}
      <td className="px-5 py-3.5 text-center text-[13px] text-gray-800 font-semibold tabular-nums">
        {fmtMoney(client.totalApproved)}
      </td>

      {/* Joined */}
      <td className="px-5 py-3.5 text-[12px] text-secondary tabular-nums whitespace-nowrap">
        {fmtDate(client.joinedDate)}
      </td>

      {/* Actions */}
      <td className="px-3 py-3.5">
        <div ref={menuRef}>
          <button
            ref={btnRef}
            onClick={toggleMenu}
            className={`p-1.5 rounded-lg transition-colors ${
              menuOpen ? 'bg-gray-100 text-gray-700' : 'text-tertiary hover:bg-gray-100 hover:text-gray-700'
            }`}
            aria-label="Row actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <TbDotsVertical style={{ fontSize: 16 }} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{ position: 'fixed', top: menuPos?.top, bottom: menuPos?.bottom, right: menuPos?.right }}
              className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
            >
              <MenuItem
                icon={TbEye}
                label="View profile"
                onClick={(e) => { stop(e); setMenuOpen(false); navigate(`/underwriting/team/${client.id}`) }}
              />
              <MenuItem
                icon={TbMail}
                label="Copy email"
                onClick={(e) => copy(client.email, e)}
                disabled={!client.email}
              />
              <MenuItem
                icon={TbId}
                label="Copy client ID"
                onClick={(e) => copy(client.id, e)}
              />
              <MenuDivider />
              <MenuLabel>Status</MenuLabel>
              {client.status !== 'active' && (
                <MenuItem
                  icon={TbPlayerPlay}
                  label="Mark active"
                  tone="success"
                  onClick={(e) => setStatus('active', e)}
                />
              )}
              {client.status !== 'pending' && (
                <MenuItem
                  icon={TbCopy}
                  label="Mark pending"
                  tone="warning"
                  onClick={(e) => setStatus('pending', e)}
                />
              )}
              {client.status !== 'inactive' && (
                <MenuItem
                  icon={TbPlayerPause}
                  label="Mark inactive"
                  onClick={(e) => setStatus('inactive', e)}
                />
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

/* ── Row-menu primitives ──────────────────────────────────────────────── */
const MENU_TONES = {
  default: 'text-gray-700 hover:bg-gray-50',
  success: 'text-emerald-700 hover:bg-emerald-50',
  warning: 'text-amber-700  hover:bg-amber-50',
  danger:  'text-red-600    hover:bg-red-50',
}
const MenuItem = ({ icon: Icon, label, onClick, disabled = false, tone = 'default' }) => (
  <button
    type="button"
    role="menuitem"
    disabled={disabled}
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-left transition-colors ${
      disabled ? 'text-gray-300 cursor-not-allowed' : MENU_TONES[tone]
    }`}
  >
    <Icon style={{ fontSize: 14 }} />
    {label}
  </button>
)
const MenuDivider = () => <div className="my-1 border-t border-gray-100" />
const MenuLabel   = ({ children }) => (
  <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-tertiary">{children}</p>
)

/* ── Table header cell ───────────────────────────────────────────────── */
const Th = ({ children, className = '' }) => (
  <th className={`px-5 py-3 text-[11px] font-semibold text-secondary uppercase tracking-wider ${className}`}>
    {children}
  </th>
)

export default ClientsPage
