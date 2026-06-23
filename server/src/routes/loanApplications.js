import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

const serializeAdvisor = a => a && ({
  id:        a.legacyId ?? a.id,
  name:      a.name,
  initials:  a.initials,
  title:     a.title,
  specialty: a.specialty,
})

const serialize = (a) => ({
  id: a.legacyId ?? a.id,
  name: a.client?.name,
  loanType: a.loanType,
  loanAmount: a.amount,
  loanTerm: a.termYears,
  date: a.submittedAt,
  aiScore: a.aiAnalysis?.aiScore ?? null,
  status: a.status,
  dti: a.aiAnalysis?.dti ?? null,
  summary: a.aiSummary,
  analysedInSeconds: a.analysedInSeconds,
  clientLegacyId: a.client?.legacyId,
  assignedAdvisor: serializeAdvisor(a.assignedAdvisor),
})

// GET /api/loan-applications
router.get('/', async (req, res) => {
  const { status } = req.query
  const where = status ? { status: String(status) } : {}
  const apps = await prisma.loanApplication.findMany({
    where,
    include: { client: true, aiAnalysis: true, assignedAdvisor: true },
    orderBy: { submittedAt: 'desc' },
  })
  res.json(apps.map(serialize))
})

// GET /api/loan-applications/:id  (id = legacyId APP-… or uuid)
router.get('/:id', async (req, res) => {
  const where = req.params.id.startsWith('APP-')
    ? { legacyId: req.params.id }
    : { id: req.params.id }
  const app = await prisma.loanApplication.findFirst({
    where,
    include: {
      client: { include: { documents: true } },
      aiAnalysis: true,
      assignedAdvisor: true,
    },
  })
  if (!app) return res.status(404).json({ error: 'Application not found' })
  res.json({
    ...serialize(app),
    client: app.client,
    aiAnalysis: app.aiAnalysis,
    interestRate: app.interestRate,
    monthlyPayment: app.monthlyPayment,
    purpose: app.purpose,
    propertyAddress: app.propertyAddress,
    propertyValue: app.propertyValue,
    ltv: app.ltv,
    decidedBy: app.decidedBy,
    decidedAt: app.decidedAt,
    decisionType: app.decisionType,
    decisionReason: app.decisionReason,
  })
})

/* ── Officer decision endpoints ──────────────────────────────────────── */

const findApp = (idParam) => prisma.loanApplication.findFirst({
  where: idParam.startsWith('APP-') ? { legacyId: idParam } : { id: idParam },
  include: { client: true },
})

/* POST /api/loan-applications/:id/approve — officer approves the loan */
router.post('/:id/approve', async (req, res) => {
  const { reason, officer } = req.body ?? {}
  const app = await findApp(req.params.id)
  if (!app) return res.status(404).json({ error: 'Application not found' })

  const isOverride = app.status === 'auto_rejected'
  const actor = officer ?? 'Marcus Webb'

  await prisma.$transaction([
    prisma.loanApplication.update({
      where: { id: app.id },
      data: {
        status: 'approved',
        decidedBy: actor,
        decidedAt: new Date(),
        decisionType: isOverride ? 'override' : 'approved',
        decisionReason: reason ?? null,
      },
    }),
    prisma.client.update({
      where: { id: app.clientId },
      data: { status: 'active' },
    }),
  ])

  res.json({ ok: true, id: app.legacyId ?? app.id, status: 'approved', decisionType: isOverride ? 'override' : 'approved' })
})

/* POST /api/loan-applications/:id/reject — officer rejects the loan */
router.post('/:id/reject', async (req, res) => {
  const { reason, officer } = req.body ?? {}
  if (!reason?.trim()) return res.status(400).json({ error: 'reason is required to reject a loan' })

  const app = await findApp(req.params.id)
  if (!app) return res.status(404).json({ error: 'Application not found' })

  const actor = officer ?? 'Marcus Webb'

  await prisma.$transaction([
    prisma.loanApplication.update({
      where: { id: app.id },
      data: {
        status: 'auto_rejected',
        decidedBy: actor,
        decidedAt: new Date(),
        decisionType: 'rejected',
        decisionReason: reason.trim(),
      },
    }),
    prisma.client.update({
      where: { id: app.clientId },
      data: { status: 'inactive' },
    }),
  ])

  res.json({ ok: true, id: app.legacyId ?? app.id, status: 'auto_rejected', decisionType: 'rejected' })
})

/* POST /api/loan-applications/:id/escalate — flag for senior review */
router.post('/:id/escalate', async (req, res) => {
  const { reason, officer } = req.body ?? {}
  const app = await findApp(req.params.id)
  if (!app) return res.status(404).json({ error: 'Application not found' })

  await prisma.loanApplication.update({
    where: { id: app.id },
    data: {
      decisionType: 'escalated',
      decidedBy:    officer ?? 'Marcus Webb',
      decidedAt:    new Date(),
      decisionReason: reason ?? null,
      /* keep current status — escalation doesn't finalise */
    },
  })

  res.json({ ok: true, id: app.legacyId ?? app.id })
})

export default router
