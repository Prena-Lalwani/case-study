import PropTypes from 'prop-types'
import { TbCheck, TbLock } from 'react-icons/tb'

const STEPS = [
  { n: 1, label: 'Personal info' },
  { n: 2, label: 'Verify identity' },
  { n: 3, label: 'Documents' },
  { n: 4, label: 'AI review' },
  { n: 5, label: 'Risk assessment' },
  { n: 6, label: 'Compliance' },
  { n: 7, label: 'Advisor' },
  { n: 8, label: 'Activated' },
]

const StepStepper = ({ activeStep = 1, lockedFrom, allComplete = false }) => {
  /* ── All-complete state (Step 8 activated) ── */
  if (allComplete) {
    return (
      <div className="bg-white border-b border-gray-200 shrink-0">
        <div className="h-0.5 w-full bg-success" />
        <div className="flex items-center justify-center h-10">
          <div className="flex items-center gap-1.5 bg-navy text-white rounded-full px-4 py-1">
            <TbCheck style={{ fontSize: 12 }} />
            <span className="text-[11px] font-bold tracking-widest uppercase">All 8 steps complete</span>
          </div>
        </div>
      </div>
    )
  }

  const current = STEPS[activeStep - 1]

  return (
    <div className="bg-white border-b border-gray-200 shrink-0">
      <div className="h-0.5 bg-gray-100 w-full">
        <div
          className="h-full bg-navy transition-all duration-500"
          style={{ width: `${(activeStep / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Mobile compact */}
      <div className="md:hidden flex items-center justify-between px-4 h-10">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-full bg-navy flex items-center justify-center text-white font-bold shrink-0"
            style={{ fontSize: 9 }}
          >
            {activeStep}
          </div>
          <span className="text-[12px] font-semibold text-navy">{current.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s) => (
            <span
              key={s.n}
              className={`rounded-full transition-all ${
                s.n === activeStep ? 'w-3 h-1.5 bg-navy'
                : s.n < activeStep ? 'w-1.5 h-1.5 bg-navy opacity-50'
                : 'w-1.5 h-1.5 bg-gray-200'
              }`}
            />
          ))}
          <span className="text-[9px] text-tertiary ml-1">{activeStep}/{STEPS.length}</span>
        </div>
      </div>

      {/* Tablet + desktop */}
      <div className="hidden md:flex items-stretch h-11">
        {STEPS.map((step, idx) => {
          const active  = step.n === activeStep
          const done    = step.n < activeStep
          const locked  = lockedFrom != null && step.n >= lockedFrom

          return (
            <div key={step.n} className="flex-1 flex items-center gap-2 px-3 relative">
              {idx > 0 && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-px w-3 ${done ? 'bg-navy' : 'bg-gray-200'}`} />
              )}

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 transition-all ${
                  active  ? 'bg-navy text-white'
                  : done  ? 'bg-success text-white'
                  : locked ? 'border border-gray-200 text-gray-300 bg-gray-50'
                  : 'border border-gray-300 text-tertiary bg-white'
                }`}
                style={{ fontSize: 9 }}
              >
                {done   ? <TbCheck style={{ fontSize: 11 }} />
                : locked ? <TbLock style={{ fontSize: 9 }} />
                : step.n}
              </div>

              <span className={`text-[11px] leading-tight truncate ${
                active  ? 'font-semibold text-navy'
                : done  ? 'text-success font-medium'
                : locked ? 'text-gray-300'
                : 'text-tertiary'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

StepStepper.propTypes = {
  activeStep:  PropTypes.number,
  lockedFrom:  PropTypes.number,
  allComplete: PropTypes.bool,
}

export default StepStepper
