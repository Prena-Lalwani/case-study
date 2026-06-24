import PropTypes from 'prop-types'
import {
  TbChartBar,
  TbFileDescription,
  TbLayoutDashboard,
  TbLogout,
  TbMenu2,
  TbUsers,
  TbUserStar,
  TbX
} from 'react-icons/tb'
import { useLocation, useNavigate } from 'react-router-dom'
import { signOut } from '../../auth/auth'

const NAV_ITEMS = [
  { key: 'advisors',  label: 'Advisors',          icon: TbUserStar,        path: '/underwriting/advisors' },
  { key: 'team',      label: 'Clients',           icon: TbUsers,           path: '/underwriting/team' },
  { key: 'dashboard', label: 'Loan applications', icon: TbLayoutDashboard, path: '/underwriting' },
  { key: 'advisory',  label: 'Advisory',          icon: TbFileDescription, path: '/underwriting/advisory' },
  { key: 'reports',   label: 'Analytics',         icon: TbChartBar,        path: '/underwriting/reports' },
]

/* ─── Shared sidebar body ────────────────────────────────────────────────── */
/* collapsed=true  → icon-only (tablet)                                       */
/* collapsed=false → icons + labels (desktop / mobile drawer)                 */
const SidebarBody = ({ user, collapsed = false }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleSignOut = () => {
    signOut()
    navigate('/signin', { replace: true })
  }

  const itemBase = `w-full flex items-center rounded-lg text-[14px] font-medium transition-colors`
  const itemLayout = collapsed
    ? 'justify-center px-2 py-3'
    : 'justify-start gap-3.5 px-4 py-3'

  return (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div className={`border-b border-white/10 ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-md bg-blue-action flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold tracking-tight">LU</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-[14px] font-semibold leading-tight truncate">
                Loan Underwriting
              </p>
              <p className="text-white/50 text-[12px] leading-tight truncate">
                Northbridge Bank
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 flex flex-col gap-1 py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {NAV_ITEMS.map(({ key, label, icon: Icon, path }) => {
          const isActive =
            path === '/underwriting'
              ? location.pathname === path || location.pathname.startsWith('/underwriting/review')
              : location.pathname.startsWith(path)

          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              title={collapsed ? label : undefined}
              className={`${itemBase} ${itemLayout} ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/55 hover:bg-white/8 hover:text-white/85'
              }`}
            >
              <Icon style={{ fontSize: 20 }} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className={`border-t border-white/10 ${collapsed ? 'px-2 py-4' : 'px-4 py-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-action flex items-center justify-center shrink-0">
              <span className="text-white text-[13px] font-semibold">
                {user?.initials ?? 'MW'}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <TbLogout style={{ fontSize: 17 }} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-action flex items-center justify-center shrink-0">
              <span className="text-white text-[13px] font-semibold">
                {user?.initials ?? 'MW'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-medium leading-tight truncate">
                {user?.name ?? 'Marcus Webb'}
              </p>
              <p className="text-white/50 text-[12px] leading-tight truncate">
                {user?.role ?? 'Senior Credit Analyst'}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <TbLogout style={{ fontSize: 17 }} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main sidebar component ─────────────────────────────────────────────── */
/*                                                                             */
/*  BREAKPOINTS                                                                */
/*  ──────────────────────────────────────────────────────────────────────── */
/*  < md  (0–767px)    Mobile   — hidden inline; slides in as overlay drawer  */
/*  md–lg (768–1023px) Tablet   — always visible, icon-only, w-16 (64px)      */
/*  ≥ lg  (1024px+)    Desktop  — always visible, full labels, w-[18%]        */
/*                                                                             */
const UnderwritingSidebar = ({ user, mobileOpen, onMobileClose }) => (
  <>
    {/* ── Inline sidebar — hidden on mobile, icon-only on tablet, full on desktop ── */}
    <aside
      className="
        hidden md:flex flex-col bg-navy h-full shrink-0
        md:w-16
        lg:w-[15%]
      "
    >
      {/* Tablet (md → lg): icon-only, hidden at lg+ */}
      <div className="flex flex-col h-full md:flex lg:hidden">
        <SidebarBody user={user} collapsed={true} />
      </div>

      {/* Desktop (lg+): full labels, hidden below lg */}
      <div className="hidden lg:flex flex-col h-full">
        <SidebarBody user={user} collapsed={false} />
      </div>
    </aside>

    {/* ── Mobile drawer overlay — only rendered below md ── */}
    <div
      className={`
        fixed inset-0 z-50 md:hidden flex
        transition-opacity duration-300
        ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />

      {/* Drawer panel — 75vw, max 260px */}
      <aside
        className={`
          relative flex flex-col bg-navy h-full
          w-[75vw] max-w-[260px]
          shadow-2xl
          transition-transform duration-300
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <TbX style={{ fontSize: 16 }} />
        </button>

        <SidebarBody user={user} collapsed={false} />
      </aside>
    </div>
  </>
)

UnderwritingSidebar.propTypes = {
  user: PropTypes.shape({
    name:     PropTypes.string,
    role:     PropTypes.string,
    initials: PropTypes.string,
  }),
  mobileOpen:    PropTypes.bool,
  onMobileClose: PropTypes.func,
}

UnderwritingSidebar.defaultProps = {
  mobileOpen:    false,
  onMobileClose: () => {},
}

export { TbMenu2 }
export default UnderwritingSidebar
