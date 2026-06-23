import {
  TbUser, TbCalendar, TbMapPin, TbMail, TbPhone, TbId,
  TbChevronDown, TbSparkles, TbLock, TbFlag,
  TbCheck, TbAlertTriangle, TbCircle, TbX,
  TbAlertOctagon,
} from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

/* ─── Badge atoms ─────────────────────────────────────────────────── */

const AiBadge = () => (
  <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-500 text-[10px] font-semibold px-1.5 py-0.5 rounded">
    <TbSparkles style={{ fontSize: 10 }} />
    AI
  </span>
)

const EncryptedBadge = () => (
  <span className="inline-flex items-center gap-0.5 bg-gray-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
    <TbLock style={{ fontSize: 10 }} />
    ENCRYPTED
  </span>
)

const AiFlagBadge = () => (
  <span className="inline-flex items-center gap-0.5 bg-red-50 text-error border border-red-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
    <TbFlag style={{ fontSize: 10 }} />
    AI FLAG
  </span>
)

const BADGE_MAP = { ai: AiBadge, encrypted: EncryptedBadge, 'ai-flag': AiFlagBadge }

/* ─── Confidence line ─────────────────────────────────────────────── */

const ConfidenceLine = ({ type, text }) => {
  if (type === 'success') return (
    <p className="flex items-center gap-1 text-[12px] text-success leading-tight">
      <TbCheck style={{ fontSize: 13 }} />{text}
    </p>
  )
  if (type === 'warning') return (
    <p className="flex items-center gap-1 text-[12px] text-warning leading-tight">
      <TbAlertTriangle style={{ fontSize: 13 }} />{text}
    </p>
  )
  if (type === 'pending') return (
    <p className="flex items-center gap-1 text-[12px] text-tertiary leading-tight">
      <TbCircle style={{ fontSize: 13 }} />{text}
    </p>
  )
  return null
}

/* ─── Generic field block ─────────────────────────────────────────── */

const FieldBlock = ({
  label, value, onChange, icon: Icon,
  badges = [], state = 'default',
  confidence, errorBanner, showClear, onClear,
}) => {
  const borderClass = {
    valid:   'border-success',
    warning: 'border-warning',
    error:   'border-error',
    default: 'border-gray-200',
  }[state]

  const rightSlot = () => {
    if (showClear) return (
      <button
        type="button" onClick={onClear}
        className="w-5 h-5 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
      >
        <TbX className="text-error" style={{ fontSize: 12 }} />
      </button>
    )
    if (state === 'warning') return <TbAlertTriangle className="text-warning" style={{ fontSize: 16 }} />
    if (state === 'valid')   return <TbCheck className="text-success" style={{ fontSize: 16 }} />
    return <TbChevronDown className="text-tertiary" style={{ fontSize: 16 }} />
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between min-h-[18px]">
        <label className="text-[13px] font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5">
          {badges.map((b) => {
            const C = BADGE_MAP[b]
            return C ? <C key={b} /> : null
          })}
        </div>
      </div>

      <div className={`relative flex items-center h-9 rounded-lg border bg-white transition-colors ${borderClass}`}>
        <span className="absolute left-3 text-tertiary pointer-events-none flex items-center">
          <Icon style={{ fontSize: 16 }} />
        </span>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder="—"
          className="w-full h-full pl-8 pr-9 text-[14px] text-gray-800 bg-transparent outline-none placeholder:text-gray-300"
        />
        <span className="absolute right-2.5 flex items-center">{rightSlot()}</span>
      </div>

      {confidence && <ConfidenceLine {...confidence} />}
      {errorBanner && (
        <div className="flex items-start gap-2 mt-0.5 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <TbAlertOctagon className="text-error shrink-0 mt-px" style={{ fontSize: 14 }} />
          <p className="text-[12px] text-gray-700 leading-snug">{errorBanner}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Derive field props from Gemini confidence + validation error ── */

const fieldProps = (conf, validationError) => {
  if (!conf || conf === 0) return { badges: [], state: 'default', confidence: null, errorBanner: null }

  // Extracted but failed a business rule → red, show both confidence + error
  if (validationError) return {
    badges:      ['ai'],
    state:       'error',
    confidence:  { type: 'warning', text: `${conf}% confidence` },
    errorBanner: validationError,
  }

  if (conf >= 90) return {
    badges:      ['ai'],
    state:       'valid',
    confidence:  { type: 'success', text: `${conf}% confidence — AI verified` },
    errorBanner: null,
  }

  return {
    badges:      ['ai'],
    state:       'warning',
    confidence:  { type: 'warning', text: `${conf}% confidence — please verify` },
    errorBanner: null,
  }
}

const ssnFieldProps = (conf, validationError) => {
  if (!conf || conf === 0) return { badges: ['encrypted'], state: 'default', confidence: null, showClear: false, errorBanner: null }

  if (validationError) return {
    badges:      ['ai', 'encrypted'],
    state:       'error',
    confidence:  { type: 'warning', text: `${conf}% confidence` },
    showClear:   true,
    errorBanner: validationError,
  }

  if (conf >= 90) return {
    badges:      ['ai', 'encrypted'],
    state:       'valid',
    confidence:  { type: 'success', text: `${conf}% confidence` },
    showClear:   false,
    errorBanner: null,
  }

  return {
    badges:      ['encrypted', 'ai-flag'],
    state:       'error',
    confidence:  { type: 'warning', text: `${conf}% confidence` },
    showClear:   true,
    errorBanner: 'AI could not read the ID number clearly. Please enter it manually.',
  }
}

/* ─── Main form ───────────────────────────────────────────────────── */

const MAIN_FIELDS = ['fullName', 'dob', 'address', 'email', 'phone']

const PersonalDetailsForm = () => {
  const { state, updatePersonalInfo } = useOnboarding()
  const vals   = state.personalInfo
  const conf   = state.aiConfidence
  const errors = state.aiValidationErrors

  const set   = (key) => (e) => updatePersonalInfo(key, e.target.value)
  const clear = (key) => ()  => updatePersonalInfo(key, '')

  // Count main fields where Gemini returned confidence >= 90
  const verifiedCount = MAIN_FIELDS.filter(k => (conf[k] ?? 0) >= 90).length
  const hasAnyData    = MAIN_FIELDS.some(k => (conf[k] ?? 0) > 0)

  const ssn = ssnFieldProps(conf.ssn, errors.ssn)

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-gray-800">Personal details</h2>
        <div className="flex items-center gap-2 text-[12px]">
          {hasAnyData ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
              <span className="font-medium text-gray-700">{verifiedCount} / 5 verified</span>
            </span>
          ) : (
            <span className="text-tertiary">Upload ID to auto-fill</span>
          )}
        </div>
      </div>

      {/* Row 1: Full name + DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <FieldBlock
          label="Full legal name"
          value={vals.fullName}
          onChange={set('fullName')}
          icon={TbUser}
          {...fieldProps(conf.fullName, errors.fullName)}
        />
        <FieldBlock
          label="Date of birth"
          value={vals.dob}
          onChange={set('dob')}
          icon={TbCalendar}
          {...fieldProps(conf.dob, errors.dob)}
        />
      </div>

      {/* Row 2: Address */}
      <div className="mb-4">
        <FieldBlock
          label="Residential address"
          value={vals.address}
          onChange={set('address')}
          icon={TbMapPin}
          {...fieldProps(conf.address, errors.address)}
        />
      </div>

      {/* Row 3: Email + Phone — also AI extracted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <FieldBlock
          label="Email address"
          value={vals.email}
          onChange={set('email')}
          icon={TbMail}
          {...fieldProps(conf.email, errors.email)}
        />
        <FieldBlock
          label="Phone number"
          value={vals.phone}
          onChange={set('phone')}
          icon={TbPhone}
          {...fieldProps(conf.phone, errors.phone)}
        />
      </div>

      {/* Row 4: SSN / National ID */}
      <div>
        <FieldBlock
          label="SSN / National ID"
          value={vals.ssn}
          onChange={set('ssn')}
          icon={TbId}
          onClear={ssn.showClear ? clear('ssn') : undefined}
          badges={ssn.badges}
          state={ssn.state}
          confidence={ssn.confidence}
          showClear={ssn.showClear}
          errorBanner={ssn.errorBanner}
        />
      </div>
    </section>
  )
}

export default PersonalDetailsForm
