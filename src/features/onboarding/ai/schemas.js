/*
 * Gemini response schemas — one per step.
 * Each schema tells Gemini exactly what JSON shape to return.
 * The 'type' strings ('object', 'string') are Gemini's SchemaType values.
 */

/*
 * Each field in the schema returns an object with two keys:
 *   value      — the extracted text
 *   confidence — how sure Gemini is, 0–100
 *
 * This lets the UI show a confidence badge next to each form field.
 */
const fieldSchema = (description) => ({
  type: 'object',
  properties: {
    value:           { type: 'string', description },
    confidence:      { type: 'number', description: 'Extraction confidence 0–100. 0 = not found.' },
    validationError: { type: 'string', description: 'Business rule failure message. Empty string if the value is valid.' },
  },
  required: ['value', 'confidence', 'validationError'],
})

/* ── Step 1: Extract personal info from a government ID / JSON ────── */
export const PERSONAL_INFO_SCHEMA = {
  type: 'object',
  properties: {
    fullName: fieldSchema('Full legal name exactly as it appears on the document'),
    dob:      fieldSchema('Date of birth formatted as DD Mon YYYY, e.g. 14 Mar 1985'),
    address:  fieldSchema('Full residential address'),
    email:    fieldSchema('Email address if present on the document or data'),
    phone:    fieldSchema('Phone number including country code if available'),
    ssn:      fieldSchema('National ID, SSN, or passport number'),
  },
  required: ['fullName', 'dob', 'address', 'email', 'phone', 'ssn'],
}

export const PERSONAL_INFO_PROMPT =
  'You are a KYC data extraction AI. Extract personal information from the provided ' +
  'document or data. For each field return: ' +
  '(1) value — the extracted text exactly as it appears, ' +
  '(2) confidence — extraction quality 0–100 (0 = not found), ' +
  '(3) validationError — a short human-readable message if the value fails a business rule, otherwise an empty string. ' +
  'Business rules to enforce: ' +
  '• dob: applicant must be 25 years or older. If under 25, still return the extracted date but set validationError to "Applicant must be 25 or older". ' +
  '• ssn: must match a standard format (e.g. XXX-XX-XXXX for SSN, or a valid passport/national ID pattern). If format is wrong, set validationError to "ID number format is invalid". ' +
  '• address: must be complete — include house/apartment number, street, city, state/province, and postal code. If any part is missing or unclear, set validationError to "Address is incomplete — please verify". ' +
  'Format date of birth as "DD Mon YYYY" (e.g. "14 Mar 1985"). ' +
  'If a field is not present at all, return value as empty string, confidence as 0, validationError as empty string.'

/* ── Step 3: Classify and extract data from a financial document ─── */
export const DOCUMENT_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', description: 'e.g. Bank Statement, Utility Bill, Tax Return' },
    isAuthentic:  { type: 'boolean', description: 'Whether the document appears genuine and unaltered' },
    confidence:   { type: 'number', description: 'Confidence score 0-100' },
    extractedFields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
      description: 'Key fields extracted from the document',
    },
    flags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Any issues or warnings found, e.g. "Address partially obscured"',
    },
  },
  required: ['documentType', 'isAuthentic', 'confidence', 'extractedFields', 'flags'],
}

export const DOCUMENT_PROMPT =
  'You are a financial document verification AI. Analyze this document image, classify it, ' +
  'determine authenticity, extract key fields (names, dates, amounts, account numbers), ' +
  'assign a confidence score, and list any issues found.'

/* ── Step 4: KYC compliance review across all collected data ─────── */
export const KYC_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    overallStatus: {
      type: 'string',
      description: 'APPROVED | REVIEW_NEEDED | REJECTED',
    },
    score: {
      type: 'number',
      description: 'Overall compliance score 0–100',
    },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label:  { type: 'string' },
          status: { type: 'string', description: 'pass | fail | warning' },
          note:   { type: 'string' },
        },
        required: ['label', 'status', 'note'],
      },
    },
    summary: {
      type: 'string',
      description: '2-3 sentence plain English summary for the advisor',
    },
  },
  required: ['overallStatus', 'score', 'checks', 'summary'],
}

export const buildKycPrompt = (state) => {
  const p    = state.personalInfo
  const id   = state.identity
  const docs = state.documents

  const idMethod = id.method === 'biometric'
    ? 'Biometric scan (simulated)'
    : 'Government ID upload'

  const govIdFile    = docs.govId?.fileName          || (id.method === 'biometric' ? 'Biometric (no file)' : 'Not provided')
  const addressFile  = docs.proofOfAddress?.fileName || 'Not provided'
  const bankFile     = docs.bankStatement?.fileName  || 'Not provided'

  return `You are a KYC compliance officer at a wealth management firm.

Review the following client onboarding submission and provide a structured analysis.

CLIENT INFORMATION:
- Full Name: ${p.fullName    || 'Not provided'}
- Date of Birth: ${p.dob    || 'Not provided'}
- Address: ${p.address       || 'Not provided'}
- Email: ${p.email           || 'Not provided'}
- Phone: ${p.phone           || 'Not provided'}
- National ID / SSN: ${p.ssn || 'Not provided'}

IDENTITY VERIFICATION:
- Method: ${idMethod}
- Status: ${id.verificationStatus}

DOCUMENTS SUBMITTED:
- Identity Document: ${govIdFile}
- Proof of Address: ${addressFile}
- Bank Statement: ${bankFile}

Evaluate this submission across exactly these 5 checks in this order:
1. Identity Verified — is the identity method and document valid?
2. Documents Complete — are all 3 required documents present?
3. Address Consistency — does the address match across documents and personal info?
4. AML Risk Check — any anti-money laundering concerns based on available data?
5. Profile Completeness — is all required personal information provided?

Be realistic: missing documents or fields must be flagged as fail or warning.`
}

/* ── Step 5: Build a risk profile from quiz answers ─────────────── */
export const RISK_PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    investorType:      { type: 'string', description: 'e.g. Conservative, Moderate, Aggressive' },
    riskScore:         { type: 'number', description: 'Risk score 1-10' },
    recommendedHorizon:{ type: 'string', description: 'Recommended investment time horizon' },
    summary:           { type: 'string', description: 'One sentence profile summary' },
    recommendedFunds:  {
      type: 'array',
      items: { type: 'string' },
      description: 'Top 3 recommended fund types for this profile',
    },
  },
  required: ['investorType', 'riskScore', 'recommendedHorizon', 'summary', 'recommendedFunds'],
}

export const RISK_PROFILE_PROMPT =
  'You are a financial advisor AI. Based on the investor quiz answers provided, ' +
  'determine the investor type, assign a risk score 1-10, recommend an investment horizon, ' +
  'write a one-sentence profile summary, and suggest 3 appropriate fund types.'
