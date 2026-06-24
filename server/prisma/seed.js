/* Seed script: loads mock-data JSONs into Postgres.
 * Idempotent — uses `legacyId` (and explicit ids for advisory records) to upsert on re-runs.
 * Run with: `node prisma/seed.js`  (from server/)
 *
 * What it populates so EVERY page + report is driven by the same rows:
 *   • Advisors                       (mock-data/advisors.json)
 *   • Clients + LoanApplications     (mock-data/loan-applications.json + mock-application-data/)
 *   • AiAnalysis per scored loan     (aiScore/dti come straight from the JSON)
 *   • Case-officer assignments       (so the queue shows assigned advisors)
 *   • AdvisoryEngagements            (mock-data/clients/{personal,business}-advisory/*)
 *       └ AiAnalysis (completeness + document checklist) + AdvisorAssignment
 *
 * submittedAt is spread across the last 90 days (anchored to "today") so the
 * Reports trend charts read as real activity instead of a single spike. */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

/* Tolerate UTF-8 BOM that some of the mock files carry. */
const readJson = (rel) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8').replace(/^﻿/, ''))

const initialsOf = (name) =>
  (name ?? '?').trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 2)

const parseCityState = (address) => {
  if (!address) return ''
  const parts = address.split(',').map(s => s.trim())
  if (parts.length < 3) return parts.join(', ')
  const city  = parts[parts.length - 3]
  const state = (parts[parts.length - 2] || '').split(' ')[0]
  return state ? `${city}, ${state}` : city
}

/* ── Deterministic RNG so re-runs produce the same spread ─────────────── */
const mulberry32 = (seed) => {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TODAY = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d })()
const daysAgo = (n, hourSeed = 0) => {
  const d = new Date(TODAY.getTime() - Math.round(n) * 86_400_000)
  d.setHours(8 + Math.floor(hourSeed * 9), Math.floor((hourSeed * 60) % 60), 0, 0)
  return d
}

/* Pick a submittedAt offset (in days back from today) that suits the loan's
 * lifecycle: in-progress = very recent, decided = older. Keeps trend lines
 * realistic (recent intake, decisions lagging behind). */
const offsetForStatus = (status, rnd) => {
  switch (status) {
    case 'ai_reviewing':  return rnd() * 2            // 0–2 days
    case 'needs_review':  return 1 + rnd() * 44       // 1–45 days
    case 'approved':      return 6 + rnd() * 80       // 6–86 days (decided)
    case 'auto_rejected': return 4 + rnd() * 82       // 4–86 days
    default:              return rnd() * 89
  }
}

/* ── Advisors ─────────────────────────────────────────────────────────── */
async function seedAdvisors () {
  const { advisors } = readJson('mock-data/advisors.json')
  for (const a of advisors) {
    const data = {
      name: a.name, title: a.title, specialty: a.specialty,
      initials: a.initials ?? initialsOf(a.name),
      yearsExperience: a.yearsExperience ?? 0,
      clientLoad: a.clientLoad ?? 0,
      bio: a.bio,
      languages: a.languages ?? [],
      credentials: a.credentials ?? [],
      focus: a.focus ?? [],
    }
    await prisma.advisor.upsert({
      where:  { legacyId: a.id },
      update: data,
      create: { legacyId: a.id, ...data },
    })
  }
  console.log(`✓ Advisors: ${advisors.length}`)
}

/* Build a plausible, score-aligned AI analysis for a loan from data we already have. */
const buildLoanAnalysis = (summary, detail, rnd) => {
  const fi = detail.financials ?? {}
  const lr = detail.loanRequest ?? {}
  const score = summary.aiScore

  const recommendation = summary.status === 'approved'      ? 'APPROVE'
                       : summary.status === 'auto_rejected' ? 'REJECT'
                       : 'REVIEW'

  const strengths = []
  const issues = []
  if ((fi.creditScore ?? 0) >= 720) strengths.push(`Strong credit score (${fi.creditScore})`)
  else if ((fi.creditScore ?? 0) < 640 && fi.creditScore) issues.push(`Sub-prime credit score (${fi.creditScore})`)
  if ((fi.latePaymentsLast24Months ?? 0) === 0) strengths.push('No late payments in last 24 months')
  else issues.push(`${fi.latePaymentsLast24Months} late payment(s) in last 24 months`)
  if (summary.dti != null && summary.dti <= 36) strengths.push(`Healthy DTI (${summary.dti}%)`)
  else if (summary.dti != null && summary.dti > 43) issues.push(`Elevated DTI (${summary.dti}%)`)
  if (lr.ltv != null && lr.ltv > 80) issues.push(`High LTV (${lr.ltv}%)`)
  if (fi.bankruptcyHistory) issues.push('Prior bankruptcy on record')
  if (!strengths.length) strengths.push('Stable employment history')
  if (!issues.length && summary.status !== 'approved') issues.push('Manual review of supporting docs advised')

  return {
    aiScore: score,
    dti: summary.dti ?? null,
    recommendation,
    strengths,
    issues,
    recommendations: recommendation === 'REVIEW'
      ? ['Request updated income verification', 'Confirm debt obligations against bureau']
      : [],
    confidenceScores: {
      identity: 88 + Math.round(rnd() * 11),
      income:   80 + Math.round(rnd() * 18),
      document: 84 + Math.round(rnd() * 14),
    },
    summary: summary.summary,
    analysedInSeconds: summary.analysedInSeconds ?? Math.round(20 + rnd() * 30),
  }
}

/* ── Clients + Loans + per-loan AiAnalysis ────────────────────────────── */
async function seedApplicantsAndLoans () {
  const { applications } = readJson('mock-data/loan-applications.json')
  const detailFiles = fs.readdirSync(path.join(ROOT, 'mock-data/mock-application-data'))
    .filter(f => f.endsWith('.json'))

  const detailsById = {}
  for (const f of detailFiles) {
    const d = readJson(`mock-data/mock-application-data/${f}`)
    if (d?.id) detailsById[d.id] = d
  }

  /* Advisor focus map for case-officer assignment.
   * Pools are sorted by legacyId so round-robin assignment is deterministic. */
  const advisors = await prisma.advisor.findMany()
  const advisorsByFocus = {}
  for (const a of advisors) for (const f of a.focus ?? []) {
    (advisorsByFocus[f] ??= []).push(a)
  }
  for (const pool of Object.values(advisorsByFocus)) {
    pool.sort((x, y) => (x.legacyId ?? '').localeCompare(y.legacyId ?? ''))
  }

  /* Round-robin a case officer from the focus-matched pool, so loans spread
   * evenly across eligible advisors instead of clumping on one. */
  const rr = {}
  const pickOfficer = (loanType) => {
    const key = loanType === 'Business loan' ? 'business-loan' : 'personal-loan'
    const pool = advisorsByFocus[key]
    if (!pool?.length) return null
    const i = (rr[key] = (rr[key] ?? 0) + 1) - 1
    return pool[i % pool.length]
  }

  /* Stable ordering → stable date spread on every run. */
  const sorted = [...applications].sort((a, b) => a.id.localeCompare(b.id))

  let analysisCount = 0
  for (let i = 0; i < sorted.length; i++) {
    const summary = sorted[i]
    const detail = detailsById[summary.id]
    if (!detail) continue

    const rnd = mulberry32(0x10A11 + i)  // per-loan deterministic stream

    const pi = detail.personalInfo ?? {}
    const em = detail.employment ?? {}
    const fi = detail.financials ?? {}
    const lr = detail.loanRequest ?? {}
    const bs = detail.documents?.bankStatement

    const submittedAt = daysAgo(offsetForStatus(summary.status, rnd), rnd())
    const isDecided = summary.status === 'approved' || summary.status === 'auto_rejected'
    const decidedAt = isDecided
      ? new Date(Math.min(TODAY.getTime(), submittedAt.getTime() + Math.round((1 + rnd() * 4)) * 86_400_000))
      : null

    const clientStatus = summary.status === 'approved'      ? 'active'
                       : summary.status === 'auto_rejected' ? 'inactive'
                       : 'pending'

    const clientLegacyId = 'CL-' + summary.id.replace('APP-', '')

    const clientData = {
      name: pi.fullName ?? summary.name,
      email: pi.email ?? '',
      phone: pi.phone ?? '',
      type: 'individual',
      status: clientStatus,
      location: parseCityState(pi.address),
      dateOfBirth: pi.dateOfBirth,
      address: pi.address,
      idNumber: detail.documents?.nationalId?.idNumber ?? null,
      nationality: pi.nationality,
      joinedDate: submittedAt,
      employer: em.employer,
      jobTitle: em.jobTitle,
      monthlyGross: em.monthlyGross,
      monthlyNet: em.monthlyNet,
      yearsEmployed: em.yearsEmployed,
      creditScore: fi.creditScore,
      bankName: bs?.bank,
      accountHolder: bs?.accountHolder,
      accountNumber: bs?.accountNumber,
      statementPeriod: bs?.statementPeriod,
      averageMonthlyCredit: bs?.averageMonthlyCredit,
      averageMonthlyDebit: bs?.averageMonthlyDebit,
      averageClosingBalance: bs?.averageClosingBalance,
    }

    const client = await prisma.client.upsert({
      where:  { legacyId: clientLegacyId },
      update: clientData,
      create: { legacyId: clientLegacyId, ...clientData },
    })

    /* Business rule: every ACTIVE application must have a case officer. We assign
     * one to every loan regardless of status (a closed/rejected loan keeping its
     * officer is harmless; an active one must never be unassigned). */
    const officer = pickOfficer(summary.loanType)

    const loanData = {
      loanType: summary.loanType,
      amount: summary.loanAmount,
      termYears: summary.loanTerm,
      interestRate: lr.interestRate,
      monthlyPayment: lr.estimatedMonthlyPayment,
      purpose: lr.purpose,
      propertyAddress: lr.propertyAddress,
      propertyValue: lr.propertyValue,
      ltv: lr.ltv,
      status: summary.status,
      aiSummary: summary.summary,
      analysedInSeconds: summary.analysedInSeconds,
      submittedAt,
      assignedAdvisorId: officer?.id ?? null,
      decidedAt,
      decidedBy: isDecided ? 'Marcus Webb' : null,
      decisionType: summary.status === 'approved' ? 'approved'
                  : summary.status === 'auto_rejected' ? 'rejected' : null,
    }

    const loan = await prisma.loanApplication.upsert({
      where:  { legacyId: summary.id },
      update: loanData,
      create: { legacyId: summary.id, clientId: client.id, ...loanData },
    })

    /* AiAnalysis — only for loans that actually have a score
     * (ai_reviewing loans are genuinely still processing → no analysis yet). */
    if (summary.aiScore != null) {
      const analysis = buildLoanAnalysis(summary, detail, rnd)
      await prisma.aiAnalysis.upsert({
        where:  { loanApplicationId: loan.id },
        update: { ...analysis, processedAt: submittedAt },
        create: { loanApplicationId: loan.id, ...analysis, processedAt: submittedAt },
      })
      analysisCount++
    }

    /* Documents — store the per-doc parsed JSON. */
    const docs = detail.documents ?? {}
    for (const [docType, parsed] of Object.entries(docs)) {
      if (!parsed) continue
      const existing = await prisma.document.findFirst({ where: { clientId: client.id, docType } })
      if (existing) continue
      await prisma.document.create({
        data: {
          clientId: client.id,
          docType,
          filename: `${docType}.json`,
          parsedJson: parsed,
          uploadSource: 'json',
          aiConfidence: parsed.aiConfidence ?? null,
          status: parsed.status ?? null,
        },
      })
    }
  }

  console.log(`✓ Clients + LoanApplications: ${sorted.length}  (AiAnalysis: ${analysisCount})`)
}

/* ── Advisory engagements ─────────────────────────────────────────────── */

const DOC_NAME = {
  'national-id': 'National ID',
  'salary-slip': 'Salary slip',
  'personal-tax-return': 'Personal tax return',
  'corporate-tax-return': 'Corporate tax return',
  'bank-statement': 'Bank statement',
  'corporate-bank-statement': 'Corporate bank statement',
  'credit-report': 'Credit report',
  'cert-incorporation': 'Certificate of incorporation',
  'business-license': 'Business license',
  'audited-financials': 'Audited financials',
  'debt-schedule': 'Debt schedule',
  'personal-guarantor': 'Personal guarantor docs',
}
const docName = (key) => DOC_NAME[key] ?? key

/* Each engagement: which advisor handles it, the lifecycle status, completeness,
 * and which docs are missing / low-quality (drives the Advisory report charts). */
const ENGAGEMENTS = [
  { slug: 'aisha-rahman',   flow: 'personal-advisory', advisor: 'ADV-001', status: 'confirmed', engStatus: 'confirmed', clientStatus: 'active',  completeness: 88, missing: [],                  lowQuality: ['bank-statement'] },
  { slug: 'tomas-herrera',  flow: 'personal-advisory', advisor: 'ADV-003', status: 'confirmed', engStatus: 'confirmed', clientStatus: 'active',  completeness: 74, missing: ['credit-report'],   lowQuality: [] },
  { slug: 'nair-logistics', flow: 'business-advisory', advisor: 'ADV-004', status: 'confirmed', engStatus: 'confirmed', clientStatus: 'active',  completeness: 91, missing: [],                  lowQuality: ['debt-schedule'] },
  { slug: 'chen-architects',flow: 'business-advisory', advisor: 'ADV-005', status: 'declined',  engStatus: 'declined',  clientStatus: 'pending', completeness: 66, missing: ['audited-financials', 'debt-schedule'], lowQuality: [] },
]

async function seedAdvisoryEngagements () {
  let count = 0
  for (let i = 0; i < ENGAGEMENTS.length; i++) {
    const cfg = ENGAGEMENTS[i]
    const dir = `mock-data/clients/${cfg.flow}/${cfg.slug}`
    const manifestPath = path.join(ROOT, dir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) { console.warn(`  ! missing ${dir}, skipping`); continue }

    const manifest = readJson(`${dir}/manifest.json`)
    const request  = readJson(`${dir}/advisory-request.json`)
    const isBiz = cfg.flow === 'business-advisory'

    const rnd = mulberry32(0x5EED + i)
    const submittedAt = daysAgo(8 + rnd() * 70, rnd())   // advisory intake spread 8–78 days back

    /* Identity comes from national-id (personal) or cert-incorporation (business). */
    const idDoc = isBiz
      ? readJson(`${dir}/cert-incorporation.json`)
      : readJson(`${dir}/national-id.json`)
    const contact = request.contact ?? {}

    const clientLegacyId = `CL-ENG-${cfg.slug}`
    const displayName = isBiz ? (idDoc.legalName ?? idDoc.companyName ?? cfg.slug) : (idDoc.fullName ?? contact.name)
    const clientData = {
      name: titleCaseName(displayName),
      email: contact.email ?? `${cfg.slug}@example.com`,
      phone: contact.phone ?? idDoc.phone ?? null,
      type: isBiz ? 'business' : 'individual',
      company: isBiz ? titleCaseName(idDoc.legalName ?? idDoc.companyName ?? cfg.slug) : null,
      status: cfg.clientStatus,
      location: parseCityState(idDoc.address ?? idDoc.principalOffice),
      address: idDoc.address ?? idDoc.principalOffice ?? null,
      dateOfBirth: isBiz ? null : idDoc.dateOfBirth,
      idNumber: idDoc.idNumber ?? idDoc.ein ?? null,
      joinedDate: submittedAt,
    }

    const client = await prisma.client.upsert({
      where:  { legacyId: clientLegacyId },
      update: clientData,
      create: { legacyId: clientLegacyId, ...clientData },
    })

    /* Build a document checklist from the manifest (skip the advisory-request entry). */
    const docKeys = (manifest.documents ?? []).filter(d => d !== 'advisory-request')
    const documentChecklist = docKeys.map(key => {
      const status = cfg.missing.includes(key) ? 'missing'
                   : cfg.lowQuality.includes(key) ? 'low_quality'
                   : 'present'
      return {
        name: docName(key),
        status,
        note: status === 'missing' ? 'Not provided' : status === 'low_quality' ? 'Illegible / partial scan' : 'Verified',
      }
    })

    const advisor = await prisma.advisor.findUnique({ where: { legacyId: cfg.advisor } })

    /* Stable ids so the whole engagement graph upserts cleanly on re-runs. */
    const engId = `eng-${cfg.slug}`
    const engData = {
      clientId: client.id,
      flowKey: cfg.flow,
      goals: request.goals ?? [],
      timeHorizonYears: request.timeHorizonYears ?? null,
      riskTolerance: request.riskTolerance ?? (isBiz ? 'Growth' : 'Moderate'),
      monthlySurplus: request.monthlySurplus ?? null,
      currentNetWorth: request.currentNetWorth ?? null,
      status: cfg.engStatus,
      submittedAt,
    }
    const engagement = await prisma.advisoryEngagement.upsert({
      where:  { id: engId },
      update: engData,
      create: { id: engId, ...engData },
    })

    const aiData = {
      advisoryEngagementId: engagement.id,
      completenessScore: cfg.completeness,
      recommendedAdvisorId: cfg.advisor,
      advisorRationale: `Matched on ${cfg.flow.replace('-', ' ')} focus and ${request.timeHorizonYears ?? 'multi'}-year horizon.`,
      strengths: cfg.completeness >= 80 ? ['Complete document set', 'Clear goals articulated'] : ['Engaged client', 'Clear primary objective'],
      issues: documentChecklist.filter(d => d.status !== 'present').map(d => `${d.name}: ${d.note}`),
      recommendations: ['Schedule discovery call', 'Confirm risk tolerance in writing'],
      documentChecklist,
      summary: `${cfg.flow === 'business-advisory' ? 'Business' : 'Personal'} advisory engagement — completeness ${cfg.completeness}%.`,
      processedAt: new Date(submittedAt.getTime() + 2 * 86_400_000),
    }
    await prisma.aiAnalysis.upsert({
      where:  { advisoryEngagementId: engagement.id },
      update: aiData,
      create: aiData,
    })

    /* Advisor assignment — drives the Advisors leaderboard (conversion, load). */
    if (advisor) {
      const asgId = `asg-${cfg.slug}`
      const confirmed = cfg.status === 'confirmed'
      const asgData = {
        advisorId: advisor.id,
        advisoryEngagementId: engagement.id,
        rationale: aiData.advisorRationale,
        status: cfg.status,
        confirmedByOfficer: confirmed,
        confirmedAt: confirmed ? new Date(submittedAt.getTime() + 3 * 86_400_000) : null,
        confirmedBy: confirmed ? 'Marcus Webb' : null,
        declineReason: cfg.status === 'declined' ? 'Client postponed engagement' : null,
        assignedAt: new Date(submittedAt.getTime() + 2 * 86_400_000),
      }
      await prisma.advisorAssignment.upsert({
        where:  { id: asgId },
        update: asgData,
        create: { id: asgId, ...asgData },
      })
    }

    /* Persist the engagement's documents. */
    for (const key of docKeys) {
      const fp = path.join(ROOT, dir, `${key}.json`)
      if (!fs.existsSync(fp)) continue
      const parsed = readJson(`${dir}/${key}.json`)
      const existing = await prisma.document.findFirst({ where: { clientId: client.id, docType: key } })
      if (existing) continue
      await prisma.document.create({
        data: {
          clientId: client.id, docType: key, filename: `${key}.json`,
          parsedJson: parsed, uploadSource: 'json',
          status: cfg.missing.includes(key) ? 'flagged' : cfg.lowQuality.includes(key) ? 'pending' : 'verified',
        },
      })
    }
    count++
  }
  console.log(`✓ AdvisoryEngagements: ${count} (+ AiAnalysis, assignments, documents)`)
}

/* "AISHA NOOR RAHMAN" → "Aisha Noor Rahman"; leaves already-cased names alone. */
const titleCaseName = (s) => {
  if (!s) return s
  if (s !== s.toUpperCase()) return s
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

/* ── Derive each advisor's case load from what's ACTUALLY assigned ─────── *
 * clientLoad is shown on the advisor cards/leaderboard and is treated as the
 * advisor's open case count (the handoff flow increments it on reassignment).
 * Seeding it from the static advisors.json value made it disagree with the
 * real assignments, so we recompute it here:
 *     load = assigned loan applications + non-declined advisory assignments. */
async function recomputeAdvisorLoads () {
  const advisors = await prisma.advisor.findMany()
  const lines = []
  for (const a of advisors) {
    const [loanCount, advisoryCount] = await Promise.all([
      prisma.loanApplication.count({ where: { assignedAdvisorId: a.id } }),
      prisma.advisorAssignment.count({ where: { advisorId: a.id, status: { not: 'declined' } } }),
    ])
    const load = loanCount + advisoryCount
    await prisma.advisor.update({ where: { id: a.id }, data: { clientLoad: load } })
    lines.push(`    ${a.legacyId ?? a.id} ${a.name}: ${load}  (${loanCount} loans + ${advisoryCount} advisory)`)
  }
  console.log('✓ Recomputed advisor case loads from real assignments:')
  for (const l of lines) console.log(l)
}

async function main () {
  console.log('Seeding Postgres from mock JSON…')
  await seedAdvisors()
  await seedApplicantsAndLoans()
  await seedAdvisoryEngagements()
  await recomputeAdvisorLoads()
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
