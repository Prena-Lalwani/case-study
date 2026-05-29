import { z } from 'zod'

export const signUpSchema = z.object({
  fullName: z.string().min(2, 'Please enter your full legal name'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  agreeToTerms: z
    .boolean()
    .refine((val) => val === true, 'You must agree to the Terms of Service and Privacy Policy'),
})
