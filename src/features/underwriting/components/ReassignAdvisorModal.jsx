import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { TbStar, TbUserStar, TbX } from 'react-icons/tb'
import { useAdvisors } from '../hooks/useAdvisors'

const ReassignAdvisorModal = ({ open, onClose, onSubmit, flowKey, currentAdvisorId, aiPickAdvisorId }) => {
  const advisors = useAdvisors()
  const [selected, setSelected] = useState('')
  const [reason, setReason]     = useState('')
  const [busy, setBusy]         = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (!open) return
    setSelected(currentAdvisorId ?? '')
    setReason('')
    setError(null)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, currentAdvisorId])

  if (!open) return null

  /* Show all advisors but prefer those whose `focus` covers the engagement's flow */
  const ranked = [...advisors].sort((a, b) => {
    const aMatch = (a.focus ?? []).includes(flowKey) ? 1 : 0
    const bMatch = (b.focus ?? []).includes(flowKey) ? 1 : 0
    return bMatch - aMatch
  })

  const submit = async () => {
    if (!selected) { setError('Pick an advisor'); return }
    if (selected === currentAdvisorId && !reason.trim()) {
      setError('Same advisor selected — add a reason or pick someone else')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(selected, reason.trim())
      onClose()
    } catch (err) {
      setError(err.message ?? 'Reassign failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45" onClick={busy ? undefined : onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-action flex items-center justify-center">
              <TbUserStar style={{ fontSize: 18 }} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">Reassign advisor</h2>
              <p className="text-[12px] text-secondary mt-0.5">Pick a different advisor for this engagement</p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors disabled:opacity-40">
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-gray-50/50">
          <p className="text-[12px] font-medium text-gray-700 mb-2">Advisor</p>
          <div className="space-y-1.5">
            {ranked.map(a => {
              const isAi      = a.id === aiPickAdvisorId
              const isCurrent = a.id === currentAdvisorId
              const isPicked  = selected === a.id
              const handles   = (a.focus ?? []).includes(flowKey)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    isPicked
                      ? 'border-blue-action bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {a.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-gray-900 truncate">{a.name}</span>
                      {isAi && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <TbStar style={{ fontSize: 9 }} /> AI pick
                        </span>
                      )}
                      {isCurrent && !isAi && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-gray-100 text-secondary border border-gray-200">
                          Current
                        </span>
                      )}
                      {!handles && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-orange-50 text-warning border border-orange-200">
                          Outside focus
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary truncate">{a.specialty}</p>
                    <p className="text-[10.5px] text-tertiary mt-0.5">
                      {a.yearsExperience} yrs · {a.clientLoad} clients
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mt-5">
            <p className="text-[12px] font-medium text-gray-700 mb-1.5">Reason for reassignment (optional)</p>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Client requested an advisor fluent in Spanish"
              rows={3}
              className="w-full text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-action transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-error mt-3">{error}</p>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0 bg-white">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !selected}
            className="px-4 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Reassigning…' : 'Confirm reassignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

ReassignAdvisorModal.propTypes = {
  open:             PropTypes.bool.isRequired,
  onClose:          PropTypes.func.isRequired,
  onSubmit:         PropTypes.func.isRequired,
  flowKey:          PropTypes.string,
  currentAdvisorId: PropTypes.string,
  aiPickAdvisorId:  PropTypes.string,
}

export default ReassignAdvisorModal
