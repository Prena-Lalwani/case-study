import PropTypes from 'prop-types'
import { TiLockClosed } from 'react-icons/ti'
import { TbShield } from 'react-icons/tb'

/**
 * Card shell: navy header with MW logo + Meridian Wealth branding, white body, security footer.
 * @param {{ children: React.ReactNode }} props
 */
const AuthCard = ({ children }) => {
  return (
    <div
      className="w-[420px] bg-white rounded-xl border shadow-sm"
      style={{ borderColor: '#e0e0e0', borderWidth: '0.5px' }}
    >
      {/* ── Card Header ── */}
      <div className="bg-navy rounded-t-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* MW logo box */}
          <div
            className="flex items-center justify-center bg-white rounded text-navy font-bold leading-none"
            style={{ width: 28, height: 28, fontSize: 9 }}
          >
            MW
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-medium" style={{ fontSize: 12 }}>
              Meridian Wealth
            </span>
            <span className="text-white" style={{ fontSize: 9, opacity: 0.6 }}>
              Secure private banking
            </span>
          </div>
        </div>
        <TiLockClosed className="text-white" style={{ fontSize: 14, opacity: 0.6 }} />
      </div>

      {/* ── Card Body ── */}
      <div className="px-5 py-5">{children}</div>

      {/* ── Card Footer ── */}
      <div
        className="flex items-center justify-center gap-1.5 px-5 py-2.5 border-t"
        style={{ borderColor: '#e0e0e0' }}
      >
        <TbShield className="text-tertiary shrink-0" style={{ fontSize: 11 }} />
        <span className="text-[9px] text-tertiary text-center leading-tight">
          Protected by Meridian-IDX v3.2 &middot; SOC 2 Type II &middot; WCAG 2.1
        </span>
      </div>
    </div>
  )
}

AuthCard.propTypes = {
  children: PropTypes.node.isRequired,
}

export default AuthCard
