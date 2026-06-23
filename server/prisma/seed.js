/* Seed script: loads mock-data JSONs into Postgres.
 * Idempotent — uses `legacyId` to upsert on re-runs.
 * Run with: `node prisma/seed.js`  (from server/) */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'))

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

async function seedAdvisors () {
  const { advisors } = readJson('mock-data/advisors.json')
  for (const a of advisors) {
    await prisma.advisor.upsert({
      where:  { legacyId: a.id },
      update: {
        name: a.name, title: a.title, specialty: a.specialty,
        initials: a.initials ?? initialsOf(a.name),
        yearsExperience: a.yearsExperience ?? 0,
        clientLoad: a.clientLoad ?? 0,
        bio: a.bio,
        languages: a.languages ?? [],
        credentials: a.credentials ?? [],
        focus: a.focus ?? [],
      },
      create: {
        legacyId: a.id,
        name: a.name, title: a.title, specialty: a.specialty,
        initials: a.initials ?? initialsOf(a.name),
        yearsExperience: a.yearsExperience ?? 0,
        clientLoad: a.clientLoad ?? 0,
        bio: a.bio,
        languages: a.languages ?? [],
        credentials: a.credentials ?? [],
        focus: a.focus ?? [],
      },
    })
  }
  console.log(`✓ Advisors: ${advisors.length}`)
}

async function seedApplicantsAndLoans () {
  const { applications } = readJson('mock-data/loan-applications.json')
  const detailFiles = fs.readdirSync(path.join(ROOT, 'mock-data/mock-application-data'))
    .filter(f => f.endsWith('.json'))

  // Index detail files by their internal id
  const detailsById = {}
  for (const f of detailFiles) {
    const d = readJson(`mock-data/mock-application-data/${f}`)
    if (d?.id) detailsById[d.id] = d
  }

  for (const summary of applications) {
    const detail = detailsById[summary.id]
    if (!detail) continue

    const pi = detail.personalInfo ?? {}
    const em = detail.employment ?? {}
    const fi = detail.financials ?? {}
    const lr = detail.loanRequest ?? {}
    const bs = detail.documents?.bankStatement

    // Client status from loan status
    const clientStatus = summary.status === 'approved'      ? 'active'
                       : summary.status === 'auto_rejected' ? 'inactive'
                       : 'pending'

    const clientLegacyId = 'CL-' + summary.id.replace('APP-', '')

    const client = await prisma.client.upsert({
      where:  { legacyId: clientLegacyId },
      update: {
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
        joinedDate: detail.submittedAt ? new Date(detail.submittedAt) : null,
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
      },
      create: {
        legacyId: clientLegacyId,
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
        joinedDate: detail.submittedAt ? new Date(detail.submittedAt) : null,
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
      },
    })

    // Loan application
    await prisma.loanApplication.upsert({
      where:  { legacyId: summary.id },
      update: {
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
        submittedAt: detail.submittedAt ? new Date(detail.submittedAt) : new Date(),
      },
      create: {
        legacyId: summary.id,
        clientId: client.id,
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
        submittedAt: detail.submittedAt ? new Date(detail.submittedAt) : new Date(),
      },
    })

    // Documents — store the per-doc parsed JSON
    const docs = detail.documents ?? {}
    for (const [docType, parsed] of Object.entries(docs)) {
      if (!parsed) continue
      // Skip if already exists for this client/type (best-effort dedup)
      const existing = await prisma.document.findFirst({
        where: { clientId: client.id, docType },
      })
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

  console.log(`✓ Clients + LoanApplications: ${applications.length}`)
}

async function main () {
  console.log('Seeding Postgres from mock JSON…')
  await seedAdvisors()
  await seedApplicantsAndLoans()
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
