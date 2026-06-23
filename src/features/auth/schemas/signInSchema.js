import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string()
    .min(3, 'Username or email required')
    .refine(
      v => v === 'admin' || /^\S+@\S+\.\S+$/.test(v),
      'Enter a valid email or username',
    ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
})
