import PropTypes from 'prop-types'
import { TbCircle, TbClock, TbX } from 'react-icons/tb'

const CHECKS = [
  { label: 'Biometric' },
  { label: 'ID front scan' },
  { label: 'ID back scan' },
  { label: 'Liveness check' },
]

const VerificationStatusPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">Verification status</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-orange-50 rounded px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
          <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">Ready</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors"
            aria-label="Close verification status"
          >
            <TbX style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Checklist */}
    <ul className="flex flex-col divide-y divide-gray-50">
      {CHECKS.map((item) => (
        <li key={item.label} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <TbCircle className="text-gray-300 shrink-0" style={{ fontSize: 16 }} />
            <span className="text-[14px] text-gray-700">{item.label}</span>
          </div>
          <span className="text-[11px] font-semibold text-tertiary uppercase tracking-wide">
            PENDING
          </span>
        </li>
      ))}
    </ul>

    {/* Avg time card */}
    <div className="mx-4 mt-4 bg-navy rounded-xl px-4 py-4">
      <div className="flex items-center gap-1.5 mb-1">
        <TbClock className="text-blue-300" style={{ fontSize: 13 }} />
        <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">
          Avg verification time
        </span>
      </div>
      <p className="text-[28px] font-bold text-white leading-tight">45 <span className="text-[16px] font-medium">seconds</span></p>
      <p className="text-[12px] text-blue-200 mt-1 leading-snug">
        Most members complete this step on the first attempt.
      </p>
    </div>
  </aside>
)

VerificationStatusPanel.propTypes = {
  onClose: PropTypes.func,
}

export default VerificationStatusPanel
