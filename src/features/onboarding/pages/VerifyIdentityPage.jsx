import {
  TbFingerprint, TbCamera, TbCircleCheck, TbFileCheck,
  TbShieldCheck, TbLock, TbSparkles,
} from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import VerificationStatusPanel from '../components/VerificationStatusPanel'
import BottomBar from '../components/BottomBar'

/* ─── What we verify items ─────────────────────────────────────────── */
const VERIFY_ITEMS = [
  { icon: TbCircleCheck, title: 'Identity confirmed',  sub: 'Face match to your ID' },
  { icon: TbFileCheck,   title: 'ID authenticity',     sub: 'Document is genuine' },
  { icon: TbShieldCheck, title: 'Liveness check',      sub: 'Real person, present now' },
]

/* ─── Page ─────────────────────────────────────────────────────────── */
const VerifyIdentityPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const { state, setIdentityMethod } = useOnboarding()
  const selected = state.identity.method

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Verify identity"
      />
      <StepStepper activeStep={2} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="hidden md:flex shrink-0">
          <SidebarProgress currentStep={2} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          {/* Page header */}
          <div className="mb-5">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Verify your identity
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              We need to confirm who you are. This is required for KYC compliance.
            </p>
          </div>

          {/* Method cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

            {/* Biometric card */}
            <div
              onClick={() => setIdentityMethod('biometric')}
              className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all ${
                selected === 'biometric'
                  ? 'border-navy bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Most secure badge */}
              <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white border border-navy rounded-full px-2.5 py-0.5">
                <TbShieldCheck className="text-navy" style={{ fontSize: 11 }} />
                <span className="text-[10px] font-semibold text-navy uppercase tracking-wide">Most secure</span>
              </div>

              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3 mt-1">
                <TbFingerprint className="text-blue-action" style={{ fontSize: 26 }} />
              </div>

              <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Biometric scan</h3>
              <p className="text-[13px] text-secondary leading-snug mb-4">
                FaceID or fingerprint — instant verification with no documents to upload.
              </p>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-navy text-white text-[14px] font-medium rounded-lg py-2.5 hover:bg-opacity-90 transition-colors"
              >
                <TbSparkles style={{ fontSize: 15 }} />
                Use biometric
              </button>
            </div>

            {/* Government ID card */}
            <div
              onClick={() => setIdentityMethod('gov-id')}
              className={`relative rounded-xl border-2 p-5 cursor-pointer transition-all flex flex-col ${
                selected === 'gov-id'
                  ? 'border-navy bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                <TbCamera className="text-secondary" style={{ fontSize: 26 }} />
              </div>

              <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Government ID scan</h3>
              <p className="text-[13px] text-secondary leading-snug mb-4 flex-1">
                Take a photo of your ID front + back. Verification in about 45 seconds.
              </p>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 text-[14px] font-medium rounded-lg py-2.5 hover:bg-gray-50 transition-colors"
              >
                <TbCamera style={{ fontSize: 15 }} />
                Scan ID
              </button>
            </div>
          </div>

          {/* What we verify */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
            <p className="text-[11px] font-semibold text-tertiary uppercase tracking-widest mb-4">
              What we verify
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {VERIFY_ITEMS.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="text-blue-action" style={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-800 leading-tight">{title}</p>
                    <p className="text-[12px] text-secondary mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy banner */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-blue-100 flex items-center justify-center shrink-0">
              <TbLock className="text-blue-action" style={{ fontSize: 15 }} />
            </div>
            <p className="text-[13px] text-gray-700 leading-snug">
              <span className="font-semibold">Your biometric data is processed locally</span>
              {' '}and never stored on our servers.
            </p>
          </div>

        </main>

        {/* Right panel */}
        <div className="hidden lg:flex shrink-0">
          <VerificationStatusPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-1"
        continuePath="/onboarding/step-3"
        continueLabel="Start verification"
      />

      {/* Left drawer — mobile */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          <SidebarProgress currentStep={2} onClose={() => setLeftOpen(false)} />
        </div>
      </div>

      {/* Right drawer — mobile + tablet */}
      <div className={`fixed inset-0 z-50 lg:hidden flex justify-end transition-opacity duration-300 ${rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setRightOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: 280 }}>
          <VerificationStatusPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default VerifyIdentityPage
