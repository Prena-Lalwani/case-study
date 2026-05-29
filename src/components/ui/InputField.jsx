import PropTypes from 'prop-types'

/**
 * Reusable input with optional left/right icon slots, label, and inline validation state.
 * @param {{ label?: string, error?: string, isValid?: boolean, leftElement?: React.ReactNode, rightElement?: React.ReactNode, hintText?: string, hintIcon?: React.ReactNode, labelUppercase?: boolean, className?: string }} props
 */
const InputField = ({
  label,
  error,
  isValid,
  leftElement,
  rightElement,
  hintText,
  hintIcon,
  labelUppercase = false,
  className = '',
  ...inputProps
}) => {
  const borderClass = error
    ? 'border-error focus:border-error'
    : isValid
    ? 'border-success focus:border-success'
    : 'border-border-default focus:border-navy'

  const labelClass = labelUppercase
    ? 'text-[9px] uppercase tracking-[0.07em] text-tertiary font-medium'
    : 'text-[11px] text-secondary font-medium'

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className={labelClass}>{label}</label>
      )}

      <div className="relative flex items-center">
        {leftElement && (
          <span className="absolute left-2.5 flex items-center text-tertiary pointer-events-none">
            {leftElement}
          </span>
        )}
        <input
          className={`
            w-full h-9 rounded-lg text-[13px] text-gray-800 bg-white outline-none
            transition-all duration-150 placeholder:text-tertiary
            border focus:border-[1.5px]
            ${leftElement ? 'pl-8' : 'pl-3'}
            ${rightElement ? 'pr-9' : 'pr-3'}
            ${borderClass}
          `}
          {...inputProps}
        />
        {rightElement && (
          <span className="absolute right-2.5 flex items-center">
            {rightElement}
          </span>
        )}
      </div>

      {hintText && !error && (
        <p className="flex items-center gap-1 text-[10px] text-tertiary leading-tight">
          {hintIcon && <span className="shrink-0">{hintIcon}</span>}
          {hintText}
        </p>
      )}

      {error && (
        <p className="text-[10px] text-error leading-tight">{error}</p>
      )}
    </div>
  )
}

InputField.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  isValid: PropTypes.bool,
  leftElement: PropTypes.node,
  rightElement: PropTypes.node,
  hintText: PropTypes.string,
  hintIcon: PropTypes.node,
  labelUppercase: PropTypes.bool,
  className: PropTypes.string,
}

export default InputField
