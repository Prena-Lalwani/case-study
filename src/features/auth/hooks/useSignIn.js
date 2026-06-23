import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { signInSchema } from '../schemas/signInSchema'
import { signIn as authSignIn } from '../auth'

/* Hardcoded demo credentials for the PoC. */
const DEMO_USERNAME = 'admin'
const DEMO_PASSWORD = 'admin098'

/**
 * Encapsulates all sign-in form logic: validation, API call, navigation.
 * @returns {{ register, handleSubmit, errors, isLoading, apiError, showPassword, togglePassword, watch }}
 */
export const useSignIn = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  const togglePassword = () => setShowPassword((prev) => !prev)

  const onSubmit = async (data) => {
    setApiError('')
    setIsLoading(true)

    /* Simulate a brief loading delay so the UX still feels real */
    await new Promise(r => setTimeout(r, 350))

    if (data.email.trim() === DEMO_USERNAME && data.password === DEMO_PASSWORD) {
      authSignIn(DEMO_USERNAME)
      /* Send back to original destination if they were bounced from a protected route */
      const dest = location.state?.from?.pathname || '/underwriting'
      navigate(dest, { replace: true })
    } else {
      setApiError('Invalid credentials. Please try again.')
    }
    setIsLoading(false)
  }

  return {
    register,
    handleSubmit: handleSubmit(onSubmit),
    errors,
    isLoading,
    apiError,
    showPassword,
    togglePassword,
    watch,
  }
}
