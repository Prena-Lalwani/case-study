import PropTypes from 'prop-types'
import { TiTick } from 'react-icons/ti'
import InputField from '../../../components/ui/InputField'

/**
 * Email input with live validation state (valid → green check, invalid → red border + message).
 * @param {{ register: object, error?: string, isValid: boolean }} props
 */
const EmailField = ({ register, error, isValid }) => {
  const checkIcon = isValid ? (
    <TiTick className="text-success" style={{ fontSize: 16 }} />
  ) : null

  return (
    <InputField
      label="Username or email"
      type="text"
      placeholder="you@email.com"
      autoComplete="username"
      error={error}
      isValid={isValid}
      rightElement={checkIcon}
      {...register}
    />
  )
}

EmailField.propTypes = {
  register: PropTypes.object.isRequired,
  error: PropTypes.string,
  isValid: PropTypes.bool.isRequired,
}

export default EmailField
