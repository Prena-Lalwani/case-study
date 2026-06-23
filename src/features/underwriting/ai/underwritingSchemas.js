/*
 * Gemini schema + prompt for underwriting AI analysis.
 * The AI receives application data WITHOUT aiAnalysis and must return
 * a structurally identical aiAnalysis object, computed from scratch
 * using the DR-1 through DR-6 validation rules.
 */

/* ── Response schema ──────────────────────────────────────────────────── */
export const UNDERWRITING_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {

    recommendation: {
      type: 'string',
      description: 'APPROVE | REVIEW | REJECT based on final aiScore',
    },

    aiScore: {
      type: 'number',
      description: 'Final score 0–100 after applying all DR deductions and risk penalties',
    },

    dti: {
      type: 'number',
      description: 'Debt-to-Income ratio as a whole number percentage, e.g. 36',
    },

    analysedInSeconds: {
      type: 'number',
      description: 'Simulated processing time between 25 and 60',
    },

    extractedData: {
      type: 'object',
      properties: {
        verifiedName:               { type: 'string', description: 'Full name as it appears on the National ID' },
        verifiedMonthlyIncome:      { type: 'number', description: 'Gross monthly income from salary slip' },
        verifiedEmployer:           { type: 'string', description: 'Employer name from salary slip' },
        averageBankCredit3Months:   { type: 'number', description: 'Average monthly total credits from bank statement' },
        proposedMonthlyPayment:     { type: 'number', description: 'Estimated monthly loan repayment from loanRequest' },
        existingMonthlyObligations: { type: 'number', description: 'Sum of all existing monthly debt payments' },
        totalMonthlyObligations:    { type: 'number', description: 'existingMonthlyObligations + proposedMonthlyPayment' },
        effectiveDTI:               { type: 'number', description: 'totalMonthlyObligations / grossMonthlyIncome * 100, one decimal place' },
      },
      required: [
        'verifiedName', 'verifiedMonthlyIncome', 'verifiedEmployer',
        'averageBankCredit3Months', 'proposedMonthlyPayment',
        'existingMonthlyObligations', 'totalMonthlyObligations', 'effectiveDTI',
      ],
    },

    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: '3–5 positive factors observed in the application data',
    },

    issues: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concerns, inconsistencies, or risk factors found during analysis',
    },

    explanation: {
      type: 'string',
      description: '2–3 sentence plain-English summary of the overall assessment',
    },

    confidenceScores: {
      type: 'object',
      properties: {
        identityVerification: { type: 'number', description: 'Confidence in identity check 0–100' },
        incomeVerification:   { type: 'number', description: 'Confidence in income verification 0–100' },
        documentAuthenticity: { type: 'number', description: 'Overall document authenticity confidence 0–100' },
      },
      required: ['identityVerification', 'incomeVerification', 'documentAuthenticity'],
    },

  },
  required: [
    'recommendation', 'aiScore', 'dti', 'analysedInSeconds',
    'extractedData', 'strengths', 'issues', 'explanation', 'confidenceScores',
  ],
}

/* ── Prompt ───────────────────────────────────────────────────────────── */
export const UNDERWRITING_ANALYSIS_PROMPT = `You are an AI loan underwriting analyst. You will receive a loan application JSON containing:
- personalInfo (declared by applicant)
- employment (declared by applicant)
- financials (declared by applicant)
- loanRequest (loan details)
- documents (data extracted from uploaded documents: nationalId, salarySlip, bankStatement)

Your task is to cross-validate the declared values against the document data using the rules below, score the application, and return a structured analysis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA RECONCILIATION RULES (apply all 6)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DR-1 · Full Name
  Compare: personalInfo.fullName vs documents.nationalId.fullName
  Exact match (or minor format difference like "Sam Mitchell" vs "Samuel James Mitchell") → deduction: 0
  Minor similarity (different but recognisably same person) → deduction: 5
  Major difference (different person) → deduction: 20

DR-2 · Monthly Gross Income
  Compare: employment.monthlyGross vs documents.salarySlip.grossSalary
  Variance % = |declared - verified| / verified × 100
  ≤ 10% → deduction: 0
  10%–20% → deduction: 10
  > 20% → deduction: 25

DR-3 · Monthly Net Income
  Compare: employment.monthlyNet vs documents.salarySlip.netPay
  Difference % = |net - netPay| / netPay × 100
  ≤ 10% → deduction: 0
  10%–20% → deduction: 10
  > 20% → deduction: 25

DR-4 · Average Bank Credits vs Declared Income
  Compare: employment.monthlyGross vs documents.bankStatement.averageMonthlyCredit
  Difference % = |gross - avgCredit| / gross × 100
  ≤ 10% → deduction: 0
  10%–20% → deduction: 10
  > 20% → deduction: 25

DR-5 · Employer
  Compare: employment.employer vs documents.salarySlip.employer
  Exact or near match → deduction: 0
  Partial match (abbreviation, subsidiary) → deduction: 10
  Mismatch → deduction: 25

DR-6 · Address
  Compare: personalInfo.address vs documents.nationalId.address
  Match or minor formatting difference → deduction: 0–3
  Major difference (different street or city) → deduction: 15

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADDITIONAL RISK PENALTIES (applied after DR rules)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DTI > 43% → deduction: 5
DTI > 50% → additional deduction: 10
Credit score < 640 → deduction: 10
Credit score < 600 → additional deduction: 10
Each late payment in last 24 months → deduction: 4 (max 3 payments counted)
LTV > 80% (home loans only) → deduction: 5
LTV > 85% → additional deduction: 10
Any bank statement overdraft or NSF flag → deduction: 8 each (max 2)
Document AI confidence < 85% on any doc → deduction: 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Start with base score = 100.
Subtract all DR deductions and risk penalties.
Clamp result to range 0–100.
This is aiScore.

RECOMMENDATION based on aiScore:
  ≥ 80 → APPROVE
  60–79 → REVIEW
  < 60 → REJECT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DTI CALCULATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DTI = (financials.totalMonthlyDebtPayments + loanRequest.estimatedMonthlyPayment) / employment.monthlyGross × 100
Round to nearest whole number.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIDENCE SCORES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

identityVerification → use documents.nationalId.aiConfidence
incomeVerification   → use documents.salarySlip.aiConfidence
documentAuthenticity → average of nationalId, salarySlip, and bankStatement aiConfidence values

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

strengths: List 3–5 genuine positive factors found in the data (e.g. stable employment, clean payment history, strong credit score).
issues: List every concern or inconsistency you found (e.g. DTI above threshold, late payments, LTV above preferred limit, income variance).
explanation: Write 2–3 sentences summarising your finding for the reviewing officer.
analysedInSeconds: Return a realistic integer between 25 and 60.

Return ONLY valid JSON matching the required schema. No markdown, no explanation outside the JSON.`
