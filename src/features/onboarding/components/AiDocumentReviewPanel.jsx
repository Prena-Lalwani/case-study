import PropTypes from 'prop-types'
import { TbCircle, TbCircleCheck, TbAlertTriangle, TbCircleFilled, TbX, TbFile } from 'react-icons/tb'

const REVIEW_ITEMS = [
  {
    icon: TbCircleCheck,
    iconClass: 'text-success',
    title: 'Gov ID verified',
    sub: '4 fields extracted · 99%',
    badge: 'DONE',
    badgeClass: 'text-success',
  },
  {
    icon: TbAlertTriangle,
    iconClass: 'text-warning',
    title: 'Address obscured',
    sub: 'Apartment unclear',
    badge: 'REVIEW',
    badgeClass: 'text-warning',
  },
  {
    icon: TbCircle,
    iconClass: 'text-gray-300',
    title: 'Bank statement',
    sub: 'No file yet',
    badge: 'AWAITING',
    badgeClass: 'text-tertiary',
  },
]

const AiDocumentReviewPanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">AI document review</span>
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

    {/* Review items */}
    <ul className="flex flex-col divide-y divide-gray-50">
      {REVIEW_ITEMS.map((item) => (
        <li key={item.title} className="flex items-center justify-between px-4 py-3 gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <item.icon className={`${item.iconClass} shrink-0 mt-0.5`} style={{ fontSize: 16 }} />
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-gray-800 leading-tight">{item.title}</p>
              <p className="text-[12px] text-secondary leading-tight mt-0.5">{item.sub}</p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold uppercase tracking-wide shrink-0 ${item.badgeClass}`}>
            {item.badge}
          </span>
        </li>
      ))}
    </ul>

    {/* Stats card */}
    <div className="mx-4 mt-4 bg-navy rounded-xl px-4 py-4">
      <div className="flex items-center gap-1.5 mb-2">
        <TbFile className="text-blue-300" style={{ fontSize: 13 }} />
        <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">Document review</span>
      </div>
      <p className="text-[26px] font-bold text-white leading-tight">
        1 <span className="text-[15px] font-medium text-blue-200">/ 3 verified</span>
      </p>
      <div className="flex gap-6 mt-3">
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Flags</p>
          <p className="text-[20px] font-bold text-white">1</p>
        </div>
        <div>
          <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Time saved</p>
          <p className="text-[20px] font-bold text-white">2 min</p>
        </div>
      </div>
    </div>
  </aside>
)

AiDocumentReviewPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiDocumentReviewPanel
