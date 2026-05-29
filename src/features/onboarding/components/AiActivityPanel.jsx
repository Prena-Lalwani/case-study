import PropTypes from 'prop-types'
import { TbCircleFilled, TbX } from 'react-icons/tb'

const ACTIVITY = [
  { color: 'text-error',      title: 'SSN format mismatch',      detail: 'Expected XXX-XX-XXXX',          time: '10:42:24' },
  { color: 'text-warning',    title: 'Address low confidence',    detail: '62% — apartment unclear',       time: '10:42:21' },
  { color: 'text-success',    title: 'DOB extracted',             detail: '14 Mar 1985',                   time: '10:42:19' },
  { color: 'text-success',    title: 'Name extracted',            detail: 'John A. Doe',                   time: '10:42:18' },
  { color: 'text-success',    title: 'ID document classified',    detail: "US driver's licence · NY",      time: '10:42:14' },
]

/**
 * Right AI activity panel — when `onClose` is provided the component is in drawer mode.
 * @param {{ onClose?: () => void }} props
 */
const AiActivityPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Panel header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[15px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">AI activity</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-green-50 rounded px-1.5 py-0.5">
          <TbCircleFilled className="text-success" style={{ fontSize: 6 }} />
          <span className="text-[12px] font-semibold text-success uppercase tracking-wide">Live</span>
        </div>
        {/* Close button — drawer mode only */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors"
            aria-label="Close AI activity"
          >
            <TbX style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Activity list */}
    <ul className="flex flex-col divide-y divide-gray-50 overflow-y-auto">
      {ACTIVITY.map((item) => (
        <li key={item.time} className="flex items-start gap-2 px-4 py-3">
          <TbCircleFilled className={`${item.color} shrink-0 mt-0.5`} style={{ fontSize: 8 }} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-gray-800 leading-tight">{item.title}</p>
            <p className="text-[14px] text-secondary leading-tight mt-0.5">{item.detail}</p>
          </div>
          <span className="text-[13px] text-tertiary shrink-0">{item.time}</span>
        </li>
      ))}
    </ul>
  </aside>
)

AiActivityPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiActivityPanel
