import { Link } from 'react-router-dom'
import { FcGoogle } from 'react-icons/fc'
import { useSignIn } from '../hooks/useSignIn'
import EmailField from './EmailField'
import PasswordField from './PasswordField'
import Button from '../../../components/ui/Button'
import Divider from '../../../components/ui/Divider'

/**
 * Main sign-in form — composes all field components and drives submission via useSignIn hook.
 */
const SignInForm = () => {
  const {
    register,
    handleSubmit,
    errors,
    isLoading,
    apiError,
    showPassword,
    togglePassword,
    watch,
  } = useSignIn()

  const emailValue = watch('email')
  const isEmailValid = !errors.email && emailValue && (emailValue === 'admin' || emailValue.includes('@'))

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3.5">
      {/* Heading */}
      <div className="mb-0.5">
        <h1 className="text-[22px] font-medium text-gray-900 leading-tight m-0">
          Welcome back
        </h1>
        <p className="text-[11px] text-secondary mt-0.5">
          Sign in to your account. All sessions are 256-bit encrypted.
        </p>
      </div>

      {/* Email */}
      <EmailField
        register={register('email')}
        error={errors.email?.message}
        isValid={!!isEmailValid}
      />

      {/* Password */}
      <PasswordField
        register={register('password')}
        error={errors.password?.message}
        showPassword={showPassword}
        togglePassword={togglePassword}
      />

      {/* Remember me */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          {...register('rememberMe')}
          className="w-3.5 h-3.5 rounded accent-navy cursor-pointer"
        />
        <span className="text-[10px] text-gray-700">Remember this device for 30 days</span>
      </label>

      {/* API error banner */}
      {apiError && (
        <div className="text-[11px] text-error bg-red-50 border border-error border-opacity-30 rounded-lg px-3 py-2 leading-tight">
          {apiError}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        className="w-full py-2.5 text-[13px] font-medium"
      >
        {isLoading ? 'Signing in…' : 'Sign in →'}
      </Button>

      {/* Bottom link */}
      <p className="text-center text-[11px] text-secondary mt-0.5">
        New to Meridian?{' '}
        <Link to="/signup" className="text-blue-action hover:underline font-medium">
          Create account
        </Link>
      </p>

      {/* Divider */}
      <Divider label="OR" />

      {/* Google sign-in */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 bg-white border rounded-lg px-3 py-2.5 text-[12px] text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-150"
        style={{ borderColor: '#e0e0e0', borderWidth: '0.5px' }}
      >
        <FcGoogle style={{ fontSize: 16, flexShrink: 0 }} />
        <span>Continue with Google</span>
      </button>
    </form>
  )
}

export default SignInForm
