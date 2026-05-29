import { Link } from 'react-router-dom'
import { TbUser, TbMail, TbLock, TbPlus, TbId, TbInfoCircle } from 'react-icons/tb'
import { TiTick, TiEye, TiEyeOutline } from 'react-icons/ti'
import { useSignUp } from '../hooks/useSignUp'
import PasswordStrength from './PasswordStrength'
import InputField from '../../../components/ui/InputField'
import Button from '../../../components/ui/Button'

/**
 * Sign-up form — full name, email, password with strength meter, terms checkbox.
 */
const SignUpForm = () => {
  const {
    register,
    handleSubmit,
    errors,
    isLoading,
    apiError,
    showPassword,
    togglePassword,
    watch,
  } = useSignUp()

  const fullNameValue = watch('fullName')
  const passwordValue = watch('password')
  const isNameValid = !errors.fullName && fullNameValue && fullNameValue.trim().length >= 2

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

      {/* ── Full legal name ── */}
      <InputField
        label="Full legal name"
        type="text"
        placeholder="John A. Doe"
        autoComplete="name"
        error={errors.fullName?.message}
        isValid={!!isNameValid}
        leftElement={<TbUser style={{ fontSize: 14 }} />}
        rightElement={
          isNameValid ? (
            <TiTick className="text-success" style={{ fontSize: 16 }} />
          ) : null
        }
        hintText="As it appears on your government ID"
        hintIcon={<TbId style={{ fontSize: 11 }} />}
        {...register('fullName')}
      />

      {/* ── Email address ── */}
      <InputField
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email?.message}
        leftElement={<TbMail style={{ fontSize: 14 }} />}
        rightElement={
          <span className="text-blue-action cursor-pointer hover:opacity-70 transition-opacity">
            <TbPlus style={{ fontSize: 14 }} />
          </span>
        }
        hintText="Verification code will be sent here"
        hintIcon={<TbInfoCircle style={{ fontSize: 11 }} />}
        {...register('email')}
      />

      {/* ── Password ── */}
      <div className="flex flex-col gap-1">
        <InputField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Create a password"
          autoComplete="new-password"
          error={errors.password?.message}
          leftElement={<TbLock style={{ fontSize: 14 }} />}
          rightElement={
            <button
              type="button"
              onClick={togglePassword}
              className="text-secondary hover:text-navy transition-colors duration-150 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword
                ? <TiEye style={{ fontSize: 16 }} />
                : <TiEyeOutline style={{ fontSize: 16 }} />
              }
            </button>
          }
          {...register('password')}
        />
        <PasswordStrength password={passwordValue || ''} />
      </div>

      {/* ── Terms checkbox ── */}
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('agreeToTerms')}
            className="mt-0.5 w-3.5 h-3.5 rounded accent-navy cursor-pointer shrink-0"
          />
          <span className="text-[11px] text-gray-700 leading-tight">
            I agree to Meridian's{' '}
            <Link to="/terms" className="text-blue-action hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-blue-action hover:underline font-medium">
              Privacy Policy
            </Link>
          </span>
        </label>
        {errors.agreeToTerms && (
          <p className="text-[10px] text-error ml-5">{errors.agreeToTerms.message}</p>
        )}
      </div>

      {/* ── API error banner ── */}
      {apiError && (
        <div className="text-[11px] text-error bg-red-50 border border-error border-opacity-30 rounded-lg px-3 py-2 leading-tight">
          {apiError}
        </div>
      )}

      {/* ── Submit ── */}
      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full py-2.5 text-[13px] font-medium"
      >
        {isLoading ? 'Creating account…' : 'Create account & verify email →'}
      </Button>

      {/* ── Sign in link ── */}
      <p className="text-center text-[11px] text-secondary">
        Already have an account?{' '}
        <Link to="/signin" className="text-blue-action hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}

export default SignUpForm
