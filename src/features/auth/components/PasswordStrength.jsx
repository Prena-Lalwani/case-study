import PropTypes from 'prop-types'
import { TiTick } from 'react-icons/ti'

/** Computes 0-4 strength score from password string */
const getScore = (pwd) => {
  let s = 0
  if (pwd.length >= 8) s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}

const SCORE_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const SCORE_COLOR = ['', 'text-error', 'text-warning', 'text-blue-action', 'text-success']
const BAR_COLOR  = ['', 'bg-error', 'bg-warning', 'bg-blue-action', 'bg-success']

const checks = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter',  test: (p) => /[A-Z]/.test(p) },
  { label: 'One number',            test: (p) => /[0-9]/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

/**
 * Password strength meter — shows a 4-segment bar, score label, and a 2×2 requirement checklist.
 * @param {{ password: string }} props
 */
const PasswordStrength = ({ password }) => {
  if (!password) return null

  const score = getScore(password)

  return (
    <div className="flex flex-col gap-2 mt-0.5">
      {/* Strength bar + label */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? BAR_COLOR[score] : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        {score > 0 && (
          <span className={`text-[10px] font-semibold ${SCORE_COLOR[score]}`}>
            {SCORE_LABEL[score]}
          </span>
        )}
      </div>

      {/* Requirements checklist — 2-column grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {checks.map(({ label, test }) => {
          const met = test(password)
          return (
            <div key={label} className="flex items-center gap-1.5">
              {met ? (
                <span className="w-[14px] h-[14px] rounded-full bg-success flex items-center justify-center shrink-0">
                  <TiTick className="text-white" style={{ fontSize: 10 }} />
                </span>
              ) : (
                <span className="w-[14px] h-[14px] rounded-full border border-gray-300 shrink-0" />
              )}
              <span className={`text-[10px] leading-tight ${met ? 'text-gray-700' : 'text-tertiary'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

PasswordStrength.propTypes = {
  password: PropTypes.string.isRequired,
}

export default PasswordStrength
