import { Router } from 'express'
import { prisma } from '../db.js'
import { recomputeClientStatus } from '../lib/clientStatus.js'

const router = Router()

/* ── Helpers ─────────────────────────────────────────────────────────── */

/* Combine real DB timeline events with synthesised ones from existing
   timestamps (engagement.submittedAt, aiAnalysis.processedAt, assignment.assignedAt).
   That way engagements created before the timeline table existed still
   show a meaningful audit trail. */
const buildTimeline = (engagement) => {
  const events = []

  if (engagement.submittedAt) {
    events.push({
      eventType: 'submitted',
      description: 'Engagement submitted by intake',
      occurredAt: engagement.submittedAt,
      synthetic: true,
    })
  }
  if (engagement.aiAnalysis?.processedAt) {
    events.push({
      eventType: 'analysed',
      description: `AI completed analysis (completeness score ${engagement.aiAnalysis.completenessScore ?? '—'})`,
      occurredAt: engagement.aiAnalysis.processedAt,
      synthetic: true,
    })
  }
  if (engagement.assignment) {
    events.push({
      eventType: 'proposed',
      description: `AI proposed advisor ${engagement.assignment.advisor?.name ?? ''}`.trim(),
      occurredAt: engagement.assignment.assignedAt,
      synthetic: true,
    })
  }
  for (const e of engagement.events ?? []) events.push(e)

  return events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
}

const serialize = (e) => {
  const advisor = e.assignment?.advisor
  return {
    id: e.id,
    clientId: e.client?.legacyId ?? e.clientId,
    client: e.client,
    flowKey: e.flowKey,
    goals: e.goals,
    timeHorizonYears: e.timeHorizonYears,
    riskTolerance: e.riskTolerance,
    monthlySurplus: e.monthlySurplus,
    currentNetWorth: e.currentNetWorth,
    status: e.status,
    submittedAt: e.submittedAt,
    aiAnalysis: e.aiAnalysis,
    assignment: e.assignment && {
      ...e.assignment,
      advisor: advisor && { ...advisor, id: advisor.legacyId ?? advisor.id },
    },
    timeline: buildTimeline(e),
  }
}

const FULL_INCLUDE = {
  client: true,
  aiAnalysis: true,
  assignment: { include: { advisor: true } },
  events: { orderBy: { occurredAt: 'asc' } },
}

const logEvent = (engagementId, eventType, description, actor, meta) =>
  prisma.engagementTimelineEvent.create({
    data: { advisoryEngagementId: engagementId, eventType, description, actor: actor ?? null, meta: meta ?? null },
  })

/* ── Routes ──────────────────────────────────────────────────────────── */

// GET /api/advisory-engagements
router.get('/', async (req, res) => {
  const { flowKey } = req.query
  const where = flowKey ? { flowKey: String(flowKey) } : {}
  const list = await prisma.advisoryEngagement.findMany({
    where,
    include: FULL_INCLUDE,
    orderBy: { submittedAt: 'desc' },
  })
  res.json(list.map(serialize))
})

// GET /api/advisory-engagements/:id
router.get('/:id', async (req, res) => {
  const e = await prisma.advisoryEngagement.findUnique({
    where: { id: req.params.id },
    include: { ...FULL_INCLUDE, client: { include: { documents: true } } },
  })
  if (!e) return res.status(404).json({ error: 'Engagement not found' })
  res.json(serialize(e))
})

// POST /api/advisory-engagements/:id/confirm — officer confirms the AI's advisor pick
router.post('/:id/confirm', async (req, res) => {
  const { officer, notes } = req.body ?? {}
  const engagement = await prisma.advisoryEngagement.findUnique({
    where: { id: req.params.id },
    include: { assignment: { include: { advisor: true } }, client: true },
  })
  if (!engagement)       return res.status(404).json({ error: 'Engagement not found' })
  if (!engagement.assignment) return res.status(400).json({ error: 'No proposed advisor to confirm' })
  if (engagement.assignment.status === 'confirmed') {
    return res.status(409).json({ error: 'Already confirmed' })
  }

  const now = new Date()
  const actor = officer ?? 'Marcus Webb'

  /* Atomic: confirm assignment + activate client + bump caseload + log event */
  await prisma.$transaction([
    prisma.advisorAssignment.update({
      where: { id: engagement.assignment.id },
      data:  { status: 'confirmed', confirmedAt: now, confirmedBy: actor, confirmedByOfficer: true },
    }),
    prisma.advisoryEngagement.update({
      where: { id: engagement.id },
      data:  { status: 'confirmed' },
    }),
    prisma.client.update({
      where: { id: engagement.clientId },
      data:  { status: 'active' },
    }),
    prisma.advisor.update({
      where: { id: engagement.assignment.advisorId },
      data:  { clientLoad: { increment: 1 } },
    }),
    prisma.engagementTimelineEvent.create({
      data: {
        advisoryEngagementId: engagement.id,
        eventType: 'confirmed',
        description: `Confirmed ${engagement.assignment.advisor.name} as the assigned advisor${notes?.trim() ? ` — ${notes.trim()}` : ''}`,
        actor,
        meta: notes?.trim() ? { notes: notes.trim() } : undefined,
      },
    }),
  ])

  const fresh = await prisma.advisoryEngagement.findUnique({
    where: { id: engagement.id }, include: FULL_INCLUDE,
  })
  res.json(serialize(fresh))
})

// POST /api/advisory-engagements/:id/reassign — officer picks a different advisor
router.post('/:id/reassign', async (req, res) => {
  const { newAdvisorId, reason, officer } = req.body ?? {}
  if (!newAdvisorId) return res.status(400).json({ error: 'newAdvisorId required' })

  const engagement = await prisma.advisoryEngagement.findUnique({
    where: { id: req.params.id },
    include: { assignment: { include: { advisor: true } } },
  })
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' })

  const newAdvisor = await prisma.advisor.findFirst({
    where: { OR: [{ legacyId: newAdvisorId }, { id: newAdvisorId }] },
  })
  if (!newAdvisor) return res.status(404).json({ error: 'New advisor not found' })

  const previousAdvisor = engagement.assignment?.advisor
  const previousWasConfirmed = engagement.assignment?.status === 'confirmed'
  const actor = officer ?? 'Marcus Webb'

  /* If the reassignment overwrites a confirmed advisor, decrement that advisor's
     caseload (they no longer hold this client). The new advisor's caseload only
     increments when the new assignment is confirmed. */
  const ops = []
  if (previousAdvisor && previousWasConfirmed) {
    ops.push(prisma.advisor.update({
      where: { id: previousAdvisor.id },
      data:  { clientLoad: { decrement: 1 } },
    }))
  }

  if (engagement.assignment) {
    ops.push(prisma.advisorAssignment.update({
      where: { id: engagement.assignment.id },
      data: {
        advisorId: newAdvisor.id,
        status: 'proposed',
        confirmedAt: null,
        confirmedBy: null,
        confirmedByOfficer: false,
        rationale: reason ?? engagement.assignment.rationale,
      },
    }))
  } else {
    ops.push(prisma.advisorAssignment.create({
      data: {
        advisoryEngagementId: engagement.id,
        advisorId: newAdvisor.id,
        status: 'proposed',
        rationale: reason ?? null,
      },
    }))
  }

  ops.push(prisma.advisoryEngagement.update({
    where: { id: engagement.id }, data: { status: 'proposed' },
  }))

  ops.push(prisma.engagementTimelineEvent.create({
    data: {
      advisoryEngagementId: engagement.id,
      eventType: 'reassigned',
      description: previousAdvisor
        ? `Reassigned from ${previousAdvisor.name} to ${newAdvisor.name}${reason ? ` — ${reason}` : ''}`
        : `Assigned ${newAdvisor.name}${reason ? ` — ${reason}` : ''}`,
      actor,
      meta: {
        previousAdvisorId: previousAdvisor?.legacyId ?? previousAdvisor?.id ?? null,
        newAdvisorId: newAdvisor.legacyId ?? newAdvisor.id,
        reason: reason ?? null,
      },
    },
  }))

  await prisma.$transaction(ops)

  const fresh = await prisma.advisoryEngagement.findUnique({
    where: { id: engagement.id }, include: FULL_INCLUDE,
  })
  res.json(serialize(fresh))
})

// POST /api/advisory-engagements/:id/decline — officer declines the engagement
router.post('/:id/decline', async (req, res) => {
  const { reason, officer } = req.body ?? {}
  const engagement = await prisma.advisoryEngagement.findUnique({
    where: { id: req.params.id },
    include: { assignment: { include: { advisor: true } } },
  })
  if (!engagement) return res.status(404).json({ error: 'Engagement not found' })

  const actor = officer ?? 'Marcus Webb'
  const advisorName = engagement.assignment?.advisor?.name
  const wasConfirmed = engagement.assignment?.status === 'confirmed'

  const ops = []
  if (engagement.assignment) {
    ops.push(prisma.advisorAssignment.update({
      where: { id: engagement.assignment.id },
      data:  { status: 'declined', declineReason: reason ?? null },
    }))
  }
  ops.push(prisma.advisoryEngagement.update({
    where: { id: engagement.id }, data: { status: 'declined' },
  }))
  if (wasConfirmed && engagement.assignment) {
    ops.push(prisma.advisor.update({
      where: { id: engagement.assignment.advisorId },
      data:  { clientLoad: { decrement: 1 } },
    }))
  }
  ops.push(prisma.engagementTimelineEvent.create({
    data: {
      advisoryEngagementId: engagement.id,
      eventType: 'declined',
      description: `Engagement declined${advisorName ? ` (was assigned to ${advisorName})` : ''}${reason ? ` — ${reason}` : ''}`,
      actor,
      meta: { reason: reason ?? null },
    },
  }))

  await prisma.$transaction(ops)
  /* Derive client status from all their work — only goes inactive if nothing
     else is active/open (not blindly on this one decline). */
  await recomputeClientStatus(engagement.clientId)

  const fresh = await prisma.advisoryEngagement.findUnique({
    where: { id: engagement.id }, include: FULL_INCLUDE,
  })
  res.json(serialize(fresh))
})

// PATCH legacy — kept for backward-compat; deprecated in favour of /confirm + /decline
router.patch('/:id/assignment', async (req, res) => {
  const { status, confirmedByOfficer } = req.body ?? {}
  const assignment = await prisma.advisorAssignment.findUnique({
    where: { advisoryEngagementId: req.params.id },
  })
  if (!assignment) return res.status(404).json({ error: 'No assignment for that engagement' })

  const updated = await prisma.advisorAssignment.update({
    where: { id: assignment.id },
    data:  {
      ...(status !== undefined && { status }),
      ...(confirmedByOfficer !== undefined && { confirmedByOfficer }),
    },
    include: { advisor: true },
  })
  res.json(updated)
})

export default router
