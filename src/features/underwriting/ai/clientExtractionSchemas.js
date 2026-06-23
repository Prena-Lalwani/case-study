/* Gemini schemas + prompts for client onboarding document extraction.
 * Each schema returns a structured object that pre-fills the form fields. */

/* ── National ID ──────────────────────────────────────────────────────── */
export const NATIONAL_ID_SCHEMA = {
  type: 'object',
  properties: {
    fullName:    { type: 'string', description: 'Full legal name as printed on the ID' },
    dateOfBirth: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
    address:     { type: 'string', description: 'Full residential address printed on the ID' },
    idNumber:    { type: 'string', description: 'National ID / passport / driver-license number' },
    nationality: { type: 'string', description: 'Country of citizenship' },
  },
  required: ['fullName'],
}

export const NATIONAL_ID_PROMPT = `You are extracting personal identity information from a national ID document.
Read every field you can confidently identify.
Return strings only; if a value is not visible, return an empty string.
Date of birth MUST be in YYYY-MM-DD format.
Return ONLY valid JSON matching the schema. No markdown.`

/* ── Salary slip / payslip ────────────────────────────────────────────── */
export const SALARY_SLIP_SCHEMA = {
  type: 'object',
  properties: {
    employer:     { type: 'string', description: 'Name of the employer or paying company' },
    jobTitle:     { type: 'string', description: 'Employee position or job title' },
    monthlyGross: { type: 'number', description: 'Gross monthly income before deductions (USD)' },
    monthlyNet:   { type: 'number', description: 'Net take-home pay after deductions (USD)' },
  },
  required: ['employer'],
}

export const SALARY_SLIP_PROMPT = `You are extracting employment and income data from a salary slip / payslip.
If the document shows weekly or bi-weekly pay, normalise it to a monthly figure.
Return numbers (not strings) for monthlyGross and monthlyNet. Use 0 if unknown.
Return ONLY valid JSON matching the schema. No markdown.`

/* ── Bank statement ───────────────────────────────────────────────────── */
export const BANK_STATEMENT_SCHEMA = {
  type: 'object',
  properties: {
    bank:                  { type: 'string', description: 'Name of the issuing bank' },
    accountHolder:         { type: 'string', description: 'Account holder name as printed' },
    accountNumber:         { type: 'string', description: 'Account number (last 4 digits acceptable)' },
    statementPeriod:       { type: 'string', description: 'Period covered, e.g. "March 2026 – May 2026"' },
    averageMonthlyCredit:  { type: 'number', description: 'Average monthly total credits across periods (USD)' },
    averageMonthlyDebit:   { type: 'number', description: 'Average monthly total debits across periods (USD)' },
    averageClosingBalance: { type: 'number', description: 'Average closing balance across periods (USD)' },
  },
  required: ['bank'],
}

export const BANK_STATEMENT_PROMPT = `You are extracting summary information from a multi-month bank statement.
Compute the monthly averages across all months shown.
Return numbers (not strings) for the average fields. Use 0 if unknown.
Return ONLY valid JSON matching the schema. No markdown.`
