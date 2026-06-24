import { useState } from 'react'
import {
  TbRobot, TbCircleCheck, TbLoader, TbCircle,
  TbClock, TbMail, TbShieldCheck, TbScan, TbId,
  TbAlertTriangle, TbX,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AiReviewLogPanel from '../components/AiReviewLogPanel'
import BottomBar from '../components/BottomBar'
import { useKycReview } from '../hooks/useKycReview'

/* ─── Placeholder checks while Gemini is running ────────────────── */
const LOADING_CHECKS = [
  { label: 'Identity verified',    status: 'in_progress', note: 'Verifying…'           },
  { label: 'Documents complete',   status: 'pending',     note: 'Waiting…'              },
  { label: 'Address consistency',  status: 'pending',     note: 'Waiting…'              },
  { label: 'AML risk check',       status: 'pending',     note: 'Waiting…'              },
  { label: 'Profile completeness', status: 'pending',     note: 'Waiting…'              },
]

/* ─── What the AI checks (static info section) ───────────────────── */
const WHAT_CHECKS = [
  { icon: TbShieldCheck, title: 'AML risk screening',     sub: 'Anti-money laundering patterns checked against submission data' },
  { icon: TbScan,        title: 'Document completeness',  sub: 'Verifies all required documents are present and accounted for' },
  { icon: TbId,          title: 'Identity consistency',   sub: 'Cross-checks name, DOB, and address across all submitted files'  },
]

/* ─── Check row icon ─────────────────────────────────────────────── */
const CheckIcon = ({ status }) => {
  if (status === 'pass')        return <TbCircleCheck className="text-success shrink-0"           style={{ fontSize: 22 }} />
  if (status === 'fail')        return <TbX           className="text-error shrink-0"             style={{ fontSize: 22 }} />
  if (status === 'warning')     return <TbAlertTriangle className="text-warning shrink-0"         style={{ fontSize: 22 }} />
  if (status === 'in_progress') return <TbLoader      className="text-indigo-500 shrink-0 animate-spin" style={{ fontSize: 22 }} />
  return                               <TbCircle      className="text-gray-300 shrink-0"          style={{ fontSize: 22 }} />
}

const CHECK_BADGE = {
  pass:        { text: 'PASS',        cls: 'text-success'    },
  fail:        { text: 'FAIL',        cls: 'text-error'      },
  warning:     { text: 'WARNING',     cls: 'text-warning'    },
  in_progress: { text: 'CHECKING',   cls: 'text-indigo-500' },
  pending:     { text: 'PENDING',    cls: 'text-tertiary'   },
}

/* ─── Overall status banner ─────────────────────────────────────── */
const StatusBanner = ({ overallStatus, score }) => {
  if (overallStatus === 'APPROVED') return (
    <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-5">
      <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 20 }} />
      <div>
        <p className="text-[14px] font-semibold text-success">Application approved — {score}/100 compliance score</p>
        <p className="text-[12px] text-secondary mt-0.5">All checks passed. You may continue to the next step.</p>
      </div>
    </div>
  )
  if (overallStatus === 'REJECTED') return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
      <TbX className="text-error shrink-0" style={{ fontSize: 20 }} />
      <div>
        <p className="text-[14px] font-semibold text-error">Application rejected — {score}/100 compliance score</p>
        <p className="text-[12px] text-secondary mt-0.5">Critical checks failed. Please review the details below.</p>
      </div>
    </div>
  )
  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
      <TbAlertTriangle className="text-warning shrink-0" style={{ fontSize: 20 }} />
      <div>
        <p className="text-[14px] font-semibold text-warning">Review needed — {score}/100 compliance score</p>
        <p className="text-[12px] text-secondary mt-0.5">Some checks require manual review before proceeding.</p>
      </div>
    </div>
  )
}

/* ─── Card color by outcome ──────────────────────────────────────── */
const cardTheme = (isSuccess, overallStatus) => {
  if (!isSuccess) return { card: 'bg-indigo-50 border-indigo-100', bar: 'bg-indigo-100', fill: 'bg-indigo-600', text: 'text-indigo-500', textBold: 'text-indigo-700', divider: 'border-indigo-100' }
  if (overallStatus === 'APPROVED')     return { card: 'bg-green-50 border-green-100',   bar: 'bg-green-100',  fill: 'bg-success',    text: 'text-success',    textBold: 'text-success',    divider: 'border-green-100' }
  if (overallStatus === 'REJECTED')     return { card: 'bg-red-50 border-red-100',       bar: 'bg-red-100',    fill: 'bg-error',      text: 'text-error',      textBold: 'text-error',      divider: 'border-red-100' }
  return { card: 'bg-amber-50 border-amber-200', bar: 'bg-amber-100', fill: 'bg-warning', text: 'text-warning', textBold: 'text-warning', divider: 'border-amber-100' }
}

/* ─── Page ──────────────────────────────────────────────────────── */
const AiReviewPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const { isLoading, isError, isSuccess, result, progress, error } = useKycReview()

  const checks       = isSuccess ? (result?.checks ?? []) : LOADING_CHECKS
  const overallStatus = result?.overallStatus ?? null
  const score         = result?.score         ?? null
  const summary       = result?.summary       ?? null
  const theme         = cardTheme(isSuccess, overallStatus)

  const canContinue = isSuccess && overallStatus !== 'REJECTED' && (score ?? 0) >= 80

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="AI review"
        sessionInfo={isSuccess ? `Review complete · ${score}/100` : 'Session secure · review in progress'}
        sessionDotColor={isSuccess ? 'text-success' : 'text-indigo-500'}
      />
      <StepStepper activeStep={4} />

      <div className="flex flex-1 overflow-hidden">

        <div className="hidden md:flex shrink-0">
          <SidebarProgress
            currentStep={4}
            stepBadge={isSuccess ? (overallStatus ?? 'DONE') : isError ? 'ERROR' : 'PROCESSING'}
            stepBadgeColor={
              isError ? 'text-error'
              : isSuccess && overallStatus === 'REJECTED' ? 'text-error'
              : isSuccess && overallStatus === 'REVIEW_NEEDED' ? 'text-warning'
              : isSuccess ? 'text-success'
              : 'text-indigo-500'
            }
          />
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          <div className="mb-5">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              {isSuccess ? 'AI review complete' : 'AI is reviewing your submission'}
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              {isSuccess
                ? 'Agent reviewed all data from Steps 1–3 and produced a compliance report.'
                : 'Agent is analysing your personal info, identity, and all uploaded documents.'}
            </p>
          </div>

          {/* Error state */}
          {isError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-4">
              <TbAlertTriangle className="text-error shrink-0" style={{ fontSize: 20 }} />
              <div>
                <p className="text-[14px] font-semibold text-error">Review failed</p>
                <p className="text-[12px] text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Overall status banner — shown once complete */}
          {isSuccess && <StatusBanner overallStatus={overallStatus} score={score} />}

          {/* Main AI card */}
          <div className={`border rounded-xl p-6 mb-4 transition-colors duration-500 ${theme.card}`}>

            {/* Robot / result icon + title */}
            <div className="flex flex-col items-center mb-5">
              <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm border ${theme.divider}`}>
                {isSuccess && overallStatus === 'APPROVED'     ? <TbCircleCheck className="text-success"   style={{ fontSize: 28 }} />
                : isSuccess && overallStatus === 'REJECTED'    ? <TbX           className="text-error"     style={{ fontSize: 28 }} />
                : isSuccess && overallStatus === 'REVIEW_NEEDED' ? <TbAlertTriangle className="text-warning" style={{ fontSize: 28 }} />
                : <TbRobot className={`${theme.text} ${isLoading ? 'animate-pulse' : ''}`} style={{ fontSize: 28 }} />}
              </div>
              <p className={`text-[15px] font-semibold ${theme.textBold}`}>
                {isSuccess ? overallStatus?.replace('_', ' ') : 'Agent is working…'}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className={`h-2 rounded-full overflow-hidden mb-1.5 ${theme.bar}`}>
                <div className={`h-full rounded-full transition-all duration-500 ${theme.fill}`} style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[12px] ${theme.text}`}>
                  {isSuccess ? 'All checks complete' : 'Running compliance checks…'}
                </span>
                <span className={`text-[12px] font-semibold ${theme.textBold}`}>{progress}%</span>
              </div>
            </div>

            {/* Checks list */}
            <div className={`bg-white rounded-xl divide-y divide-gray-100 mb-4 border ${theme.divider}`}>
              {checks.map((check) => {
                const badge = CHECK_BADGE[check.status] ?? CHECK_BADGE.pending
                return (
                  <div key={check.label} className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckIcon status={check.status} />
                      <div>
                        <p className="text-[14px] font-medium text-gray-800 leading-tight">{check.label}</p>
                        {check.note && <p className="text-[12px] text-secondary mt-0.5">{check.note}</p>}
                      </div>
                    </div>
                    <span className={`text-[12px] font-semibold uppercase tracking-wide shrink-0 ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-1.5 text-[13px]">
              {isSuccess ? (
                <span className={`font-semibold ${theme.text}`}>
                  {canContinue ? '✓ Review complete — you may continue' : '✗ Review flagged issues — check details above'}
                </span>
              ) : (
                <>
                  <TbClock className="text-indigo-500" style={{ fontSize: 14 }} />
                  <span className="text-indigo-500">
                    Est. <span className="font-bold text-indigo-700">~{Math.max(1, Math.round((100 - progress) / 8))} seconds</span> remaining
                  </span>
                </>
              )}
            </div>
          </div>

          {/* AI summary — shown when complete */}
          {isSuccess && summary && (
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4">
              <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-2">Advisor summary</p>
              <p className="text-[14px] text-gray-700 leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Email notification banner */}
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <TbMail className="text-secondary" style={{ fontSize: 16 }} />
            </div>
            <p className="text-[13px] text-gray-700">
              <span className="font-semibold">You can close this tab</span>
              {' '}— we'll email you when review is complete.
            </p>
          </div>

          {/* What the AI checks */}
          <div>
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-4">What the AI checks</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {WHAT_CHECKS.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Icon className="text-indigo-500" style={{ fontSize: 18 }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800 leading-tight">{title}</p>
                    <p className="text-[12px] text-secondary mt-0.5 leading-snug">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </main>

        <div className="hidden lg:flex shrink-0">
          <AiReviewLogPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-3"
        continuePath="/onboarding/step-5"
        continueLabel={
          !isSuccess                          ? 'AI review in progress — please wait'
          : overallStatus === 'REJECTED'      ? 'Application rejected — contact support'
          : (score ?? 0) < 80                ? `Score ${score}/100 — minimum 80 required`
          : 'Continue to risk assessment'
        }
        continueDisabled={!canContinue}
      />

      {/* Left drawer */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          <SidebarProgress
            currentStep={4}
            stepBadge={isSuccess ? (overallStatus ?? 'DONE') : 'PROCESSING'}
            stepBadgeColor={isSuccess && overallStatus === 'APPROVED' ? 'text-success' : isSuccess ? 'text-warning' : 'text-indigo-500'}
            onClose={() => setLeftOpen(false)}
          />
        </div>
      </div>

      {/* Right drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden flex justify-end transition-opacity duration-300 ${rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setRightOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: 280 }}>
          <AiReviewLogPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default AiReviewPage
