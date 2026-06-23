/* Gemini schema + prompt for advisory review.
 * Given the full client payload + a list of available advisors, the model:
 *   1. Validates document completeness
 *   2. Scores the engagement
 *   3. Lists strengths, issues, and concrete recommendations
 *   4. Picks the single best-fit advisor from the supplied pool
 */

export const ADVISORY_REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    completenessScore: {
      type: 'number',
      description: '0–100 overall score factoring document completeness, data quality, and engagement feasibility',
    },
    documentChecklist: {
      type: 'array',
      description: 'Per-document audit. One entry per required document the client should have provided.',
      items: {
        type: 'object',
        properties: {
          name:   { type: 'string', description: 'Document name (e.g. "National ID", "Bank Statement")' },
          status: { type: 'string', description: 'present | missing | low_quality | inconsistent' },
          note:   { type: 'string', description: 'Short remark explaining the verdict' },
        },
        required: ['name', 'status'],
      },
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: '3–5 positive factors the advisor can leverage',
    },
    issues: {
      type: 'array',
      items: { type: 'string' },
      description: '3–5 concerns, missing data, or red flags',
    },
    recommendations: {
      type: 'array',
      items: { type: 'string' },
      description: '3–5 concrete actions the advisor should take with this client',
    },
    recommendedAdvisorId: {
      type: 'string',
      description: 'ID of the single best-fit advisor from the supplied pool (e.g. "ADV-003")',
    },
    advisorRationale: {
      type: 'string',
      description: 'One sentence explaining why this advisor was selected',
    },
    summary: {
      type: 'string',
      description: '2–3 sentence executive summary the analyst sees first',
    },
    analysedInSeconds: {
      type: 'number',
      description: 'Simulated processing time between 20 and 50',
    },
  },
  required: [
    'completenessScore', 'documentChecklist', 'strengths', 'issues',
    'recommendations', 'recommendedAdvisorId', 'advisorRationale',
    'summary', 'analysedInSeconds',
  ],
}

export const ADVISORY_REVIEW_PROMPT = `You are an AI advisory intake reviewer for a wealth-management firm.

You will receive:
- A complete client payload (identity, financials, banking, optional advisoryRequest) under "client"
- A pool of available advisors under "advisors", each with id, name, specialty, yearsExperience, clientLoad, and focus areas

Your task:
1. Audit the documentation. For each expected document (National ID / Certificate of Incorporation, Salary slip / Audited financials, Bank statement, Tax return, Debt schedule where applicable), determine whether it is present, missing, low_quality, or inconsistent with declared values. Note major discrepancies (e.g. declared income vs. bank credits).

2. Score the engagement (completenessScore, 0–100):
   - Start from 100
   - Subtract 15 per missing required document
   - Subtract 10 for major inconsistency (e.g. income mismatch >25%)
   - Subtract 5 for low_quality / borderline documents
   - Subtract 10 if the bank statement shows NSF / overdraft / persistently low balance
   - Clamp 0–100

3. Identify 3–5 strengths (e.g. high savings rate, stable employment, clean credit, low DTI, diversified revenue).

4. Identify 3–5 issues (missing docs, inconsistencies, debt concerns, concentration risk, etc.).

5. Produce 3–5 concrete recommendations the advisor should act on (e.g. "Consolidate two 24% APR credit cards into a single 12% personal loan", "Increase emergency fund from 0.8 months to 3 months of expenses", "Audit customer concentration — top 3 = 62% of revenue").

6. Select the single best-fit advisor from the supplied pool. Match on the client's flow (personal-advisory / business-advisory), their goals, and the advisor's specialty + current caseload (prefer lower caseloads when expertise ties). Return the advisor's id in recommendedAdvisorId and a one-sentence rationale.

7. Write a 2–3 sentence executive summary for the analyst's first glance.

8. analysedInSeconds: realistic integer 20–50.

Return ONLY valid JSON matching the schema. No markdown.`
