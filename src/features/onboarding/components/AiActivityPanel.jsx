import { useRef } from 'react'
import PropTypes from 'prop-types'
import { TbCircleFilled, TbX, TbSparkles } from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

/* ─── Field metadata — label + display order ─────────────────────── */
const FIELD_META = {
  fullName: { label: 'Full name',           order: 1 },
  dob:      { label: 'Date of birth',       order: 2 },
  address:  { label: 'Residential address', order: 3 },
  email:    { label: 'Email address',       order: 4 },
  phone:    { label: 'Phone number',        order: 5 },
  ssn:      { label: 'National ID / SSN',   order: 6 },
}

/* ─── Derive activity entries from aiConfidence + personalInfo ───── */
const deriveEntries = (conf, vals, errs) =>
  Object.entries(conf)
    .filter(([key]) => FIELD_META[key])
    .sort(([a], [b]) => FIELD_META[a].order - FIELD_META[b].order)
    .map(([key, score]) => {
      const label = FIELD_META[key].label
      const err   = errs[key]

      // Extracted but failed a business rule — red regardless of confidence
      if (err) return {
        key,
        color:  'text-error',
        title:  `${label} — validation failed`,
        detail: err,
      }

      if (score >= 90) return {
        key,
        color:  'text-success',
        title:  `${label} extracted`,
        detail: vals[key] || `${score}% confidence`,
      }

      if (score > 0) return {
        key,
        color:  'text-warning',
        title:  `${label} — low confidence`,
        detail: `${score}% — please verify manually`,
      }

      return {
        key,
        color:  'text-error',
        title:  `${label} not found`,
        detail: 'Not present on document',
      }
    })

/* ─── Format a Date as HH:MM:SS ─────────────────────────────────── */
const fmtTime = (d) =>
  d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

/* ─── Panel ──────────────────────────────────────────────────────── */
const AiActivityPanel = ({ onClose }) => {
  const { state } = useOnboarding()
  const conf = state.aiConfidence
  const vals = state.personalInfo
  const errs = state.aiValidationErrors

  const hasData = Object.keys(conf).length > 0

  // Capture extraction time once — stays stable across re-renders
  const extractedAtRef = useRef(null)
  if (hasData && !extractedAtRef.current) {
    extractedAtRef.current = new Date()
  }
  if (!hasData) extractedAtRef.current = null

  const entries    = hasData ? deriveEntries(conf, vals, errs) : []
  const extractedAt = extractedAtRef.current

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px]">✦</span>
          <span className="text-[16px] font-semibold text-gray-800">AI activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded px-1.5 py-0.5 ${hasData ? 'bg-green-50' : 'bg-gray-50'}`}>
            <TbCircleFilled
              className={hasData ? 'text-success' : 'text-gray-300'}
              style={{ fontSize: 6 }}
            />
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${hasData ? 'text-success' : 'text-tertiary'}`}>
              {hasData ? 'Done' : 'Waiting'}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-secondary transition-colors"
              aria-label="Close AI activity"
            >
              <TbX style={{ fontSize: 14 }} />
            </button>
          )}
        </div>
      </div>

      {/* Empty state — before any upload */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <TbSparkles className="text-tertiary" style={{ fontSize: 20 }} />
          </div>
          <p className="text-[13px] text-secondary leading-snug">
            Upload your ID above and AI extraction results will appear here.
          </p>
        </div>
      )}

      {/* Activity entries — derived from Gemini response */}
      {hasData && (
        <>
          <div className="px-4 py-2 border-b border-gray-50">
            <p className="text-[11px] text-tertiary">
              Extracted at {extractedAt ? fmtTime(extractedAt) : '—'} · Gemini 2.5 Flash
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-gray-50 overflow-y-auto">
            {entries.map((item) => (
              <li key={item.key} className="flex items-start gap-2 px-4 py-3">
                <TbCircleFilled className={`${item.color} shrink-0 mt-1`} style={{ fontSize: 14 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-800 leading-tight">{item.title}</p>
                  <p className="text-[12px] text-secondary leading-tight mt-0.5 truncate">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}

AiActivityPanel.propTypes = {
  onClose: PropTypes.func,
}

export default AiActivityPanel
