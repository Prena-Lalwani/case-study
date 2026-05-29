import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import onboardingRouter from './routes/onboarding.js'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api/onboarding', onboardingRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
