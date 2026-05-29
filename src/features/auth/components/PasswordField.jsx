import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { TiEye, TiEyeOutline } from 'react-icons/ti'
import InputField from '../../../components/ui/InputField'

/**
 * Password input with show/hide toggle and "Forgot password?" link.
 * Focused state applies navy 1.5px border via InputField's isValid=false + no-error class.
 * @param {{ register: object, error?: string, showPassword: boolean, togglePassword: () => void }} props
 */
const PasswordField = ({ register, error, showPassword, togglePassword }) => {
  const eyeIcon = (
    <button
      type="button"
      onClick={togglePassword}
      className="text-secondary hover:text-navy transition-colors duration-150 focus:outline-none"
      tabIndex={-1}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <TiEye style={{ fontSize: 16 }} />
      ) : (
        <TiEyeOutline style={{ fontSize: 16 }} />
      )}
    </button>
  )

  return (
    <div className="flex flex-col gap-1">
      <InputField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        error={error}
        rightElement={eyeIcon}
        {...register}
      />
      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className="text-[10px] text-blue-action hover:underline"
        >
          Forgot password?
        </Link>
      </div>
    </div>
  )
}

PasswordField.propTypes = {
  register: PropTypes.object.isRequired,
  error: PropTypes.string,
  showPassword: PropTypes.bool.isRequired,
  togglePassword: PropTypes.func.isRequired,
}

export default PasswordField
