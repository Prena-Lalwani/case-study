import {
  TbUser, TbCalendar, TbMapPin, TbMail, TbPhone, TbId,
  TbChevronDown, TbSparkles, TbLock, TbFlag,
  TbCheck, TbAlertTriangle, TbCircle, TbX,
  TbAlertOctagon, TbLoader,
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

const ManualBadge = () => (
  <span className="text-[11px] text-tertiary font-medium uppercase tracking-wide">MANUAL</span>
)

const AiFlagBadge = () => (
  <span className="inline-flex items-center gap-0.5 bg-red-50 text-error border border-red-200 text-[10px] font-semibold px-1.5 py-0.5 rounded">
    <TbFlag style={{ fontSize: 10 }} />
    AI FLAG
  </span>
)

const BADGE_MAP = { ai: AiBadge, encrypted: EncryptedBadge, manual: ManualBadge, 'ai-flag': AiFlagBadge }

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

/**
 * @param {{ label, value, onChange, icon, badges, state, confidence, errorBanner, showClear, onClear, showPending }} props
 */
const FieldBlock = ({
  label, value, onChange, icon: Icon,
  badges = [], state = 'default',
  confidence, errorBanner, showClear, onClear, showPending,
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
    if (showPending) return <TbLoader className="text-tertiary animate-spin" style={{ fontSize: 16 }} />
    return <TbChevronDown className="text-tertiary" style={{ fontSize: 16 }} />
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Label row */}
      <div className="flex items-center justify-between min-h-[18px]">
        <label className="text-[13px] font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5">
          {badges.map((b) => {
            const C = BADGE_MAP[b]
            return C ? <C key={b} /> : null
          })}
        </div>
      </div>

      {/* Input row */}
      <div className={`relative flex items-center h-9 rounded-lg border bg-white transition-colors ${borderClass}`}>
        <span className="absolute left-3 text-tertiary pointer-events-none flex items-center">
          <Icon style={{ fontSize: 16 }} />
        </span>
        <input
          type="text"
          value={value}
          onChange={onChange}
          className="w-full h-full pl-8 pr-9 text-[14px] text-gray-800 bg-transparent outline-none"
        />
        <span className="absolute right-2.5 flex items-center">{rightSlot()}</span>
      </div>

      {/* Below-field content */}
      {errorBanner ? (
        <div className="flex items-start gap-2 mt-0.5 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <TbAlertOctagon className="text-error shrink-0 mt-px" style={{ fontSize: 14 }} />
          <p className="text-[12px] text-gray-700 leading-snug">{errorBanner}</p>
        </div>
      ) : confidence ? (
        <ConfidenceLine {...confidence} />
      ) : null}
    </div>
  )
}

/* ─── Main form ───────────────────────────────────────────────────── */

const PersonalDetailsForm = () => {
  // Read from and write to the shared onboarding context
  const { state, updatePersonalInfo } = useOnboarding()
  const vals = state.personalInfo

  const set   = (key) => (e) => updatePersonalInfo(key, e.target.value)
  const clear = (key) => ()  => updatePersonalInfo(key, '')

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[16px] font-semibold text-gray-800">Personal details</h2>
        <div className="flex items-center gap-2 text-[12px] text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-navy inline-block" />
            <span className="font-medium text-gray-700">3 / 5 verified</span>
          </span>
          <span className="text-gray-300">·</span>
          <span>Last edited 2s ago</span>
        </div>
      </div>

      {/* Row 1: Full name + DOB */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <FieldBlock
          label="Full legal name"
          value={vals.fullName}
          onChange={set('fullName')}
          icon={TbUser}
          badges={['ai']}
          state="valid"
          confidence={{ type: 'success', text: '99% confidence — matched ID' }}
        />
        <FieldBlock
          label="Date of birth"
          value={vals.dob}
          onChange={set('dob')}
          icon={TbCalendar}
          badges={['ai', 'encrypted']}
          state="valid"
          confidence={{ type: 'success', text: '99% confidence — age 41, eligible' }}
        />
      </div>

      {/* Row 2: Address (full width) */}
      <div className="mb-4">
        <FieldBlock
          label="Residential address"
          value={vals.address}
          onChange={set('address')}
          icon={TbMapPin}
          badges={['ai']}
          state="warning"
          confidence={{ type: 'warning', text: '62% confidence — please verify apartment number' }}
        />
      </div>

      {/* Row 3: Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <FieldBlock
          label="Email address"
          value={vals.email}
          onChange={set('email')}
          icon={TbMail}
          badges={['manual']}
          state="default"
          confidence={{ type: 'success', text: 'Verified via code sent 2 min ago' }}
        />
        <FieldBlock
          label="Phone number"
          value={vals.phone}
          onChange={set('phone')}
          icon={TbPhone}
          badges={['manual']}
          state="default"
          showPending
          confidence={{ type: 'pending', text: 'SMS verification pending' }}
        />
      </div>

      {/* Row 4: SSN (full width, error state) */}
      <div>
        <FieldBlock
          label="SSN / National ID"
          value={vals.ssn}
          onChange={set('ssn')}
          icon={TbId}
          badges={['encrypted', 'ai-flag']}
          state="error"
          showClear
          onClear={clear('ssn')}
          errorBanner={
            <>
              <span className="font-semibold text-error">SSN format mismatch</span>
              {' — expected '}
              <span className="font-mono font-medium">XXX-XX-XXXX</span>
              {' · The value entered has 9 digits but no separators.'}
            </>
          }
        />
      </div>
    </section>
  )
}

export default PersonalDetailsForm
