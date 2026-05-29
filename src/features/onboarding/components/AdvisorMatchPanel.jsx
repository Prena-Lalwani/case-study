import PropTypes from 'prop-types'
import { TbCircleCheck, TbX } from 'react-icons/tb'

const MATCH_ATTRS = [
  { label: 'Risk alignment', value: 'Moderate'       },
  { label: 'Horizon',        value: '3–7 yrs'        },
  { label: 'Goal',           value: 'Capital growth'  },
]

const CircularProgress = ({ percent }) => {
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - percent / 100)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#DCFCE7" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#1B5E20" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[26px] font-bold text-gray-900 leading-none">{percent}%</span>
      </div>
    </div>
  )
}

const AdvisorMatchPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">Match details</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-green-50 rounded px-1.5 py-0.5">
          <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 10 }} />
          <span className="text-[10px] font-semibold text-success uppercase tracking-wide">Matched</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors" aria-label="Close">
            <TbX style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Circular progress */}
    <div className="flex flex-col items-center py-6">
      <CircularProgress percent={94} />
      <p className="text-[12px] text-secondary mt-2">Profile match score</p>
    </div>

    {/* Matched attributes */}
    <ul className="flex flex-col divide-y divide-gray-50 px-1">
      {MATCH_ATTRS.map(({ label, value }) => (
        <li key={label} className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 16 }} />
            <span className="text-[14px] text-gray-700">{label}</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-800">{value}</span>
        </li>
      ))}
    </ul>

    {/* AI Confidence card */}
    <div className="mx-4 mt-3 mb-4 rounded-xl px-4 py-4" style={{ backgroundColor: '#1A3A1A' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: '#7EC87E', fontSize: 11 }}>✦</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#7EC87E' }}>
          AI Confidence
        </span>
      </div>
      <p className="font-bold text-white leading-tight" style={{ fontSize: 28 }}>
        94{' '}
        <span className="font-medium" style={{ fontSize: 16, color: '#A8D5A8' }}>% match</span>
      </p>
      <p className="text-[12px] mt-1.5 leading-snug" style={{ color: '#A8D5A8' }}>
        Selected from 47 available advisors for your profile.
      </p>
    </div>
  </aside>
)

AdvisorMatchPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AdvisorMatchPanel
