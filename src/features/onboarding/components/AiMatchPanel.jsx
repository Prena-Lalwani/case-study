import PropTypes from 'prop-types'
import { TbCircleFilled, TbCircleCheck, TbSparkles, TbX, TbClipboardList } from 'react-icons/tb'

const MATCHED = [
  { label: 'Goal',           value: 'Growth'    },
  { label: 'Horizon',        value: 'Mid-term'  },
  { label: 'Risk tolerance', value: 'Moderate'  },
]

const AiMatchPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">AI match preview</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-blue-50 rounded px-1.5 py-0.5">
          <TbCircleFilled className="text-blue-action" style={{ fontSize: 7 }} />
          <span className="text-[10px] font-semibold text-blue-action uppercase tracking-wide">Live</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors" aria-label="Close">
            <TbX style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Predicted profile card */}
    <div className="mx-4 mt-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-1">
      <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest mb-1">Predicted profile</p>
      <p className="text-[20px] font-bold text-indigo-800 leading-tight mb-3">Moderate Growth</p>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-indigo-500">Confidence</span>
        <span className="text-[12px] font-semibold text-indigo-700">42%</span>
      </div>
      <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '42%' }} />
      </div>
      <p className="text-[11px] text-indigo-400 leading-snug">
        Answer more questions to refine your match
      </p>
    </div>

    {/* Matched attributes */}
    <ul className="flex flex-col divide-y divide-gray-50 px-1">
      {MATCHED.map(({ label, value }) => (
        <li key={label} className="flex items-center justify-between px-3 py-3">
          <div className="flex items-center gap-2">
            <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 16 }} />
            <span className="text-[14px] text-gray-700">{label}</span>
          </div>
          <span className="text-[13px] font-semibold text-gray-800">{value}</span>
        </li>
      ))}
    </ul>

    {/* Quiz status card */}
    <div className="mx-4 mt-3 bg-navy rounded-xl px-4 py-4">
      <div className="flex items-center gap-1.5 mb-3">
        <TbClipboardList className="text-blue-300" style={{ fontSize: 13 }} />
        <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">Quiz status</span>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold mb-0.5">Answered</p>
          <p className="text-[22px] font-bold text-white leading-tight">4 <span className="text-[14px] font-medium text-blue-200">/ 12</span></p>
        </div>
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold mb-0.5">Est. left</p>
          <p className="text-[22px] font-bold text-white leading-tight">6 <span className="text-[14px] font-medium text-blue-200">min</span></p>
        </div>
      </div>
    </div>
  </aside>
)

AiMatchPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiMatchPanel
