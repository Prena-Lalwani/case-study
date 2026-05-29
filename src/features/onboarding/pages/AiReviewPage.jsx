import { useState } from 'react'
import {
  TbRobot, TbCircleCheck, TbLoader, TbCircle,
  TbClock, TbMail, TbShieldCheck, TbScan, TbId, TbAlertTriangle,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AiReviewLogPanel from '../components/AiReviewLogPanel'
import BottomBar from '../components/BottomBar'
import { useDocumentAnalysis } from '../hooks/useDocumentAnalysis'

/* ─── Steps shown while loading (before API responds) ───────────── */
const LOADING_STEPS = [
  { title: 'Document authenticity check', sub: 'Scanning documents…',    status: 'in_progress' },
  { title: 'Data extraction',             sub: 'Waiting…',               status: 'pending'     },
  { title: 'Fraud detection scan',        sub: 'Waiting…',               status: 'pending'     },
  { title: 'Final confidence scoring',    sub: 'Waiting…',               status: 'pending'     },
]

/* ─── What the AI checks (static info section) ───────────────────── */
const WHAT_CHECKS = [
  { icon: TbShieldCheck, title: 'Fraud patterns',        sub: 'Cross-referenced against 2M+ known fraud cases'  },
  { icon: TbScan,        title: 'Document tampering',    sub: 'Pixel-level authenticity and edit detection'     },
  { icon: TbId,          title: 'Identity verification', sub: 'Matched against government identity databases'   },
]

/* ─── Step row icon ──────────────────────────────────────────────── */
const StepIcon = ({ status }) => {
  if (status === 'complete')    return <TbCircleCheck className="text-success shrink-0"                        style={{ fontSize: 22 }} />
  if (status === 'in_progress') return <TbLoader      className="text-indigo-500 shrink-0 animate-spin"        style={{ fontSize: 22 }} />
  return                               <TbCircle      className="text-gray-300 shrink-0"                       style={{ fontSize: 22 }} />
}

/* ─── Page ──────────────────────────────────────────────────────── */
const AiReviewPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  /*
   * useDocumentAnalysis wraps useQuery (TanStack Query).
   * On mount it fires POST /api/onboarding/analyze-documents.
   * While waiting:  isLoading=true, progress creeps 0→82%
   * On success:     isSuccess=true, progress jumps to 100%, steps = real data
   * On failure:     isError=true, error message shown
   */
  const { isLoading, isError, isSuccess, progress, steps, confidence, error } = useDocumentAnalysis()

  const displaySteps = steps ?? LOADING_STEPS

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="AI review"
        sessionInfo={isSuccess ? 'Review complete' : 'Session secure · review in progress'}
        sessionDotColor={isSuccess ? 'text-success' : 'text-indigo-500'}
      />
      <StepStepper activeStep={4} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="hidden md:flex shrink-0">
          <SidebarProgress
            currentStep={4}
            stepBadge={isSuccess ? 'DONE' : 'PROCESSING'}
            stepBadgeColor={isSuccess ? 'text-success' : 'text-indigo-500'}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              {isSuccess ? 'AI review complete' : 'AI is reviewing your documents'}
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              {isSuccess
                ? `All checks passed · ${confidence}% confidence score`
                : 'Our AI is verifying authenticity, extracting data, and running fraud detection.'}
            </p>
          </div>

          {/* Error state */}
          {isError && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-4">
              <TbAlertTriangle className="text-error shrink-0" style={{ fontSize: 20 }} />
              <div>
                <p className="text-[14px] font-semibold text-error">Analysis failed</p>
                <p className="text-[12px] text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Main AI card */}
          <div className={`border rounded-xl p-6 mb-4 transition-colors duration-500 ${
            isSuccess ? 'bg-green-50 border-green-100' : 'bg-indigo-50 border-indigo-100'
          }`}>

            {/* Robot + title */}
            <div className="flex flex-col items-center mb-5">
              <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-sm border ${
                isSuccess ? 'border-green-200' : 'border-indigo-200'
              }`}>
                {isSuccess
                  ? <TbCircleCheck className="text-success" style={{ fontSize: 28 }} />
                  : <TbRobot className={isLoading ? 'text-indigo-500 animate-pulse' : 'text-indigo-500'} style={{ fontSize: 28 }} />
                }
              </div>
              <p className={`text-[15px] font-semibold ${isSuccess ? 'text-success' : 'text-indigo-700'}`}>
                {isSuccess ? 'Meridian-IDX v3.2 — review complete' : 'Meridian-IDX v3.2 is working…'}
              </p>
            </div>

            {/* Progress bar — driven by the hook */}
            <div className="mb-5">
              <div className={`h-2 rounded-full overflow-hidden mb-1.5 ${isSuccess ? 'bg-green-100' : 'bg-indigo-100'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isSuccess ? 'bg-success' : 'bg-indigo-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[12px] ${isSuccess ? 'text-success' : 'text-indigo-500'}`}>
                  {isSuccess ? 'All 3 documents analysed' : 'Analysing 3 documents'}
                </span>
                <span className={`text-[12px] font-semibold ${isSuccess ? 'text-success' : 'text-indigo-700'}`}>
                  {progress}%
                </span>
              </div>
            </div>

            {/* Steps — LOADING_STEPS while waiting, real data on complete */}
            <div className={`bg-white rounded-xl divide-y divide-gray-100 mb-4 border ${
              isSuccess ? 'border-green-100' : 'border-indigo-100'
            }`}>
              {displaySteps.map((step) => (
                <div key={step.title} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <StepIcon status={step.status} />
                    <div>
                      <p className="text-[14px] font-medium text-gray-800 leading-tight">{step.title}</p>
                      <p className="text-[12px] text-secondary mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                  <span className={`text-[12px] font-semibold uppercase tracking-wide shrink-0 ${
                    step.status === 'complete'    ? 'text-success'
                    : step.status === 'in_progress' ? 'text-indigo-500'
                    : 'text-tertiary'
                  }`}>
                    {step.status === 'complete' ? 'COMPLETE' : step.status === 'in_progress' ? 'IN PROGRESS' : 'PENDING'}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer — loading vs complete */}
            <div className="flex items-center justify-center gap-1.5 text-[13px]">
              {isSuccess ? (
                <span className="text-success font-semibold">✓ Analysis complete — you may continue</span>
              ) : (
                <>
                  <TbClock className="text-indigo-500" style={{ fontSize: 14 }} />
                  <span className="text-indigo-500">
                    Est. <span className="font-bold text-indigo-700">~{Math.max(1, Math.round((100 - progress) / 10))} seconds</span> remaining
                  </span>
                </>
              )}
            </div>
          </div>

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
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-4">
              What the AI checks
            </p>
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

        {/* Right panel */}
        <div className="hidden lg:flex shrink-0">
          <AiReviewLogPanel />
        </div>
      </div>

      {/* Bottom bar — disabled while loading, enabled when complete */}
      <BottomBar
        backPath="/onboarding/step-3"
        continuePath="/onboarding/step-5"
        continueLabel={isSuccess ? 'Continue to risk assessment' : 'AI review in progress — please wait'}
        continueDisabled={!isSuccess}
      />

      {/* Left drawer */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          <SidebarProgress
            currentStep={4}
            stepBadge={isSuccess ? 'DONE' : 'PROCESSING'}
            stepBadgeColor={isSuccess ? 'text-success' : 'text-indigo-500'}
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
