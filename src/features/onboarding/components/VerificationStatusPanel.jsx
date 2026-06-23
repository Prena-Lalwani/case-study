import PropTypes from 'prop-types'
import {
  TbCircle, TbCircleCheck, TbLoader, TbX, TbAlertTriangle,
  TbCircleFilled,
} from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

/* ─── Step icon + label per status ──────────────────────────────── */
const StepIcon = ({ status }) => {
  if (status === 'complete')    return <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 16 }} />
  if (status === 'in_progress') return <TbLoader className="text-indigo-500 animate-spin shrink-0" style={{ fontSize: 16 }} />
  if (status === 'failed')      return <TbAlertTriangle className="text-error shrink-0" style={{ fontSize: 16 }} />
  return <TbCircle className="text-gray-300 shrink-0" style={{ fontSize: 16 }} />
}

const STATUS_LABEL = {
  complete:    { text: 'DONE',        cls: 'text-success'       },
  in_progress: { text: 'SCANNING',    cls: 'text-indigo-500'    },
  failed:      { text: 'FAILED',      cls: 'text-error'         },
  pending:     { text: 'PENDING',     cls: 'text-tertiary'      },
}

/* ─── Header badge ───────────────────────────────────────────────── */
const HeaderBadge = ({ verStatus }) => {
  if (verStatus === 'verified') return (
    <div className="flex items-center gap-1 bg-green-50 rounded px-1.5 py-0.5">
      <TbCircleFilled className="text-success" style={{ fontSize: 6 }} />
      <span className="text-[10px] font-semibold text-success uppercase tracking-wide">Verified</span>
    </div>
  )
  if (verStatus === 'received') return (
    <div className="flex items-center gap-1 bg-blue-50 rounded px-1.5 py-0.5">
      <TbCircleFilled className="text-blue-action" style={{ fontSize: 6 }} />
      <span className="text-[10px] font-semibold text-blue-action uppercase tracking-wide">Received</span>
    </div>
  )
  if (verStatus === 'scanning') return (
    <div className="flex items-center gap-1 bg-indigo-50 rounded px-1.5 py-0.5">
      <TbCircleFilled className="text-indigo-500" style={{ fontSize: 6 }} />
      <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Scanning</span>
    </div>
  )
  if (verStatus === 'failed') return (
    <div className="flex items-center gap-1 bg-red-50 rounded px-1.5 py-0.5">
      <TbCircleFilled className="text-error" style={{ fontSize: 6 }} />
      <span className="text-[10px] font-semibold text-error uppercase tracking-wide">Failed</span>
    </div>
  )
  return (
    <div className="flex items-center gap-1 bg-orange-50 rounded px-1.5 py-0.5">
      <TbCircleFilled className="text-warning" style={{ fontSize: 6 }} />
      <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">Ready</span>
    </div>
  )
}

/* ─── Panel ──────────────────────────────────────────────────────── */
const VerificationStatusPanel = ({ onClose }) => {
  const { state } = useOnboarding()
  const steps     = state.identity.steps
  const verStatus = state.identity.verificationStatus
  const hasSteps  = steps.length > 0

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">✦</span>
          <span className="text-[16px] font-semibold text-gray-800">Verification status</span>
        </div>
        <div className="flex items-center gap-2">
          <HeaderBadge verStatus={verStatus} />
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

      {/* Empty state */}
      {!hasSteps && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3 py-8">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <TbCircle className="text-tertiary" style={{ fontSize: 20 }} />
          </div>
          <p className="text-[13px] text-secondary leading-snug">
            Select a verification method and start scanning to see live status here.
          </p>
        </div>
      )}

      {/* Live step list */}
      {hasSteps && (
        <ul className="flex flex-col divide-y divide-gray-50">
          {steps.map((step) => {
            const badge = STATUS_LABEL[step.status] ?? STATUS_LABEL.pending
            return (
              <li key={step.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <StepIcon status={step.status} />
                  <span className={`text-[14px] ${step.status === 'in_progress' ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {step.label}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold uppercase tracking-wide ${badge.cls}`}>
                  {badge.text}
                </span>
              </li>
            )
          })}
        </ul>
      )}

    </aside>
  )
}

VerificationStatusPanel.propTypes = {
  onClose: PropTypes.func,
}

export default VerificationStatusPanel
