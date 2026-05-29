import PropTypes from 'prop-types'
import { TbCircle, TbCircleFilled, TbClock, TbX, TbCircleCheck } from 'react-icons/tb'

const STEPS_META = [
  { n: 1, label: 'Personal info',   title: 'Personal information', progress: 12, estMin: 13 },
  { n: 2, label: 'Verify identity', title: 'Verify identity',      progress: 25, estMin: 11 },
  { n: 3, label: 'Documents',       title: 'Documents',            progress: 37, estMin: 9  },
  { n: 4, label: 'AI review',       title: 'AI review',            progress: 50, estMin: 7  },
  { n: 5, label: 'Risk assessment', title: 'Risk assessment',      progress: 62, estMin: 5  },
  { n: 6, label: 'Compliance',      title: 'Compliance',           progress: 75, estMin: 4  },
  { n: 7, label: 'Advisor',         title: 'Advisor',              progress: 87, estMin: 2  },
  { n: 8, label: 'Activated',       title: 'Activated',            progress: 100, estMin: 1 },
]

const getStatus = (n, currentStep) => {
  if (n < currentStep) return 'done'
  if (n === currentStep) return 'live'
  return 'queued'
}

const SidebarProgress = ({ onClose, currentStep = 1, stepBadge, stepBadgeColor = 'text-warning', extraContent, hideTimeEstimate = false, showNextLabel = false }) => {
  const meta = STEPS_META[currentStep - 1]

  return (
    <aside className="w-65 shrink-0 border-r border-gray-200 bg-white flex flex-col px-5 py-4 overflow-y-auto h-full">

      {onClose && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors"
            aria-label="Close navigation"
          >
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>
      )}

      <p className="text-[13px] uppercase tracking-widest text-tertiary font-semibold mb-1">
        Step {currentStep} of 8
      </p>
      <h2 className="text-[17px] font-semibold text-gray-900 leading-tight mb-4">
        {meta.title}
      </h2>

      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] text-tertiary">Overall progress</span>
          <span className="text-[13px] font-semibold text-navy">{meta.progress}%</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-navy rounded-full transition-all duration-500" style={{ width: `${meta.progress}%` }} />
        </div>
      </div>

      {!hideTimeEstimate && (
        <div className="flex items-center gap-1 text-[13px] text-secondary mb-5">
          <TbClock style={{ fontSize: 14 }} />
          <span>Est. time remaining</span>
          <span className="font-semibold text-gray-700 ml-0.5">{meta.estMin} min</span>
        </div>
      )}
      {extraContent}

      <nav className="flex flex-col gap-2">
        {STEPS_META.map(({ n, label }) => {
          const status = getStatus(n, currentStep)
          return (
            <div key={n} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {status === 'done' ? (
                  <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 12 }} />
                ) : status === 'live' ? (
                  <TbCircleFilled className={`${stepBadgeColor} shrink-0`} style={{ fontSize: 12 }} />
                ) : (
                  <TbCircle className="text-gray-300 shrink-0" style={{ fontSize: 12 }} />
                )}
                <span className={`text-[15px] truncate ${
                  status === 'done' ? 'text-secondary' :
                  status === 'live' ? 'font-medium text-gray-900' : 'text-secondary'
                }`}>
                  {label}
                </span>
              </div>
              <span className={`text-[12px] font-semibold uppercase tracking-wide shrink-0 ${
                status === 'done'  ? 'text-success' :
                status === 'live'  ? stepBadgeColor : 'text-tertiary'
              }`}>
                {status === 'done' ? 'DONE' : status === 'live' ? (stepBadge ?? 'LIVE') : (showNextLabel && n === currentStep + 1) ? 'NEXT' : 'QUEUED'}
              </span>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

SidebarProgress.propTypes = {
  onClose:          PropTypes.func,
  currentStep:      PropTypes.number,
  stepBadge:        PropTypes.string,
  stepBadgeColor:   PropTypes.string,
  extraContent:     PropTypes.node,
  hideTimeEstimate: PropTypes.bool,
  showNextLabel:    PropTypes.bool,
}

export default SidebarProgress
