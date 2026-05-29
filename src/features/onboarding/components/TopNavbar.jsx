import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PropTypes from 'prop-types'
import { TbChevronRight, TbCircleFilled, TbMenu2, TbSparkles, TbLogout, TbUser } from 'react-icons/tb'
import { authService } from '../../auth/services/authService'

/**
 * Top navbar — responsive:
 *  mobile  : hamburger (left) + MW logo + AI-toggle icon (right) + JD avatar
 *  tablet  : MW logo + breadcrumb hidden + AI-toggle text button + JD avatar
 *  desktop : MW logo + breadcrumb + session info + JD + name
 *
 * @param {{ onMenuClick: () => void, onAiClick: () => void }} props
 */
const TopNavbar = ({ onMenuClick, onAiClick, pageTitle = 'Personal information', sessionInfo = 'Session secure · auto-saved 2s ago', sessionDotColor = 'text-success' }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  const user = authService.getUser()
  const fullName = user?.fullName ?? 'User'
  const email    = user?.email    ?? ''
  const initials = fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = () => {
    authService.signOut()
    setMenuOpen(false)
    navigate('/signin')
  }

  return (
    <header className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-5 shrink-0 z-10">

      {/* ── Left cluster ── */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Open navigation"
        >
          <TbMenu2 style={{ fontSize: 22 }} />
        </button>

        {/* MW logo */}
        <div
          className="bg-navy rounded-md flex items-center justify-center text-white font-bold shrink-0"
          style={{ width: 26, height: 26, fontSize: 11 }}
        >
          MW
        </div>

        {/* Brand name */}
        <span className="text-[15px] font-semibold text-navy tracking-tight hidden sm:inline">
          Meridian Wealth
        </span>

        {/* Breadcrumb — desktop only */}
        <span className="text-gray-300 text-sm hidden lg:inline">|</span>
        <div className="hidden lg:flex items-center gap-1 text-[13px]">
          <span className="text-secondary">Onboarding</span>
          <TbChevronRight className="text-tertiary" style={{ fontSize: 13 }} />
          <span className="text-gray-800 font-medium">{pageTitle}</span>
        </div>
      </div>

      {/* ── Right cluster ── */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Session info — desktop only */}
        <div className="hidden lg:flex items-center gap-1.5 text-[12px] text-secondary">
          <TbCircleFilled className={sessionDotColor} style={{ fontSize: 9 }} />
          <span>{sessionInfo}</span>
        </div>

        {/* AI Activity toggle */}
        <button
          onClick={onAiClick}
          className="lg:hidden flex items-center gap-1.5 text-[12px] font-medium text-blue-action border border-blue-action rounded-lg px-2 py-1 hover:bg-blue-50 transition-colors"
          aria-label="Open AI activity"
        >
          <TbSparkles style={{ fontSize: 14 }} />
          <span className="hidden sm:inline">AI Activity</span>
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-navy/20 transition-all"
            aria-label="User menu"
          >
            <div
              className="bg-navy rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ width: 28, height: 28, fontSize: 12 }}
            >
              {initials}
            </div>
            <span className="hidden lg:inline text-[14px] font-medium text-gray-800">
              {fullName}
            </span>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-gray-800">{fullName}</p>
                <p className="text-[11px] text-secondary truncate">{email}</p>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <TbUser style={{ fontSize: 15 }} />
                My profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-red-50 transition-colors"
              >
                <TbLogout style={{ fontSize: 15 }} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

TopNavbar.propTypes = {
  onMenuClick:      PropTypes.func,
  onAiClick:        PropTypes.func,
  pageTitle:        PropTypes.string,
  sessionInfo:      PropTypes.string,
  sessionDotColor:  PropTypes.string,
}

export default TopNavbar
