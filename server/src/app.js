/* Express app — configured but NOT listening.
 *
 * In local dev: index.js wraps this with `app.listen(PORT, …)`.
 * On Vercel: api/index.js exports this directly as a serverless handler. */

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

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    /* Same-origin requests (Vercel frontend → Vercel function) have no Origin header */
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin))                return cb(null, true)
    /* Allow any *.vercel.app preview / production URL — convenient for PoC */
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return cb(null, true)
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

export default app
