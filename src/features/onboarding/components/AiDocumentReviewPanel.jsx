import PropTypes from 'prop-types'
import { TbCircle, TbCircleCheck, TbCircleFilled, TbX, TbFile } from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

const SLOTS = [
  { key: 'govId',          label: 'Government ID',    sub: { received: 'Pending AI review at Step 4', awaiting: 'Not yet uploaded' } },
  { key: 'proofOfAddress', label: 'Proof of address', sub: { received: 'Pending AI review at Step 4', awaiting: 'Not yet uploaded' } },
  { key: 'bankStatement',  label: 'Bank statement',   sub: { received: 'Pending AI review at Step 4', awaiting: 'Not yet uploaded' } },
]

const AiDocumentReviewPanel = ({ onClose }) => {
  const { state, documentsReceived } = useOnboarding()
  const docs = state.documents

  // Gov-id might be pre-received from Step 2
  const govIdStep2 =
    state.identity.method === 'gov-id' &&
    (state.identity.verificationStatus === 'received' || state.identity.verificationStatus === 'verified')

  // govId is received either via context or carried from Step 2
  const effectiveGovId = docs.govId?.status === 'received' || govIdStep2 ? 'received' : null

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px]">✦</span>
          <span className="text-[16px] font-semibold text-gray-800">Document status</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${documentsReceived === 3 ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <TbCircleFilled
              className={documentsReceived === 3 ? 'text-blue-action' : 'text-gray-300'}
              style={{ fontSize: 6 }}
            />
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${documentsReceived === 3 ? 'text-blue-action' : 'text-tertiary'}`}>
              {documentsReceived === 3 ? 'All received' : `${documentsReceived} of 3`}
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors" aria-label="Close">
              <TbX style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      </div>

      {/* Document list */}
      <ul className="flex flex-col divide-y divide-gray-50">
        {SLOTS.map(({ key, label, sub }) => {
          const received = key === 'govId' ? effectiveGovId === 'received' : docs[key]?.status === 'received'
          return (
            <li key={key} className="flex items-center justify-between px-4 py-3 gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                {received
                  ? <TbCircleCheck className="text-blue-action shrink-0 mt-0.5" style={{ fontSize: 16 }} />
                  : <TbCircle className="text-gray-300 shrink-0 mt-0.5" style={{ fontSize: 16 }} />
                }
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-800 leading-tight">{label}</p>
                  <p className="text-[12px] text-secondary leading-tight mt-0.5">
                    {received ? sub.received : sub.awaiting}
                  </p>
                </div>
              </div>
              <span className={`text-[11px] font-semibold uppercase tracking-wide shrink-0 ${received ? 'text-blue-action' : 'text-tertiary'}`}>
                {received ? 'RECEIVED' : 'AWAITING'}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Info card */}
      <div className="mx-4 mt-4 bg-navy rounded-xl px-4 py-4">
        <div className="flex items-center gap-1.5 mb-2">
          <TbFile className="text-blue-300" style={{ fontSize: 13 }} />
          <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-widest">AI review</span>
        </div>
        <p className="text-[15px] font-semibold text-white leading-snug mb-1">
          Documents reviewed at Step 4
        </p>
        <p className="text-[12px] text-blue-200 leading-snug">
          All uploaded documents are sent together for AI analysis — authenticity, data extraction, and fraud detection run in one pass.
        </p>
      </div>
    </aside>
  )
}

AiDocumentReviewPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiDocumentReviewPanel
