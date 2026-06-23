import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

const serializeItem = (q) => {
  const advisor = q.advisoryEngagement?.assignment?.advisor
  const engagementStatus = q.advisoryEngagement?.status
  const assignmentStatus = q.advisoryEngagement?.assignment?.status
  return {
    id: q.id,
    flowKey: q.flowKey,
    status: q.status,
    createdAt: q.createdAt,
    processedAt: q.processedAt,
    error: q.errorMessage,
    client: q.payload ?? {},
    clientId: q.client?.legacyId ?? q.clientId,
    loanApplicationId: q.loanApplication?.legacyId ?? null,
    advisoryEngagementId: q.advisoryEngagementId ?? null,
    engagementStatus,                        // 'pending' | 'proposed' | 'confirmed' | 'declined'
    assignmentStatus,                        // 'proposed' | 'confirmed' | 'declined'
    result: q.advisoryEngagement?.aiAnalysis
      ? {
          ...q.advisoryEngagement.aiAnalysis,
          assignedAdvisor: advisor && {
            ...advisor,
            id: advisor.legacyId ?? advisor.id,
          },
        }
      : q.loanApplication?.aiAnalysis
        ? { ...q.loanApplication.aiAnalysis }
        : null,
  }
}

const findItemById = (id) =>
  prisma.queueItem.findUnique({
    where: { id },
    include: {
      client: true,
      loanApplication: { include: { aiAnalysis: true } },
      advisoryEngagement: {
        include: {
          aiAnalysis: true,
          assignment: { include: { advisor: true } },
        },
      },
    },
  })

// GET /api/queue — grouped by flow
router.get('/', async (_req, res) => {
  const all = await prisma.queueItem.findMany({
    include: {
      client: true,
      loanApplication: { include: { aiAnalysis: true } },
      advisoryEngagement: {
        include: {
          aiAnalysis: true,
          assignment: { include: { advisor: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const grouped = {
    'personal-advisory': [],
    'business-advisory': [],
    'personal-loan':     [],
    'business-loan':     [],
  }
  for (const q of all) {
    grouped[q.flowKey] ??= []
    grouped[q.flowKey].push(serializeItem(q))
  }
  res.json(grouped)
})

// POST /api/queue — enqueue a new client. Body is the modal payload.
router.post('/', async (req, res) => {
  const b = req.body ?? {}
  const flowKey = b.flowKey ?? (
    b.applicationType === 'advisory'
      ? (b.type === 'business' ? 'business-advisory' : 'personal-advisory')
      : (b.type === 'business' ? 'business-loan'     : 'personal-loan')
  )

  // Create/reuse client. If the modal passed clientId (CL-XXX), upsert by legacy.
  const legacyId = b.clientId ?? ('CL-' + Math.floor(10_000 + Math.random() * 89_999))

  const client = await prisma.client.upsert({
    where:  { legacyId },
    update: {
      name: b.name, email: b.email, phone: b.phone,
      type: b.type ?? 'individual', company: b.company,
      status: 'pending', location: b.location,
      dateOfBirth: b.dateOfBirth, address: b.address,
      idNumber: b.idNumber, nationality: b.nationality,
      employer: b.employer, jobTitle: b.jobTitle,
      monthlyGross: b.monthlyGross || null,
      monthlyNet: b.monthlyNet || null,
      yearsEmployed: b.yearsEmployed || null,
      creditScore: b.creditScore || null,
      bankName: b.bankName, accountHolder: b.accountHolder,
      accountNumber: b.accountNumber, statementPeriod: b.statementPeriod,
      averageMonthlyCredit: b.averageMonthlyCredit || null,
      averageMonthlyDebit: b.averageMonthlyDebit || null,
      averageClosingBalance: b.averageClosingBalance || null,
      notes: b.notes,
    },
    create: {
      legacyId,
      name: b.name ?? 'Unnamed',
      email: b.email ?? '',
      phone: b.phone, type: b.type ?? 'individual', company: b.company,
      status: 'pending', location: b.location,
      dateOfBirth: b.dateOfBirth, address: b.address,
      idNumber: b.idNumber, nationality: b.nationality,
      joinedDate: new Date(),
      employer: b.employer, jobTitle: b.jobTitle,
      monthlyGross: b.monthlyGross || null,
      monthlyNet: b.monthlyNet || null,
      yearsEmployed: b.yearsEmployed || null,
      creditScore: b.creditScore || null,
      bankName: b.bankName, accountHolder: b.accountHolder,
      accountNumber: b.accountNumber, statementPeriod: b.statementPeriod,
      averageMonthlyCredit: b.averageMonthlyCredit || null,
      averageMonthlyDebit: b.averageMonthlyDebit || null,
      averageClosingBalance: b.averageClosingBalance || null,
      notes: b.notes,
    },
  })

  // Linked record (loan app or advisory engagement)
  const linked = {}
  if (flowKey.endsWith('-loan') && b.loanRequest) {
    const loanLegacy = 'APP-' + String(Date.now()).slice(-6)
    const loan = await prisma.loanApplication.create({
      data: {
        legacyId: loanLegacy,
        clientId: client.id,
        loanType: b.loanRequest.type ?? 'Personal loan',
        amount: b.loanRequest.amount ?? 0,
        termYears: b.loanRequest.termYears ?? null,
        purpose: b.loanRequest.purpose,
        propertyAddress: b.loanRequest.propertyAddress,
        propertyValue: b.loanRequest.propertyValue ?? null,
        status: 'ai_reviewing',
      },
    })
    linked.loanApplicationId = loan.id
  } else if (flowKey.endsWith('-advisory')) {
    const eng = await prisma.advisoryEngagement.create({
      data: { clientId: client.id, flowKey },
    })
    linked.advisoryEngagementId = eng.id
  }

  const item = await prisma.queueItem.create({
    data: {
      clientId: client.id,
      flowKey,
      payload: { ...b, clientId: legacyId },
      ...linked,
    },
  })

  res.status(201).json(serializeItem(await findItemById(item.id)))
})

// PATCH /api/queue/:id — status updates (used by the processor)
router.patch('/:id', async (req, res) => {
  const { status, errorMessage, processedAt } = req.body ?? {}
  const updated = await prisma.queueItem.update({
    where: { id: req.params.id },
    data: {
      ...(status        !== undefined && { status }),
      ...(errorMessage  !== undefined && { errorMessage }),
      ...(processedAt   !== undefined && { processedAt: new Date(processedAt) }),
    },
  })
  res.json(serializeItem(await findItemById(updated.id)))
})

// POST /api/queue/:id/result — processor writes the AI analysis here
router.post('/:id/result', async (req, res) => {
  const item = await prisma.queueItem.findUnique({ where: { id: req.params.id } })
  if (!item) return res.status(404).json({ error: 'Queue item not found' })

  const r = req.body ?? {}

  // Common analysis fields
  const baseData = {
    aiScore: r.aiScore ?? null,
    dti: r.dti ?? null,
    recommendation: r.recommendation ?? null,
    completenessScore: r.completenessScore ?? null,
    recommendedAdvisorId: r.recommendedAdvisorId ?? null,
    advisorRationale: r.advisorRationale ?? null,
    strengths: r.strengths ?? null,
    issues: r.issues ?? null,
    recommendations: r.recommendations ?? null,
    documentChecklist: r.documentChecklist ?? null,
    extractedData: r.extractedData ?? null,
    confidenceScores: r.confidenceScores ?? null,
    summary: r.summary ?? null,
    explanation: r.explanation ?? null,
    analysedInSeconds: r.analysedInSeconds ?? null,
  }

  if (item.loanApplicationId) {
    await prisma.aiAnalysis.upsert({
      where:  { loanApplicationId: item.loanApplicationId },
      update: baseData,
      create: { loanApplicationId: item.loanApplicationId, ...baseData },
    })
    // Sync loan application status from recommendation
    const newStatus =
      r.recommendation === 'APPROVE' ? 'approved' :
      r.recommendation === 'REJECT'  ? 'auto_rejected' :
      'needs_review'

    /* Pick a case officer — advisor with the matching flow focus + lowest caseload.
       Fall back to any advisor if none have loan focus. */
    const flowFocused = await prisma.advisor.findMany({
      where: { focus: { has: item.flowKey } },
      orderBy: { clientLoad: 'asc' },
      take: 1,
    })
    const fallback = flowFocused.length === 0
      ? await prisma.advisor.findFirst({ orderBy: { clientLoad: 'asc' } })
      : null
    const officer = flowFocused[0] ?? fallback

    await prisma.loanApplication.update({
      where: { id: item.loanApplicationId },
      data: {
        status: newStatus,
        aiSummary: r.explanation ?? r.summary,
        analysedInSeconds: r.analysedInSeconds ?? null,
        ...(officer && { assignedAdvisorId: officer.id }),
      },
    })

    /* Bump that advisor's caseload — they now own this loan */
    if (officer) {
      await prisma.advisor.update({
        where: { id: officer.id },
        data:  { clientLoad: { increment: 1 } },
      })
    }
  } else if (item.advisoryEngagementId) {
    await prisma.aiAnalysis.upsert({
      where:  { advisoryEngagementId: item.advisoryEngagementId },
      update: baseData,
      create: { advisoryEngagementId: item.advisoryEngagementId, ...baseData },
    })

    // Create or update advisor assignment if the AI picked one
    if (r.recommendedAdvisorId) {
      const advisor = await prisma.advisor.findUnique({ where: { legacyId: r.recommendedAdvisorId } })
      if (advisor) {
        await prisma.advisorAssignment.upsert({
          where:  { advisoryEngagementId: item.advisoryEngagementId },
          update: { advisorId: advisor.id, rationale: r.advisorRationale ?? null, status: 'proposed' },
          create: {
            advisoryEngagementId: item.advisoryEngagementId,
            advisorId: advisor.id,
            rationale: r.advisorRationale ?? null,
            status: 'proposed',
          },
        })
      }
    }

    /* Mark engagement as 'proposed' so officer actions unlock on the review page */
    await prisma.advisoryEngagement.update({
      where: { id: item.advisoryEngagementId },
      data:  { status: 'proposed' },
    })
  }

  // Mark queue ready
  await prisma.queueItem.update({
    where: { id: item.id },
    data:  { status: 'ready', processedAt: new Date(), errorMessage: null },
  })

  res.json(serializeItem(await findItemById(item.id)))
})

// DELETE /api/queue/:id
router.delete('/:id', async (req, res) => {
  await prisma.queueItem.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

export default router
