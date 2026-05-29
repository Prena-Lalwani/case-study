import PropTypes from 'prop-types'
import { TbCircleFilled, TbCheck, TbCircle, TbFile, TbSparkles, TbX } from 'react-icons/tb'

const LOG_ENTRIES = [
  { time: '10:46:15', icon: TbCircle,  iconClass: 'text-indigo-400', text: 'Fraud scan running...' },
  { time: '10:46:12', icon: TbCheck,   iconClass: 'text-success',    text: '14 fields extracted' },
  { time: '10:46:03', icon: TbCircle,  iconClass: 'text-indigo-400', text: 'Extracting fields...' },
  { time: '10:46:01', icon: TbFile,    iconClass: 'text-secondary',  text: 'Documents received' },
]

const AiReviewLogPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">Live AI log</span>
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

    {/* Log entries */}
    <ul className="flex flex-col divide-y divide-gray-50">
      {LOG_ENTRIES.map((entry, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3">
          <span className="text-[11px] text-tertiary shrink-0 font-mono">{entry.time}</span>
          <entry.icon className={`${entry.iconClass} shrink-0`} style={{ fontSize: 14 }} />
          <span className="text-[13px] text-gray-700">{entry.text}</span>
        </li>
      ))}
    </ul>

    {/* AI model card */}
    <div className="mx-4 mt-4 bg-navy rounded-xl px-4 py-4">
      <div className="flex items-center gap-1.5 mb-1">
        <TbSparkles className="text-indigo-300" style={{ fontSize: 12 }} />
        <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest">AI Model</span>
      </div>
      <p className="text-[18px] font-bold text-white mb-3 leading-tight">Meridian-IDX v3.2</p>
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Accuracy</p>
          <p className="text-[18px] font-bold text-white">99.4%</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Cases trained</p>
          <p className="text-[18px] font-bold text-white">2.1M</p>
        </div>
      </div>
    </div>
  </aside>
)

AiReviewLogPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiReviewLogPanel
