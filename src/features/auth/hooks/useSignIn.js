import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { signInSchema } from '../schemas/signInSchema'
import { authService } from '../services/authService'

/**
 * Encapsulates all sign-in form logic: validation, API call, navigation.
 * @returns {{ register, handleSubmit, errors, isLoading, apiError, showPassword, togglePassword, watch }}
 */
export const useSignIn = () => {
  const navigate = useNavigate()
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
    try {
      await authService.signIn(data)
      navigate('/onboarding/step-1')
    } catch (err) {
      setApiError(err.response?.data?.error || err.message || 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
