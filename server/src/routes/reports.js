/* GET /api/reports/summary?days=90
 * Aggregates real DB data into the daily + leaderboard shape the Reports tabs expect.
 * Returns the same structure synthetic history previously exposed, so the tabs work unchanged. */

import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

const isoDay = d => d.toISOString().slice(0, 10)
const startOfDay = (d = new Date()) => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

const LOAN_TYPES = ['Home loan', 'Auto loan', 'Personal loan', 'Business loan']
const FLOWS      = ['personal-advisory', 'business-advisory', 'personal-loan', 'business-loan']

router.get('/summary', async (req, res) => {
  const days = Math.max(1, Math.min(365, Number(req.query.days) || 90))
  const today = startOfDay(new Date())
  const startDate = new Date(today.getTime() - (days - 1) * 86_400_000)

  const [loans, engagements, advisors] = await Promise.all([
    prisma.loanApplication.findMany({
      include: { aiAnalysis: true, client: { select: { type: true } } },
    }),
    prisma.advisoryEngagement.findMany({ include: { aiAnalysis: true } }),
    prisma.advisor.findMany({
      include: {
        assignments: {
          include: { advisoryEngagement: { include: { aiAnalysis: true } } },
        },
      },
    }),
  ])

  const inWindow = (date) => {
    if (!date) return false
    const d = new Date(date)
    return d >= startDate && d <= new Date(today.getTime() + 86_400_000)
  }

  /* ── Daily series ─────────────────────────────────────────────────── */
  const dayMap = {}
  for (let i = 0; i < days; i++) {
    const d = isoDay(new Date(startDate.getTime() + i * 86_400_000))
    dayMap[d] = makeEmptyDay(d)
  }

  for (const l of loans) {
    if (!inWindow(l.submittedAt)) continue
    const day = dayMap[isoDay(new Date(l.submittedAt))]
    if (!day) continue
    const isBiz = l.client?.type === 'business'
    day.newClients[isBiz ? 'business-loan' : 'personal-loan']++
    day.newClientsTotal++

    day.loans.total++
    if (l.status === 'approved')      day.loans.approved++
    else if (l.status === 'auto_rejected') day.loans.rejected++
    else if (l.status === 'needs_review')  day.loans.needsReview++
    day.loans.valueSubmitted += l.amount ?? 0
    if (l.loanType in day.loans.typeMix) day.loans.typeMix[l.loanType]++

    if (typeof l.aiAnalysis?.aiScore === 'number') {
      day._loanScoreSum   += l.aiAnalysis.aiScore
      day._loanScoreCount++
    }
  }
  for (const e of engagements) {
    if (!inWindow(e.submittedAt)) continue
    const day = dayMap[isoDay(new Date(e.submittedAt))]
    if (!day) continue
    if (e.flowKey === 'personal-advisory') day.newClients['personal-advisory']++
    if (e.flowKey === 'business-advisory') day.newClients['business-advisory']++
    day.newClientsTotal++
    if (typeof e.aiAnalysis?.completenessScore === 'number') {
      day._compSum   += e.aiAnalysis.completenessScore
      day._compCount++
      if (e.aiAnalysis.completenessScore >= 80) day._engagementReadyCount++
      day._engagementTotal++
    }
  }

  const daily = Object.values(dayMap).map(d => {
    const decisionsTotal = d.loans.approved + d.loans.rejected + d.loans.needsReview
    d.loans.approveRate = decisionsTotal > 0 ? d.loans.approved / decisionsTotal : 0
    d.advisory.avgCompletenessScore = d._compCount ? Math.round(d._compSum / d._compCount) : 0
    d.advisory.engagementReadyPct   = d._engagementTotal ? d._engagementReadyCount / d._engagementTotal : 0
    d.loanAiScore                   = d._loanScoreCount ? Math.round(d._loanScoreSum / d._loanScoreCount) : 0
    /* Strip private accumulators */
    delete d._compSum; delete d._compCount; delete d._loanScoreSum; delete d._loanScoreCount
    delete d._engagementReadyCount; delete d._engagementTotal
    return d
  })

  /* ── Advisor leaderboard ──────────────────────────────────────────── */
  const advisorActivity = advisors.map(a => {
    const confirmed = a.assignments.filter(x => x.status === 'confirmed').length
    const declined  = a.assignments.filter(x => x.status === 'declined').length
    const total     = a.assignments.length
    const scores    = a.assignments
      .map(x => x.advisoryEngagement?.aiAnalysis?.completenessScore)
      .filter(s => typeof s === 'number')
    const avgScore  = scores.length ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0
    return {
      id: a.legacyId ?? a.id,
      legacyId: a.legacyId,
      name: a.name, initials: a.initials, title: a.title, specialty: a.specialty,
      yearsExperience: a.yearsExperience, clientLoad: a.clientLoad,
      focus: a.focus,
      totalAssigned: total,
      avgCompleteness: avgScore,
      completionRate: total ? confirmed / total : 0,
      override: 0,
    }
  })

  /* ── Missing docs + doc quality (from advisory AI document checklists) ── */
  const missingDocsMap = {}
  const docQuality = { present: 0, missing: 0, lowQuality: 0, inconsistent: 0 }
  for (const e of engagements) {
    const checklist = e.aiAnalysis?.documentChecklist
    if (!Array.isArray(checklist)) continue
    for (const d of checklist) {
      if (d.status === 'present')          docQuality.present++
      else if (d.status === 'missing') {
        docQuality.missing++
        missingDocsMap[d.name] = (missingDocsMap[d.name] ?? 0) + 1
      }
      else if (d.status === 'low_quality') docQuality.lowQuality++
      else                                 docQuality.inconsistent++
    }
  }
  docQuality.total = docQuality.present + docQuality.missing + docQuality.lowQuality + docQuality.inconsistent
  const missingDocs = Object.entries(missingDocsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  res.json({ days: daily, advisorActivity, missingDocs, docQuality })
})

function makeEmptyDay (date) {
  return {
    date,
    newClients: { 'personal-advisory': 0, 'business-advisory': 0, 'personal-loan': 0, 'business-loan': 0 },
    newClientsTotal: 0,
    loans: {
      approved: 0, rejected: 0, needsReview: 0, total: 0,
      approveRate: 0, valueSubmitted: 0,
      typeMix: { 'Home loan': 0, 'Auto loan': 0, 'Personal loan': 0, 'Business loan': 0 },
    },
    advisory: { avgCompletenessScore: 0, engagementReadyPct: 0 },
    loanAiScore: 0,
    _compSum: 0, _compCount: 0, _loanScoreSum: 0, _loanScoreCount: 0,
    _engagementReadyCount: 0, _engagementTotal: 0,
  }
}

export default router
