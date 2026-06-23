import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

const totalsFromLoans = (loans = []) => {
  const approved = loans.filter(l => l.status === 'approved')
  return {
    totalApplications: loans.length,
    totalApproved:     approved.reduce((s, l) => s + (l.amount ?? 0), 0),
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
})

// GET /api/clients
router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: { loanApplications: true },
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
    include: { loanApplications: true, advisoryEngagements: true, documents: true },
  })
  if (!c) return res.status(404).json({ error: 'Client not found' })
  res.json({ ...serializeClient(c), documents: c.documents, advisoryEngagements: c.advisoryEngagements, loanApplications: c.loanApplications })
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

export default router
