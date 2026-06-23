import PropTypes from 'prop-types'
import {
  TbCircleFilled, TbCircleCheck, TbAlertTriangle, TbX,
  TbCircle, TbLoader, TbSparkles,
} from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

const STATUS_ICON = {
  pass:    { Icon: TbCircleCheck,   cls: 'text-success'    },
  fail:    { Icon: TbX,             cls: 'text-error'      },
  warning: { Icon: TbAlertTriangle, cls: 'text-warning'    },
}

const AiReviewLogPanel = ({ onClose }) => {
  const { state } = useOnboarding()
  const kyc = state.kycReview
  const isLoading = kyc.status === 'loading' || kyc.status === null
  const isSuccess = kyc.status === 'done'
  const checks    = kyc.result?.checks ?? []

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">✦</span>
          <span className="text-[16px] font-semibold text-gray-800">KYC checks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${isSuccess ? 'bg-green-50' : 'bg-gray-50'}`}>
            {isLoading
              ? <TbLoader className="text-indigo-500 animate-spin" style={{ fontSize: 9 }} />
              : <TbCircleFilled className={isSuccess ? 'text-success' : 'text-gray-300'} style={{ fontSize: 6 }} />
            }
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSuccess ? 'text-success' : isLoading ? 'text-indigo-500' : 'text-tertiary'}`}>
              {isLoading ? 'Running' : isSuccess ? 'Done' : 'Error'}
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors" aria-label="Close">
              <TbX style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3 py-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <TbLoader className="text-indigo-500 animate-spin" style={{ fontSize: 20 }} />
          </div>
          <p className="text-[13px] text-secondary leading-snug">
            Agent is reviewing your submission — results will appear here.
          </p>
        </div>
      )}

      {/* Check results */}
      {isSuccess && checks.length > 0 && (
        <ul className="flex flex-col divide-y divide-gray-50">
          {checks.map((check) => {
            const iconCfg = STATUS_ICON[check.status] ?? { Icon: TbCircle, cls: 'text-gray-300' }
            const { Icon } = iconCfg
            return (
              <li key={check.label} className="flex items-start gap-2.5 px-4 py-3">
                <Icon className={`${iconCfg.cls} shrink-0 mt-0.5`} style={{ fontSize: 16 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 leading-tight">{check.label}</p>
                  <p className="text-[12px] text-secondary leading-tight mt-0.5">{check.note}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Score + model card */}
      {isSuccess && (
        <div className="mx-4 mt-4 bg-navy rounded-xl px-4 py-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TbSparkles className="text-indigo-300" style={{ fontSize: 12 }} />
            <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-widest">Compliance score</span>
          </div>
          <p className="text-[32px] font-bold text-white leading-tight">
            {kyc.result?.score ?? '—'}
            <span className="text-[16px] font-medium text-blue-200"> / 100</span>
          </p>
          <p className={`text-[12px] font-semibold mt-1 ${
            kyc.result?.overallStatus === 'APPROVED'     ? 'text-green-300'
            : kyc.result?.overallStatus === 'REJECTED'  ? 'text-red-300'
            : 'text-amber-300'
          }`}>
            {kyc.result?.overallStatus?.replace('_', ' ')}
          </p>
        </div>
      )}
    </aside>
  )
}

AiReviewLogPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiReviewLogPanel
