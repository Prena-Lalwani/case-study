/* Deterministic 90-day historical activity for the Reports section.
 * Same numbers on every page load — seeded with a fixed value.
 *
 * Exposes:
 *   getHistory()           → full 90-day series
 *   sliceByPeriod(p, hist) → returns the relevant slice for the chosen period
 */

import advisorsJson from '../../../../mock-data/advisors.json'

const advisors = advisorsJson.advisors

const SEED = 0xCAFE_BEEF

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

const isoDay = d => d.toISOString().slice(0, 10)

const startOfDay = d => {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

const addDays = (d, n) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

const LOAN_TYPES = ['Home loan', 'Auto loan', 'Personal loan', 'Business loan']
const FLOWS      = ['personal-advisory', 'business-advisory', 'personal-loan', 'business-loan']

/* Build 90 days of history ending today. */
const buildHistory = () => {
  const rnd = mulberry32(SEED)
  const today = startOfDay(new Date())
  const days = []

  /* Slow upward trend baked in */
  for (let i = 89; i >= 0; i--) {
    const date  = addDays(today, -i)
    const dayIx = 89 - i           // 0 = oldest, 89 = today
    const trend = 1 + (dayIx / 89) * 0.5    // up to 50% growth across the window
    const weekOsc = 0.85 + 0.3 * Math.sin(dayIx / 7 * Math.PI)  // weekly oscillation

    /* New clients per flow per day */
    const newClients = {
      'personal-advisory': Math.max(0, Math.round((1.5 + rnd() * 1.5) * trend * weekOsc)),
      'business-advisory': Math.max(0, Math.round((0.8 + rnd() * 1.0) * trend * weekOsc)),
      'personal-loan':     Math.max(0, Math.round((3.2 + rnd() * 2.0) * trend * weekOsc)),
      'business-loan':     Math.max(0, Math.round((1.0 + rnd() * 1.2) * trend * weekOsc)),
    }

    /* Loan decisions made today (lag behind submissions a few days) */
    const loanDecisionTotal = newClients['personal-loan'] + newClients['business-loan'] + Math.round(rnd() * 2)
    const approveRate = 0.58 + rnd() * 0.20     // 58–78%
    const rejectRate  = 0.10 + rnd() * 0.12     // 10–22%
    const approved   = Math.round(loanDecisionTotal * approveRate)
    const rejected   = Math.round(loanDecisionTotal * rejectRate)
    const needsReview = Math.max(0, loanDecisionTotal - approved - rejected)

    /* Per-loan-type submissions today */
    const loanTypeMix = {}
    let remaining = newClients['personal-loan'] + newClients['business-loan']
    LOAN_TYPES.forEach((t, ix) => {
      const isLast = ix === LOAN_TYPES.length - 1
      loanTypeMix[t] = isLast ? remaining : Math.round(remaining * (0.15 + rnd() * 0.35))
      remaining = Math.max(0, remaining - loanTypeMix[t])
    })

    /* Mock loan value submitted today (USD) */
    const loanValue = (
      loanTypeMix['Home loan']     * (250_000 + rnd() * 200_000) +
      loanTypeMix['Auto loan']     * ( 28_000 + rnd() *  20_000) +
      loanTypeMix['Personal loan'] * ( 18_000 + rnd() *  15_000) +
      loanTypeMix['Business loan'] * (350_000 + rnd() * 600_000)
    )

    /* Advisory metrics */
    const avgCompleteness = Math.round(68 + rnd() * 20 + (dayIx / 89) * 5)  // mild upward trend
    const avgLoanScore    = Math.round(64 + rnd() * 18 + (dayIx / 89) * 4)
    const engagementReady = Math.round((avgCompleteness >= 80 ? 0.55 : 0.40) * 100) / 100  // pct

    days.push({
      date: isoDay(date),
      newClients,
      newClientsTotal: Object.values(newClients).reduce((s, v) => s + v, 0),
      loans: {
        approved, rejected, needsReview,
        total: approved + rejected + needsReview,
        approveRate: loanDecisionTotal > 0 ? approved / loanDecisionTotal : 0,
        valueSubmitted: Math.round(loanValue),
        typeMix: loanTypeMix,
      },
      advisory: {
        avgCompletenessScore: avgCompleteness,
        engagementReadyPct:   engagementReady,
      },
      loanAiScore: avgLoanScore,
    })
  }

  /* Advisor activity totals across the 90-day window */
  const advisorActivity = advisors.map(a => {
    const r = mulberry32(SEED + a.id.charCodeAt(4))
    const totalAssigned   = Math.round(15 + r() * 25)                // 15–40
    const avgCompleteness = Math.round(70 + r() * 18)                // 70–88
    const completionRate  = 0.65 + r() * 0.30                        // 65–95%
    const conversion      = 0.60 + r() * 0.30                        // engagement → confirmed
    const override        = r() * 0.20                               // analyst overrode AI pick (0–20%)
    return {
      ...a,
      totalAssigned,
      avgCompleteness,
      completionRate: Math.round(completionRate * 100) / 100,
      conversion:     Math.round(conversion * 100)     / 100,
      override:       Math.round(override * 100)       / 100,
    }
  })

  /* Common missing-docs tally across the window */
  const missingDocs = [
    { name: 'Tax return',                count: Math.round(38 + mulberry32(SEED+1)() * 10) },
    { name: 'Bank statement',            count: Math.round(22 + mulberry32(SEED+2)() * 8) },
    { name: 'Debt schedule',             count: Math.round(31 + mulberry32(SEED+3)() * 9) },
    { name: 'Audited financials',        count: Math.round(18 + mulberry32(SEED+4)() * 6) },
    { name: 'Personal guarantor docs',   count: Math.round(14 + mulberry32(SEED+5)() * 5) },
    { name: 'Credit report',             count: Math.round(11 + mulberry32(SEED+6)() * 4) },
    { name: 'Salary slip',               count: Math.round( 9 + mulberry32(SEED+7)() * 4) },
    { name: 'Certificate of incorporation', count: Math.round(7 + mulberry32(SEED+8)() * 3) },
  ].sort((a, b) => b.count - a.count)

  /* Doc-quality breakdown */
  const docQuality = (() => {
    const r = mulberry32(SEED + 99)
    const total = days.reduce((s, d) => s + d.newClientsTotal, 0) * 5  // ~5 docs/client
    const present     = Math.round(total * (0.62 + r() * 0.08))
    const missing     = Math.round(total * (0.12 + r() * 0.04))
    const lowQuality  = Math.round(total * (0.10 + r() * 0.04))
    const inconsistent = total - present - missing - lowQuality
    return { present, missing, lowQuality, inconsistent, total }
  })()

  return { days, advisorActivity, missingDocs, docQuality }
}

/* Cache the build to keep numbers stable in a single session */
let cached = null
export const getHistory = () => {
  if (!cached) cached = buildHistory()
  return cached
}

/* ── Period slicing ───────────────────────────────────────────────────── */
const PERIODS = {
  '1d':  1,
  '7d':  7,
  '30d': 30,
  '90d': 90,
  'ytd': null,
}

export const PERIOD_OPTIONS = [
  { key: '1d',  label: 'Today'    },
  { key: '7d',  label: '7 days'   },
  { key: '30d', label: '30 days'  },
  { key: '90d', label: '90 days'  },
  { key: 'ytd', label: 'YTD'      },
]

export const sliceByPeriod = (period, history) => {
  const days = history.days
  if (period === 'ytd') {
    const startOfYear = isoDay(new Date(new Date().getFullYear(), 0, 1))
    return days.filter(d => d.date >= startOfYear)
  }
  const n = PERIODS[period] ?? 30
  return days.slice(-n)
}

/* ── Aggregations ─────────────────────────────────────────────────────── */
export const aggregate = days => {
  if (!days.length) {
    /* Zero-state so report tabs render an empty (rather than blank) UI. */
    return {
      days: [],
      totalNew: 0,
      newClients: { 'personal-advisory': 0, 'business-advisory': 0, 'personal-loan': 0, 'business-loan': 0 },
      loans: {
        approved: 0, rejected: 0, needsReview: 0,
        decisionsTotal: 0, approveRate: 0, valueSubmitted: 0,
        typeMix: { 'Home loan': 0, 'Auto loan': 0, 'Personal loan': 0, 'Business loan': 0 },
      },
      avgCompleteness: 0,
      avgLoanScore: 0,
    }
  }

  const newClients = { 'personal-advisory': 0, 'business-advisory': 0, 'personal-loan': 0, 'business-loan': 0 }
  let totalNew = 0, approved = 0, rejected = 0, needsReview = 0
  let loanValue = 0
  const loanTypeMix = { 'Home loan': 0, 'Auto loan': 0, 'Personal loan': 0, 'Business loan': 0 }
  let completenessSum = 0, completenessN = 0
  let loanScoreSum = 0,    loanScoreN = 0

  for (const d of days) {
    for (const k of Object.keys(newClients)) newClients[k] += d.newClients[k]
    totalNew      += d.newClientsTotal
    approved      += d.loans.approved
    rejected      += d.loans.rejected
    needsReview   += d.loans.needsReview
    loanValue     += d.loans.valueSubmitted
    for (const t of LOAN_TYPES) loanTypeMix[t] += d.loans.typeMix[t]
    completenessSum += d.advisory.avgCompletenessScore; completenessN++
    loanScoreSum    += d.loanAiScore;                    loanScoreN++
  }

  const decisionsTotal = approved + rejected + needsReview

  return {
    days,
    totalNew,
    newClients,
    loans: {
      approved, rejected, needsReview,
      decisionsTotal,
      approveRate: decisionsTotal > 0 ? approved / decisionsTotal : 0,
      valueSubmitted: loanValue,
      typeMix: loanTypeMix,
    },
    avgCompleteness: completenessN > 0 ? Math.round(completenessSum / completenessN) : 0,
    avgLoanScore:    loanScoreN   > 0 ? Math.round(loanScoreSum    / loanScoreN)    : 0,
  }
}

/* Returns delta % vs the immediately-prior equivalent window */
export const deltaVsPrior = (period, history) => {
  const days = history.days
  let span
  if (period === 'ytd') {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)
    span = Math.ceil((Date.now() - startOfYear.getTime()) / 86_400_000)
  } else {
    span = PERIODS[period] ?? 30
  }
  if (days.length < span * 2) return null
  const current = days.slice(-span)
  const prior   = days.slice(-span * 2, -span)
  const curSum   = current.reduce((s, d) => s + d.newClientsTotal, 0)
  const priorSum = prior  .reduce((s, d) => s + d.newClientsTotal, 0)
  if (priorSum === 0) return null
  return (curSum - priorSum) / priorSum
}
