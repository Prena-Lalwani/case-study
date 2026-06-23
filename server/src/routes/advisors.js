import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

const initialsOf = (name) =>
  (name ?? '?').trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)

const nextLegacyId = async () => {
  const all = await prisma.advisor.findMany({
    where: { legacyId: { startsWith: 'ADV-' } },
    select: { legacyId: true },
  })
  const nums = all.map(a => Number((a.legacyId ?? '').replace('ADV-', ''))).filter(Number.isFinite)
  const max = nums.length ? Math.max(...nums) : 0
  return 'ADV-' + String(max + 1).padStart(3, '0')
}

// GET /api/advisors — list all
router.get('/', async (_req, res) => {
  const advisors = await prisma.advisor.findMany({
    orderBy: { createdAt: 'asc' },
  })
  res.json(advisors.map(a => ({ ...a, id: a.legacyId ?? a.id })))
})

// GET /api/advisors/:id — full detail with assignments + clients + performance
router.get('/:id', async (req, res) => {
  const where = req.params.id.startsWith('ADV-')
    ? { legacyId: req.params.id }
    : { id: req.params.id }
  const advisor = await prisma.advisor.findFirst({
    where,
    include: {
      assignments: {
        include: {
          advisoryEngagement: {
            include: {
              client:    { select: { id: true, legacyId: true, name: true, type: true, company: true, email: true, location: true, status: true } },
              aiAnalysis: { select: { completenessScore: true, summary: true } },
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  })
  if (!advisor) return res.status(404).json({ error: 'Advisor not found' })

  /* Performance metrics — derived from assignments */
  const assignments = advisor.assignments
  const confirmed   = assignments.filter(a => a.status === 'confirmed')
  const proposed    = assignments.filter(a => a.status === 'proposed')
  const declined    = assignments.filter(a => a.status === 'declined')
  const scores      = assignments
    .map(a => a.advisoryEngagement?.aiAnalysis?.completenessScore)
    .filter(s => typeof s === 'number')
  const avgScore    = scores.length
    ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
    : null

  /* Confirmation rate excludes still-proposed engagements */
  const decided = confirmed.length + declined.length
  const confirmationRate = decided > 0 ? confirmed.length / decided : null

  res.json({
    ...advisor,
    id: advisor.legacyId ?? advisor.id,
    performance: {
      totalAssignments: assignments.length,
      confirmed: confirmed.length,
      proposed:  proposed.length,
      declined:  declined.length,
      avgCompletenessScore: avgScore,
      confirmationRate,
    },
    assignments: assignments.map(a => ({
      id: a.id,
      status: a.status,
      rationale: a.rationale,
      assignedAt: a.assignedAt,
      confirmedAt: a.confirmedAt,
      confirmedBy: a.confirmedBy,
      declineReason: a.declineReason,
      engagement: a.advisoryEngagement && {
        id: a.advisoryEngagement.id,
        flowKey: a.advisoryEngagement.flowKey,
        status: a.advisoryEngagement.status,
        submittedAt: a.advisoryEngagement.submittedAt,
        completenessScore: a.advisoryEngagement.aiAnalysis?.completenessScore ?? null,
        summary: a.advisoryEngagement.aiAnalysis?.summary ?? null,
        client: a.advisoryEngagement.client && {
          ...a.advisoryEngagement.client,
          id: a.advisoryEngagement.client.legacyId ?? a.advisoryEngagement.client.id,
        },
      },
    })),
  })
})

// POST /api/advisors — create
router.post('/', async (req, res) => {
  const b = req.body ?? {}
  if (!b.name?.trim() || !b.title?.trim() || !b.specialty?.trim()) {
    return res.status(400).json({ error: 'name, title, and specialty are required' })
  }
  const legacyId = await nextLegacyId()
  const created = await prisma.advisor.create({
    data: {
      legacyId,
      name: b.name.trim(),
      title: b.title.trim(),
      specialty: b.specialty.trim(),
      initials: b.initials || initialsOf(b.name),
      yearsExperience: Number(b.yearsExperience ?? 0),
      clientLoad: Number(b.clientLoad ?? 0),
      bio: b.bio ?? null,
      languages: Array.isArray(b.languages) ? b.languages : [],
      credentials: Array.isArray(b.credentials) ? b.credentials : [],
      focus: Array.isArray(b.focus) ? b.focus : [],
    },
  })
  res.status(201).json({ ...created, id: created.legacyId })
})

// PATCH /api/advisors/:id — update (id is the legacyId like ADV-001)
router.patch('/:id', async (req, res) => {
  const advisor = await prisma.advisor.findUnique({ where: { legacyId: req.params.id } })
  if (!advisor) return res.status(404).json({ error: 'Advisor not found' })

  const b = req.body ?? {}
  const updated = await prisma.advisor.update({
    where: { id: advisor.id },
    data: {
      ...(b.name        !== undefined && { name: b.name, initials: b.initials || initialsOf(b.name) }),
      ...(b.title       !== undefined && { title: b.title }),
      ...(b.specialty   !== undefined && { specialty: b.specialty }),
      ...(b.bio         !== undefined && { bio: b.bio }),
      ...(b.yearsExperience !== undefined && { yearsExperience: Number(b.yearsExperience) }),
      ...(b.clientLoad      !== undefined && { clientLoad: Number(b.clientLoad) }),
      ...(b.languages   !== undefined && { languages: Array.isArray(b.languages) ? b.languages : [] }),
      ...(b.credentials !== undefined && { credentials: Array.isArray(b.credentials) ? b.credentials : [] }),
      ...(b.focus       !== undefined && { focus: Array.isArray(b.focus) ? b.focus : [] }),
    },
  })
  res.json({ ...updated, id: updated.legacyId })
})

// DELETE /api/advisors/:id — hard delete (also drops any assignments via cascade)
router.delete('/:id', async (req, res) => {
  const advisor = await prisma.advisor.findUnique({ where: { legacyId: req.params.id } })
  if (!advisor) return res.status(404).json({ error: 'Advisor not found' })
  try {
    /* Best-effort: drop assignments first in case the DB doesn't have ON DELETE CASCADE.
       Existing queue/aiAnalysis records that referenced this advisor will keep their
       textual recommendedAdvisorId snapshot but lose the live FK link. */
    await prisma.advisorAssignment.deleteMany({ where: { advisorId: advisor.id } })
    await prisma.advisor.delete({ where: { id: advisor.id } })
    res.status(204).end()
  } catch (err) {
    console.error('Hard delete failed:', err.message)
    res.status(500).json({ error: 'Could not delete advisor: ' + err.message })
  }
})

export default router
