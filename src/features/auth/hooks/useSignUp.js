import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { signUpSchema } from '../schemas/signUpSchema'
import { authService } from '../services/authService'

/**
 * Encapsulates sign-up form logic: validation, password strength, API call, navigation.
 * @returns {{ register, handleSubmit, errors, isLoading, apiError, showPassword, togglePassword, watch }}
 */
export const useSignUp = () => {
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
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      agreeToTerms: false,
    },
  })

  const togglePassword = () => setShowPassword((prev) => !prev)

  const onSubmit = async (data) => {
    setApiError('')
    setIsLoading(true)
    try {
      await authService.signUp(data)
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
