import PropTypes from 'prop-types'
import { TbCircleFilled, TbCircleCheck, TbLoader, TbCircle, TbX, TbGavel } from 'react-icons/tb'

const STAGES = [
  {
    label:   'Application submitted',
    sub:     'All documents received',
    status:  'complete',
    time:    'May 29, 9:04 AM',
  },
  {
    label:   'Document verification',
    sub:     'Reviewing identity & address docs',
    status:  'in_progress',
    time:    'In progress',
  },
  {
    label:   'Compliance check',
    sub:     'AML, PEP & sanctions screening',
    status:  'pending',
    time:    'Est. ~4 hrs',
  },
  {
    label:   'Final approval',
    sub:     'Sign-off & account activation',
    status:  'pending',
    time:    'Est. ~14 hrs',
  },
]

const StageIcon = ({ status }) => {
  if (status === 'complete')    return <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 20 }} />
  if (status === 'in_progress') return <TbLoader className="text-warning shrink-0 animate-spin" style={{ fontSize: 20 }} />
  return <TbCircle className="text-gray-300 shrink-0" style={{ fontSize: 20 }} />
}

const ReviewTimelinePanel = ({ onClose }) => (
  <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px]">✦</span>
        <span className="text-[16px] font-semibold text-gray-800">Review timeline</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-amber-50 rounded px-1.5 py-0.5">
          <TbCircleFilled className="text-warning" style={{ fontSize: 7 }} />
          <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">Under review</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors" aria-label="Close">
            <TbX style={{ fontSize: 14 }} />
          </button>
        )}
      </div>
    </div>

    {/* Timeline */}
    <div className="px-4 pt-4 pb-2 flex-1">
      <div className="relative flex flex-col gap-0">
        {STAGES.map((stage, idx) => (
          <div key={stage.label} className="flex gap-3">
            {/* Connector column */}
            <div className="flex flex-col items-center" style={{ width: 20 }}>
              <StageIcon status={stage.status} />
              {idx < STAGES.length - 1 && (
                <div className={`w-px flex-1 my-1 ${stage.status === 'complete' ? 'bg-success' : 'bg-gray-200'}`} style={{ minHeight: 28 }} />
              )}
            </div>

            {/* Content */}
            <div className="pb-5 min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`text-[14px] font-medium leading-tight ${
                    stage.status === 'complete'    ? 'text-gray-800'
                    : stage.status === 'in_progress' ? 'text-gray-900'
                    : 'text-gray-400'
                  }`}>
                    {stage.label}
                  </p>
                  <p className={`text-[12px] mt-0.5 leading-snug ${
                    stage.status === 'pending' ? 'text-gray-300' : 'text-secondary'
                  }`}>
                    {stage.sub}
                  </p>
                </div>
                <span className={`text-[11px] font-semibold shrink-0 mt-0.5 ${
                  stage.status === 'complete'    ? 'text-success'
                  : stage.status === 'in_progress' ? 'text-warning'
                  : 'text-gray-300'
                }`}>
                  {stage.status === 'complete' ? 'DONE'
                    : stage.status === 'in_progress' ? 'NOW'
                    : 'PENDING'}
                </span>
              </div>
              <p className={`text-[11px] mt-1 ${
                stage.status === 'pending' ? 'text-gray-300' : 'text-tertiary'
              }`}>
                {stage.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Avg approval card */}
    <div className="mx-4 mb-4 rounded-xl px-4 py-4" style={{ backgroundColor: '#3B4A2F' }}>
      <div className="flex items-center gap-1.5 mb-3">
        <TbGavel style={{ fontSize: 13, color: '#A8C07A' }} />
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#A8C07A' }}>
          Avg. approval time
        </span>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#A8C07A' }}>Total time</p>
          <p className="text-[22px] font-bold text-white leading-tight">
            18 <span className="text-[14px] font-medium" style={{ color: '#C8D9A8' }}>hrs</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#A8C07A' }}>Approvals</p>
          <p className="text-[22px] font-bold text-white leading-tight">
            98 <span className="text-[14px] font-medium" style={{ color: '#C8D9A8' }}>%</span>
          </p>
        </div>
      </div>
    </div>
  </aside>
)

ReviewTimelinePanel.propTypes = {
  onClose: PropTypes.func,
}

export default ReviewTimelinePanel
