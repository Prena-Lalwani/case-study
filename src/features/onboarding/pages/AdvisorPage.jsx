import { useState } from 'react'
import {
  TbSparkles, TbTarget, TbClock, TbChartLine,
  TbCalendarEvent, TbMessage2, TbBolt, TbMapPin,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AdvisorMatchPanel from '../components/AdvisorMatchPanel'
import BottomBar from '../components/BottomBar'

/* ─── Why this match ──────────────────────────────────────────────── */
const WHY_ITEMS = [
  { icon: TbTarget,    text: <>Matches your <strong>Moderate Growth</strong> profile</> },
  { icon: TbClock,     text: <>Specializes in <strong>3–7 year</strong> horizons</> },
  { icon: TbChartLine, text: <>Top performer in <strong>equity portfolios</strong></> },
]

/* ─── Next steps ──────────────────────────────────────────────────── */
const NEXT_STEPS = [
  { n: 1, main: 'Sarah will contact you', rest: ' to introduce herself',    meta: 'Within 1 business day' },
  { n: 2, main: 'Initial consultation call', rest: ' to discuss your goals', meta: '30 min · free' },
  { n: 3, main: 'Portfolio strategy session', rest: ' to build your plan',   meta: 'Scheduled together' },
]

/* ─── Sidebar extra ───────────────────────────────────────────────── */
const AlmostThereExtra = () => (
  <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 flex items-center gap-2.5">
    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
      <TbBolt className="text-warning" style={{ fontSize: 15 }} />
    </div>
    <div>
      <p className="text-[13px] font-semibold text-amber-800">Almost there!</p>
      <p className="text-[11px] text-amber-600">One step to activation</p>
    </div>
  </div>
)

/* ─── Page ─────────────────────────────────────────────────────────── */
const AdvisorPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const sidebar = (onClose) => (
    <SidebarProgress
      currentStep={7}
      showNextLabel
      extraContent={<AlmostThereExtra />}
      onClose={onClose}
    />
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Your advisor"
        sessionInfo="Approved · advisor matched"
        sessionDotColor="text-success"
      />
      <StepStepper activeStep={7} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="hidden md:flex shrink-0">{sidebar(null)}</div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Your advisor has been matched
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              Based on your risk profile and goals, AI selected your ideal advisor.
            </p>
          </div>

          {/* AI match banner */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
            <div className="w-6 h-6 rounded-md bg-white border border-green-100 flex items-center justify-center shrink-0">
              <span className="text-[11px] text-green-600">✦</span>
            </div>
            <p className="text-[13px] font-medium text-green-800">
              Meridian-IDX matched you from <span className="font-bold">47 available advisors</span>
            </p>
          </div>

          {/* Advisor card */}
          <div className="rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: '#1D3557' }}>
            <div className="px-5 pt-5 pb-4">

              {/* Top row */}
              <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                <div
                  className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ width: 52, height: 52, backgroundColor: '#2A6060', fontSize: 16 }}
                >
                  SR
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[20px] font-bold text-white leading-tight">Sarah Reynolds</p>
                  <p className="text-[13px] text-blue-200 mt-0.5">Senior Wealth Advisor · 12 years experience</p>

                  {/* Specialty badge */}
                  <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 rounded-full px-2.5 py-1">
                    <TbMapPin className="text-blue-300 shrink-0" style={{ fontSize: 12 }} />
                    <span className="text-[12px] font-medium text-blue-100">Moderate Growth · Equity Focus</span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-amber-400 text-[14px] leading-none">★★★★★</span>
                    <span className="text-[13px] font-semibold text-white">4.9</span>
                    <span className="text-[12px] text-blue-300">· 124 clients</span>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 mb-4 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Matches</p>
                  <p className="text-[20px] font-bold text-white leading-tight">47</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Assets Managed</p>
                  <p className="text-[20px] font-bold text-white leading-tight">$2.4B</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Response Time</p>
                  <p className="text-[20px] font-bold text-white leading-tight">&lt; 2 hrs</p>
                </div>
              </div>

              {/* Profile link */}
              <button type="button" className="text-[13px] font-medium text-blue-300 underline underline-offset-2 hover:text-white transition-colors">
                View full profile →
              </button>
            </div>
          </div>

          {/* Why this match */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 mb-4">
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-4">
              Why this match
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {WHY_ITEMS.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <Icon className="text-success" style={{ fontSize: 18 }} />
                  </div>
                  <p className="text-[13px] text-gray-700 leading-snug mt-1">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-4">
              Next steps
            </p>
            <div className="flex flex-col gap-4 mb-5">
              {NEXT_STEPS.map(({ n, main, rest, meta }) => (
                <div key={n} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full bg-navy flex items-center justify-center text-white font-bold shrink-0"
                      style={{ fontSize: 11 }}
                    >
                      {n}
                    </div>
                    <p className="text-[14px] text-gray-800">
                      <span className="font-semibold">{main}</span>
                      <span className="text-blue-action">{rest}</span>
                    </p>
                  </div>
                  <span className="text-[12px] text-tertiary shrink-0">{meta}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="flex items-center gap-2 bg-navy text-white text-[14px] font-medium rounded-xl px-5 py-2.5 hover:bg-opacity-90 transition-colors"
              >
                <TbCalendarEvent style={{ fontSize: 16 }} />
                Schedule intro call
              </button>
              <button
                type="button"
                className="flex items-center gap-2 border border-gray-200 text-gray-700 text-[14px] font-medium rounded-xl px-5 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <TbMessage2 style={{ fontSize: 16 }} />
                Send Sarah a message
              </button>
            </div>
          </div>

        </main>

        {/* Right panel */}
        <div className="hidden lg:flex shrink-0">
          <AdvisorMatchPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-6"
        continuePath="/onboarding/step-8"
        continueLabel="Confirm advisor & activate"
        centerMessage="Advisor confirmed"
        centerDotColor="text-success"
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
          <AdvisorMatchPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default AdvisorPage
