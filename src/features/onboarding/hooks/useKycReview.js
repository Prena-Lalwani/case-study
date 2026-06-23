import { useState, useEffect, useRef } from 'react'
import { useOnboarding } from './useOnboarding'

/* ─── Build a mock KYC result from actual submitted state ─────────
 * No real Gemini call — simulates the review based on what the user
 * actually filled in / uploaded so the result feels contextual.
 * ─────────────────────────────────────────────────────────────── */
const buildMockResult = (state) => {
  const p    = state.personalInfo
  const id   = state.identity
  const docs = state.documents

  const allDocsReceived =
    docs.govId?.status === 'received' &&
    docs.proofOfAddress?.status === 'received' &&
    docs.bankStatement?.status === 'received'

  const identityOk = id.verificationStatus === 'verified' || id.verificationStatus === 'received'
  const hasFullName = !!p.fullName?.trim()
  const hasDob      = !!p.dob?.trim()
  const hasAddress  = !!p.address?.trim()
  const hasPhone    = !!p.phone?.trim()
  const hasSsn      = !!p.ssn?.trim()
  const profileComplete = hasFullName && hasDob && hasAddress && hasPhone && hasSsn

  const checks = [
    {
      label:  'Identity Verified',
      status: identityOk ? 'pass' : 'fail',
      note:   identityOk
        ? `${id.method === 'biometric' ? 'Biometric scan' : 'Government ID'} confirmed successfully.`
        : 'No identity verification completed.',
    },
    {
      label:  'Documents Complete',
      status: allDocsReceived ? 'pass' : 'fail',
      note:   allDocsReceived
        ? 'All three required documents received and queued for review.'
        : 'One or more required documents are missing.',
    },
    {
      label:  'Address Consistency',
      status: hasAddress ? 'pass' : 'warning',
      note:   hasAddress
        ? 'Residential address present and consistent with submitted documents.'
        : 'No address on file — cross-check not possible.',
    },
    {
      label:  'AML Risk Check',
      status: 'pass',
      note:   'No anti-money laundering flags detected in submitted data.',
    },
    {
      label:  'Profile Completeness',
      status: profileComplete ? 'pass' : 'warning',
      note:   profileComplete
        ? 'All required personal information fields are present.'
        : `Missing fields: ${[!hasDob && 'Date of birth', !hasPhone && 'Phone', !hasSsn && 'National ID'].filter(Boolean).join(', ')}.`,
    },
  ]

  const failCount    = checks.filter(c => c.status === 'fail').length
  const warningCount = checks.filter(c => c.status === 'warning').length

  // Only REJECT when BOTH identity AND documents are missing — receiving
  // docs is enough to guarantee at least REVIEW_NEEDED (score ≥ 80)
  const overallStatus =
    (!identityOk && !allDocsReceived) ? 'REJECTED'
    : (failCount >= 1 || warningCount > 0) ? 'REVIEW_NEEDED'
    : 'APPROVED'

  const score =
    overallStatus === 'APPROVED'        ? Math.floor(Math.random() * 8)  + 90 // 90–97
    : overallStatus === 'REVIEW_NEEDED' ? Math.floor(Math.random() * 10) + 80 // 80–89
    : Math.floor(Math.random() * 20) + 45  // 45–64 (REJECTED)

  const summaryMap = {
    APPROVED:      `${p.fullName || 'The client'}'s submission meets all primary KYC requirements. Identity has been confirmed, all three documents are received, and no risk flags were raised. The application is cleared to proceed to the next stage.`,
    REVIEW_NEEDED: `${p.fullName || 'The client'}'s submission is largely complete but contains items requiring manual review. Please verify the flagged fields before proceeding. The application may be approved once outstanding items are resolved.`,
    REJECTED:      `${p.fullName || 'The client'}'s submission does not meet the minimum KYC requirements. Critical documents or identity verification are missing. The application cannot proceed until the issues are resolved.`,
  }

  return { overallStatus, score, checks, summary: summaryMap[overallStatus] }
}

/* ─── Hook ────────────────────────────────────────────────────────── */
export const useKycReview = () => {
  const { state, setKycReviewLoading, setKycReviewResult, setKycReviewError } = useOnboarding()
  const kyc = state.kycReview

  // Always start at 0 — review reruns fresh every time the user enters Step 4
  const [progress, setProgress] = useState(0)
  const runningRef = useRef(false)

  useEffect(() => {
    // StrictMode double-invoke guard; cleared in cleanup so remounts always rerun
    if (runningRef.current) return

    runningRef.current = true
    setKycReviewLoading() // reset any stale result from a previous visit

    // Animate progress 0 → 85 while "processing"
    const intervalId = setInterval(() => {
      setProgress((p) => Math.min(p + 3, 85))
    }, 100)

    // Capture current state snapshot now (reflects latest docs / identity)
    const snapshot = state

    // Simulate ~3.5s processing time
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId)
      try {
        const result = buildMockResult(snapshot)
        setProgress(100)
        setKycReviewResult(result)
      } catch (err) {
        setKycReviewError(err.message ?? 'Review failed')
      }
    }, 3500)

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
      runningRef.current = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isLoading: kyc.status === 'loading' || kyc.status === null,
    isSuccess: kyc.status === 'done',
    isError:   kyc.status === 'error',
    result:    kyc.result,
    progress,
    error:     kyc.error ?? 'Something went wrong',
  }
}
