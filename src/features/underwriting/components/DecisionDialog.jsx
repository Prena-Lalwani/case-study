import { useEffect, useState } from 'react'
import { TbLoader2, TbX } from 'react-icons/tb'

/*
 * Reusable decision dialog — replaces native confirm()/prompt() (which Chrome
 * suppresses after the first, making buttons look dead mid-demo).
 *
 * Drive it with a `decision` config object (or null to close):
 *   {
 *     title, message,
 *     confirmLabel,                       // button text
 *     tone: 'success'|'danger'|'warning'|'primary',
 *     requireReason: bool, reasonLabel,   // shows a textarea; gates confirm when required
 *     run: (reason) => Promise|void,      // invoked on confirm
 *   }
 *
 * Closes on Esc / backdrop / Cancel. Confirm is disabled while `busy`.
 */
const TONE = {
  success: 'bg-success',
  danger:  'bg-error',
  warning: 'bg-warning',
  primary: 'bg-blue-action',
}

const DecisionDialog = ({ decision, busy = false, error = null, onCancel }) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!decision) return
    setReason('')
    const onKey = e => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [decision, busy, onCancel])

  if (!decision) return null

  const tone = TONE[decision.tone] ?? TONE.primary
  const needsReason = !!decision.requireReason
  const canConfirm = !busy && (!needsReason || reason.trim().length > 0)

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={() => !busy && onCancel()} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[460px] p-6">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="text-[16px] font-bold text-gray-900 leading-snug">{decision.title}</h3>
          <button
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className="p-1.5 rounded-lg text-tertiary hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40 shrink-0"
            aria-label="Close"
          >
            <TbX style={{ fontSize: 16 }} />
          </button>
        </div>

        {decision.message && (
          <p className="text-[13px] text-secondary leading-relaxed">{decision.message}</p>
        )}

        {(needsReason || decision.reasonLabel) && (
          <>
            <label className="block text-[12px] font-medium text-gray-700 mt-4 mb-1.5">
              {decision.reasonLabel ?? 'Reason'}{needsReason && <span className="text-error"> *</span>}
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, 500))}
              rows={3}
              autoFocus
              placeholder={needsReason ? 'Required — recorded on the record…' : 'Optional…'}
              className="w-full text-[13px] text-gray-800 placeholder:text-tertiary border border-gray-200 rounded-lg px-3 py-2.5 resize-none outline-none focus:border-blue-action transition-colors"
            />
          </>
        )}

        {error && <p className="text-[12px] text-error mt-2.5">{error}</p>}

        <div className="flex justify-end gap-2.5 mt-4">
          <button
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => decision.run(reason.trim())}
            disabled={!canConfirm}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${tone}`}
          >
            {busy ? <><TbLoader2 className="animate-spin" style={{ fontSize: 13 }} /> Working…</> : decision.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DecisionDialog
