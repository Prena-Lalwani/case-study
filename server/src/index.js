import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth.js'
import onboardingRouter from './routes/onboarding.js'
import advisorsRouter from './routes/advisors.js'
import clientsRouter from './routes/clients.js'
import loanApplicationsRouter from './routes/loanApplications.js'
import advisoryEngagementsRouter from './routes/advisoryEngagements.js'
import queueRouter from './routes/queue.js'
import reportsRouter from './routes/reports.js'

const app = express()
const PORT = process.env.PORT ?? 4000

/* Allow the local dev frontend + (in production) whatever origin you deploy to.
   Set FRONTEND_ORIGIN on Render to your Vercel URL. */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))
app.use(express.json({ limit: '4mb' }))

app.use('/api/auth', authRouter)
app.use('/api/onboarding', onboardingRouter)
app.use('/api/advisors', advisorsRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/loan-applications', loanApplicationsRouter)
app.use('/api/advisory-engagements', advisoryEngagementsRouter)
app.use('/api/queue', queueRouter)
app.use('/api/reports', reportsRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
