import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

/* Re-queue a client's in-flight applications for AI review (e.g. after their
   document set changes). Only touches work an officer hasn't finalized:
   loans without an officer decision, and engagements not confirmed/declined.
   Returns the number of applications sent back for review. */
const requeueInFlightApplications = async (clientId) => {
  const items = await prisma.queueItem.findMany({
    where: { clientId },
    include: { loanApplication: true, advisoryEngagement: true },
  })
  let requeued = 0
  for (const qi of items) {
    const loan = qi.loanApplication
    const eng  = qi.advisoryEngagement
    const loanOpen = loan && !loan.decidedAt
    const engOpen  = eng  && !['confirmed', 'declined'].includes(eng.status)
    if (!loanOpen && !engOpen) continue

    await prisma.$transaction(async (tx) => {
      await tx.queueItem.update({
        where: { id: qi.id },
        data:  { status: 'queued', errorMessage: null, processedAt: null },
      })
      if (loanOpen) await tx.loanApplication.update({ where: { id: loan.id }, data: { status: 'ai_reviewing' } })
      if (engOpen)  await tx.advisoryEngagement.update({ where: { id: eng.id }, data: { status: 'pending' } })
    })
    requeued++
  }
  return requeued
}

const totalsFromLoans = (loans = []) => {
  const approved = loans.filter(l => l.status === 'approved')
  return {
    totalApplications: loans.length,
    totalApproved:     approved.reduce((s, l) => s + (l.amount ?? 0), 0),
  }
}

const serializeAdvisor = (a) => a && {
  id:       a.legacyId ?? a.id,
  name:     a.name,
  initials: a.initials,
  specialty: a.specialty,
}

/* Pick the client's most recent service flow + the advisor handling it.
   A client may have multiple loans / engagements; we surface the latest one. */
const deriveServiceAndAdvisor = (c) => {
  const loans       = c.loanApplications        ?? []
  const engagements = c.advisoryEngagements     ?? []
  const candidates  = [
    ...loans.map(l => ({
      kind: 'loan',
      flowKey: l.client?.type === 'business' || c.type === 'business' ? 'business-loan' : 'personal-loan',
      submittedAt: l.submittedAt,
      advisor: l.assignedAdvisor,
    })),
    ...engagements.map(e => ({
      kind: 'advisory',
      flowKey: e.flowKey,
      submittedAt: e.submittedAt,
      advisor: e.assignment?.advisor,
    })),
  ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  const latest = candidates[0]
  return {
    serviceFlow: latest?.flowKey ?? null,           // 'personal-loan' | 'business-loan' | 'personal-advisory' | 'business-advisory' | null
    assignedAdvisor: serializeAdvisor(latest?.advisor),
  }
}

const serializeClient = (c) => ({
  id: c.legacyId ?? c.id,
  name: c.name,
  email: c.email,
  phone: c.phone,
  type: c.type,
  company: c.company,
  status: c.status,
  location: c.location,
  dateOfBirth: c.dateOfBirth,
  address: c.address,
  idNumber: c.idNumber,
  nationality: c.nationality,
  joinedDate: c.joinedDate ? c.joinedDate.toISOString().slice(0, 10) : null,
  notes: c.notes,
  employer: c.employer,
  jobTitle: c.jobTitle,
  monthlyGross: c.monthlyGross,
  monthlyNet: c.monthlyNet,
  yearsEmployed: c.yearsEmployed,
  creditScore: c.creditScore,
  bankName: c.bankName,
  accountHolder: c.accountHolder,
  accountNumber: c.accountNumber,
  statementPeriod: c.statementPeriod,
  averageMonthlyCredit: c.averageMonthlyCredit,
  averageMonthlyDebit: c.averageMonthlyDebit,
  averageClosingBalance: c.averageClosingBalance,
  ...totalsFromLoans(c.loanApplications),
  ...deriveServiceAndAdvisor(c),
})

// GET /api/clients
router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: {
      loanApplications:   { include: { assignedAdvisor: true } },
      advisoryEngagements: { include: { assignment: { include: { advisor: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(clients.map(serializeClient))
})

// GET /api/clients/:id  (id = legacyId or uuid)
router.get('/:id', async (req, res) => {
  const where = req.params.id.startsWith('CL-')
    ? { legacyId: req.params.id }
    : { id: req.params.id }
  const c = await prisma.client.findFirst({
    where,
    include: {
      loanApplications:    { include: { assignedAdvisor: true } },
      advisoryEngagements: {
        include: {
          assignment: { include: { advisor: true } },
          aiAnalysis: true,
          queueItem:  true,
        },
        orderBy: { submittedAt: 'desc' },
      },
      documents: true,
    },
  })
  if (!c) return res.status(404).json({ error: 'Client not found' })
  res.json({
    ...serializeClient(c),
    documents: c.documents,
    advisoryEngagements: c.advisoryEngagements,
    loanApplications:    c.loanApplications,
  })
})

// POST /api/clients — create from the Add Client modal payload
router.post('/', async (req, res) => {
  const b = req.body ?? {}
  if (!b.name?.trim() || !b.email?.trim()) {
    return res.status(400).json({ error: 'name and email are required' })
  }
  const legacyId = b.clientId ?? ('CL-' + Math.floor(10_000 + Math.random() * 89_999))
  const c = await prisma.client.create({
    data: {
      legacyId,
      name: b.name.trim(),
      email: b.email.trim(),
      phone: b.phone ?? null,
      type: b.type ?? 'individual',
      company: b.company ?? null,
      status: 'pending',
      location: b.location ?? null,
      dateOfBirth: b.dateOfBirth ?? null,
      address: b.address ?? null,
      idNumber: b.idNumber ?? null,
      nationality: b.nationality ?? null,
      joinedDate: new Date(),
      notes: b.notes ?? null,
      employer: b.employer ?? null,
      jobTitle: b.jobTitle ?? null,
      monthlyGross: b.monthlyGross ?? null,
      monthlyNet: b.monthlyNet ?? null,
      yearsEmployed: b.yearsEmployed ?? null,
      creditScore: b.creditScore ?? null,
      bankName: b.bankName ?? null,
      accountHolder: b.accountHolder ?? null,
      accountNumber: b.accountNumber ?? null,
      statementPeriod: b.statementPeriod ?? null,
      averageMonthlyCredit: b.averageMonthlyCredit ?? null,
      averageMonthlyDebit: b.averageMonthlyDebit ?? null,
      averageClosingBalance: b.averageClosingBalance ?? null,
    },
    include: { loanApplications: true },
  })
  res.status(201).json(serializeClient(c))
})

// PATCH /api/clients/:id
router.patch('/:id', async (req, res) => {
  const where = req.params.id.startsWith('CL-')
    ? { legacyId: req.params.id }
    : { id: req.params.id }
  const existing = await prisma.client.findFirst({ where })
  if (!existing) return res.status(404).json({ error: 'Client not found' })

  const b = req.body ?? {}
  const updated = await prisma.client.update({
    where: { id: existing.id },
    data:  Object.fromEntries(
      Object.entries(b).filter(([k]) =>
        ['name','email','phone','type','company','status','location','notes',
         'employer','jobTitle','monthlyGross','monthlyNet','yearsEmployed','creditScore',
         'bankName','accountHolder','accountNumber','statementPeriod',
         'averageMonthlyCredit','averageMonthlyDebit','averageClosingBalance'].includes(k)
      )
    ),
    include: { loanApplications: true },
  })
  res.json(serializeClient(updated))
})

// POST /api/clients/:id/documents — persist an uploaded document
// body: { docType, filename, mimeType, fileDataUrl, parsedJson?, uploadSource?, aiConfidence?, status? }
router.post('/:id/documents', async (req, res) => {
  const where = req.params.id.startsWith('CL-')
    ? { legacyId: req.params.id }
    : { id: req.params.id }
  const client = await prisma.client.findFirst({ where, select: { id: true } })
  if (!client) return res.status(404).json({ error: 'Client not found' })

  const b = req.body ?? {}
  const docType = b.docType?.trim()
  if (!docType) {
    return res.status(400).json({ error: 'docType is required' })
  }

  const data = {
    clientId:     client.id,
    docType,
    filename:     b.filename ?? null,
    mimeType:     b.mimeType ?? null,
    fileDataUrl:  b.fileDataUrl ?? null,
    parsedJson:   b.parsedJson ?? null,
    uploadSource: b.uploadSource ?? (b.fileDataUrl ? 'image' : 'json'),
    aiConfidence: b.aiConfidence ?? null,
    status:       b.status ?? null,
  }

  /* One document per type per client: replace an existing same-type doc rather
     than piling up duplicates. */
  const doc = await prisma.$transaction(async (tx) => {
    await tx.document.deleteMany({ where: { clientId: client.id, docType } })
    return tx.document.create({ data })
  })

  /* A document change invalidates any in-flight AI review — re-queue the
     client's not-yet-finalized applications so the AI re-runs against the
     updated document set. Officer-decided loans / confirmed|declined
     engagements are left untouched. */
  const requeued = await requeueInFlightApplications(client.id)

  res.status(201).json({ ...doc, requeuedForReview: requeued })
})

export default router
