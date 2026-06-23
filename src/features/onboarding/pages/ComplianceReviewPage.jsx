import { useState, useMemo } from 'react'
import {
  TbHourglass, TbCircleCheck, TbLoader, TbCircle,
  TbMail, TbPhone, TbChartBar, TbTrendingUp, TbUsers,
  TbCircleFilled,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import ReviewTimelinePanel from '../components/ReviewTimelinePanel'
import BottomBar from '../components/BottomBar'
import { useOnboarding } from '../hooks/useOnboarding'

/* ─── Date helpers ────────────────────────────────────────────────── */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmtFull = (d) => {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${h % 12 || 12}:${m} ${ampm}`
}

const fmtEst = (d) => {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2,'0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ~${h % 12 || 12}:${m} ${ampm}`
}

/* ─── What's being reviewed ────────────────────────────────────────── */
const REVIEW_ITEMS = [
  { label: 'AML screening',           status: 'cleared' },
  { label: 'PEP check',               status: 'cleared' },
  { label: 'Sanctions screening',     status: 'cleared' },
  { label: 'Source of funds',         status: 'cleared' },
  { label: 'Risk profile validation', status: 'in_progress' },
  { label: 'Regulatory filing',       status: 'pending' },
  { label: 'Final compliance sign-off', status: 'pending' },
]

/* ─── While you wait links ─────────────────────────────────────────── */
const WAIT_LINKS = [
  { icon: TbChartBar,    label: 'Portfolio tools',   sub: 'Explore investment options' },
  { icon: TbTrendingUp,  label: 'Market insights',   sub: 'See current trends' },
  { icon: TbUsers,       label: 'Advisor preview',   sub: 'Meet your potential advisors' },
]

/* ─── Sub-components ───────────────────────────────────────────────── */
const ReviewItemRow = ({ item }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-2.5">
      {item.status === 'cleared' ? (
        <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 18 }} />
      ) : item.status === 'in_progress' ? (
        <TbLoader className="text-warning shrink-0 animate-spin" style={{ fontSize: 18 }} />
      ) : (
        <TbCircle className="text-gray-300 shrink-0" style={{ fontSize: 18 }} />
      )}
      <span className={`text-[14px] ${item.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
        {item.label}
      </span>
    </div>
    <span className={`text-[11px] font-semibold uppercase tracking-wide shrink-0 ${
      item.status === 'cleared'     ? 'text-success'
      : item.status === 'in_progress' ? 'text-warning'
      : 'text-gray-300'
    }`}>
      {item.status === 'cleared' ? 'CLEARED' : item.status === 'in_progress' ? 'IN PROGRESS' : 'PENDING'}
    </span>
  </div>
)

/* ─── Page ─────────────────────────────────────────────────────────── */
const ComplianceReviewPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const { state } = useOnboarding()
  const { email, phone } = state.personalInfo

  // Compute once on mount so timestamps don't drift on re-renders
  const submittedAt  = useMemo(() => new Date(), [])
  const estCompletion = useMemo(() => new Date(submittedAt.getTime() + 18 * 60 * 60 * 1000), [submittedAt])

  const sidebar = (onClose) => (
    <SidebarProgress
      currentStep={6}
      stepBadge="REVIEWING"
      stepBadgeColor="text-warning"
      onClose={onClose}
    />
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Compliance review"
        sessionInfo="Submitted · under review"
        sessionDotColor="text-warning"
      />
      <StepStepper activeStep={6} lockedFrom={7} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="hidden md:flex shrink-0">{sidebar(null)}</div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Compliance review
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              Your application is under review. We'll notify you once complete.
            </p>
          </div>

          {/* Submitted card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-white border border-amber-200 flex items-center justify-center shrink-0">
                <TbHourglass className="text-warning" style={{ fontSize: 22 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[16px] font-semibold text-amber-800">Submitted for review</p>
                  <div className="flex items-center gap-1 bg-amber-100 rounded-full px-2 py-0.5">
                    <TbCircleFilled className="text-warning" style={{ fontSize: 7 }} />
                    <span className="text-[10px] font-semibold text-warning uppercase tracking-wide">Under review</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-amber-600 mb-4">
                  <span>Submitted: <span className="font-semibold text-amber-800">{fmtFull(submittedAt)}</span></span>
                  <span>Est. completion: <span className="font-semibold text-amber-800">{fmtEst(estCompletion)}</span></span>
                </div>
                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-amber-600">Review progress</span>
                    <span className="text-[12px] font-semibold text-amber-800">20%</span>
                  </div>
                  <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div className="h-full bg-warning rounded-full transition-all duration-700" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What's being reviewed */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-4">
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-3">
              What's being reviewed
            </p>
            <div className="flex flex-col">
              {REVIEW_ITEMS.map((item) => (
                <ReviewItemRow key={item.label} item={item} />
              ))}
            </div>
          </div>

          {/* Bottom two-column section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Notifications */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-3">
                You'll be notified via
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <TbMail className="text-secondary" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">Email</p>
                      <p className="text-[11px] text-secondary">{email || '—'}</p>
                    </div>
                  </div>
                  <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 18 }} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <TbPhone className="text-secondary" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">SMS</p>
                      <p className="text-[11px] text-secondary">{phone || '—'}</p>
                    </div>
                  </div>
                  <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 18 }} />
                </div>
              </div>
            </div>

            {/* While you wait */}
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-3">
                While you wait
              </p>
              <div className="flex flex-col gap-2">
                {WAIT_LINKS.map(({ icon: Icon, label, sub }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex items-center gap-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="text-blue-action" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-800">{label}</p>
                      <p className="text-[11px] text-secondary">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </main>

        {/* Right panel */}
        <div className="hidden lg:flex shrink-0">
          <ReviewTimelinePanel submittedAt={submittedAt} />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-5"
        statusMessage="Review in progress — we'll email you"
      />

      {/* Left drawer */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          {sidebar(() => setLeftOpen(false))}
        </div>
      </div>

      {/* Right drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden flex justify-end transition-opacity duration-300 ${rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setRightOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: 280 }}>
          <ReviewTimelinePanel submittedAt={submittedAt} onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default ComplianceReviewPage
