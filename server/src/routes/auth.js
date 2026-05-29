import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'

const router = Router()

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, fullName: user.fullName },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' }
  )

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, fullName, password } = req.body

  if (!email || !fullName || !password) {
    return res.status(400).json({ error: 'email, fullName and password are required' })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { email, fullName, password: hashed },
  })

  // Create empty onboarding application
  await prisma.onboardingApplication.create({ data: { userId: user.id } })

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, fullName: user.fullName } })
})

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, fullName: user.fullName } })
})

export default router
