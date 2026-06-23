import { useContext } from 'react'
import { OnboardingContext } from '../context/OnboardingContext'

/*
 * useOnboarding — custom hook for the entire onboarding flow
 *
 * What makes this a "custom hook":
 *   - It starts with "use" (React rule)
 *   - It calls another hook inside: useContext()
 *   - It adds its own logic on top (computed values, validation)
 *   - It hides all complexity behind a clean API
 *
 * Pages never import OnboardingContext directly.
 * They just call useOnboarding() and get back everything they need.
 *
 * Usage:
 *   const { state, updatePersonalInfo, canProceed, overallProgress } = useOnboarding()
 */
export const useOnboarding = () => {
  // ── Calls another hook — this is what makes it a custom hook ──
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>')
  const { state, dispatch } = ctx

  /* ── Computed / derived values ────────────────────────────────────
   *
   * These are calculated fresh on every render from the raw state.
   * The component doesn't need to calculate them — the hook does it.
   * This is the real benefit of custom hooks: logic lives here,
   * not scattered across 4 different page components.
   * ─────────────────────────────────────────────────────────────── */

  // How many risk questions have been answered (out of 12)
  const answeredRiskCount = Object.keys(state.riskAnswers).length

  // Overall onboarding progress as a percentage (based on completed steps)
  const overallProgress = Math.round((state.completedSteps.length / 8) * 100)

  // How many document slots have been received
  const documentsReceived  = Object.values(state.documents).filter(v => v?.status === 'received').length
  const documentsRemaining = 3 - documentsReceived

  // Check if a specific step number has been marked complete
  const isStepComplete = (step) => state.completedSteps.includes(step)

  /*
   * canProceed(step) — validates whether the user is allowed to advance
   * from a given step. Centralising this logic here means every page
   * gets the same rule — no duplicated if-statements.
   */
  const canProceed = (step) => {
    switch (step) {
      case 1: return (
        state.personalInfo.fullName.trim().length >= 2 &&
        state.personalInfo.email.trim().length > 0
      )
      case 3: return ['govId', 'proofOfAddress', 'bankStatement'].every(k => state.documents[k]?.status === 'received')
      case 5: return Object.keys(state.riskAnswers).length >= 12 // all 12 questions answered
      default: return true
    }
  }

  /* ── Action dispatchers ───────────────────────────────────────────
   *
   * Named helpers so pages never call dispatch({ type: '...' }) directly.
   * If the action name ever changes, you fix it in one place — here.
   * ─────────────────────────────────────────────────────────────── */
  return {
    // Raw state (for reading values)
    state,

    // Computed values (ready to use, no calculation needed in the page)
    answeredRiskCount,
    overallProgress,
    documentsRemaining,
    isStepComplete,
    canProceed,

    // Step 1 — Personal info (single field)
    updatePersonalInfo: (field, value) =>
      dispatch({ type: 'UPDATE_PERSONAL_INFO', field, value }),

    // Step 1 — Bulk-fill from AI extraction ({ fullName, dob, address, idNumber })
    fillPersonalInfoFromAi: (fields) =>
      dispatch({ type: 'FILL_PERSONAL_INFO_FROM_AI', fields }),

    // Step 2 — Identity verification
    setIdentityMethod: (method) =>
      dispatch({ type: 'SET_IDENTITY_METHOD', method }),

    setVerificationStatus: (status) =>
      dispatch({ type: 'SET_VERIFICATION_STATUS', status }),

    setVerificationSteps: (steps) =>
      dispatch({ type: 'SET_VERIFICATION_STEPS', steps }),

    // Step 3 — Documents
    setDocumentReceived: (slot, { fileName, fileSize, preview } = {}) =>
      dispatch({ type: 'SET_DOCUMENT_RECEIVED', slot, fileName, fileSize, preview }),

    clearDocument: (slot) =>
      dispatch({ type: 'CLEAR_DOCUMENT', slot }),

    documentsReceived,

    // Step 5 — Risk assessment
    setRiskAnswer: (questionNum, answer) =>
      dispatch({ type: 'SET_RISK_ANSWER', questionNum, answer }),

    // Any step — mark as complete
    completeStep: (step) =>
      dispatch({ type: 'COMPLETE_STEP', step }),

    // Step 4 — KYC AI review
    setKycReviewLoading: () =>
      dispatch({ type: 'SET_KYC_REVIEW_LOADING' }),

    setKycReviewResult: (result) =>
      dispatch({ type: 'SET_KYC_REVIEW_RESULT', result }),

    setKycReviewError: (error) =>
      dispatch({ type: 'SET_KYC_REVIEW_ERROR', error }),

    // Restore DB-saved personal info without clearing AI confidence
    loadFromDb: (data) =>
      dispatch({ type: 'LOAD_FROM_DB', data }),
  }
}
