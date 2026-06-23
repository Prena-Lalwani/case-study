import PropTypes from 'prop-types'
import { TbCircleFilled, TbCircleCheck, TbCircle, TbX, TbClipboardList } from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

const TOTAL = 12

/* ─── Derive a profile label from answers ─────────────────────────── */
const deriveProfile = (answers) => {
  if (!answers[1]) return 'Pending'
  const goal     = answers[1]
  const reaction = answers[3]
  const appetite = answers[12]
  if (appetite === 'Aggressive' || reaction === 'Buy more')        return 'Aggressive Growth'
  if (goal === 'Capital growth')                                   return 'Moderate Growth'
  if (goal === 'Regular income')                                   return 'Balanced Income'
  return 'Conservative'
}

/* ─── Derive matched attributes rows ─────────────────────────────── */
const buildAttrs = (answers) => [
  {
    label: 'Goal',
    value: answers[1]
      ? ({ 'Capital growth': 'Growth', 'Regular income': 'Income', 'Capital preservation': 'Preservation' })[answers[1]] ?? answers[1]
      : null,
  },
  {
    label: 'Horizon',
    value: answers[2]
      ? ({ 'Less than 2 yrs': 'Short-term', '3–7 years': 'Mid-term', '8+ years': 'Long-term' })[answers[2]] ?? answers[2]
      : null,
  },
  {
    label: 'Risk tolerance',
    value: (answers[3] || answers[12])
      ? (answers[12] === 'Aggressive' || answers[3] === 'Buy more')    ? 'High'
        : (answers[12] === 'Conservative' || answers[3] === 'Sell immediately') ? 'Low'
        : 'Moderate'
      : null,
  },
]

/* ─── Component ───────────────────────────────────────────────────── */
const AiMatchPanel = ({ onClose }) => {
  const { state } = useOnboarding()
  const answers      = state.riskAnswers
  const answeredCount = Object.keys(answers).length
  const confidence   = Math.round((answeredCount / TOTAL) * 100)
  const estLeft      = Math.max(0, TOTAL - answeredCount)
  const profile      = deriveProfile(answers)
  const attrs        = buildAttrs(answers)

  return (
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
        <p className="text-[20px] font-bold text-indigo-800 leading-tight mb-3">{profile}</p>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[12px] text-indigo-500">Confidence</span>
          <span className="text-[12px] font-semibold text-indigo-700">{confidence}%</span>
        </div>
        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${confidence}%` }} />
        </div>
        <p className="text-[11px] text-indigo-400 leading-snug">
          {answeredCount < TOTAL
            ? 'Answer more questions to refine your match'
            : 'Profile complete — your match is ready'}
        </p>
      </div>

      {/* Matched attributes */}
      <ul className="flex flex-col divide-y divide-gray-50 px-1">
        {attrs.map(({ label, value }) => (
          <li key={label} className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-2">
              {value
                ? <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 16 }} />
                : <TbCircle      className="text-gray-300 shrink-0" style={{ fontSize: 16 }} />
              }
              <span className="text-[14px] text-gray-700">{label}</span>
            </div>
            <span className={`text-[13px] font-semibold ${value ? 'text-gray-800' : 'text-tertiary'}`}>
              {value ?? '—'}
            </span>
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
            <p className="text-[22px] font-bold text-white leading-tight">
              {answeredCount}{' '}
              <span className="text-[14px] font-medium text-blue-200">/ {TOTAL}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold mb-0.5">Est. left</p>
            <p className="text-[22px] font-bold text-white leading-tight">
              {estLeft}{' '}
              <span className="text-[14px] font-medium text-blue-200">min</span>
            </p>
          </div>
        </div>
      </div>

    </aside>
  )
}

AiMatchPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiMatchPanel
