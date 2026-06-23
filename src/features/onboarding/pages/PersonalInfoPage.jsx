import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AiActivityPanel from '../components/AiActivityPanel'
import UploadBanner from '../components/UploadBanner'
import PersonalDetailsForm from '../components/PersonalDetailsForm'
import BottomBar from '../components/BottomBar'
import { useOnboarding } from '../hooks/useOnboarding'
import { onboardingService } from '../services/onboardingService'

/**
 * Breakpoints:
 *  mobile  < md  (768px)  : both sidebars collapse → hamburger toggles left, ✦ toggles right
 *  tablet  md–lg (768–1024px) : left sidebar visible, right panel collapsed → ✦ in navbar toggles right
 *  desktop lg+  (1024px+) : both sidebars always visible
 */
const PersonalInfoPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [isSaving,  setIsSaving]  = useState(false)

  const navigate = useNavigate()
  const { state, loadFromDb } = useOnboarding()

  // Restore previously saved personal info from DB (handles page refresh + back-navigation)
  useEffect(() => {
    onboardingService.get()
      .then(data => { if (data) loadFromDb(data) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleContinue = async () => {
    setIsSaving(true)
    try {
      const { fullName, dob, address, phone, ssn } = state.personalInfo
      await onboardingService.patch({ legalName: fullName, dob, address, phone, ssn, currentStep: 2 })
    } catch {
      // non-blocking — still navigate if backend is unreachable
    } finally {
      setIsSaving(false)
      navigate('/onboarding/step-2')
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      {/* ── Top bars ── */}
      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Personal information"
      />
      <StepStepper activeStep={1} />

      {/* ── Main 3-col area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — hidden on mobile, visible md+ */}
        <div className="hidden md:flex shrink-0">
          <SidebarProgress currentStep={1} />
        </div>

        {/* Centre scrollable content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">
          <div className="mb-4">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Personal information
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              Tell us about yourself. Upload your ID to let AI pre-fill this form.
            </p>
          </div>
          <UploadBanner />
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 md:p-6">
            <PersonalDetailsForm />
          </div>
        </main>

        {/* Right AI panel — visible lg+ only */}
        <div className="hidden lg:flex shrink-0">
          <AiActivityPanel />
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <BottomBar
        backPath="/signup"
        onContinue={handleContinue}
        continueDisabled={isSaving}
        continueLabel={isSaving ? 'Saving…' : 'Save & Continue'}
      />

      {/* ══════════════════════════════════
          Drawers (rendered outside the flex row so they overlay everything)
          ══════════════════════════════════ */}

      {/* Left sidebar drawer — mobile only (<md) */}
      <div
        className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${
          leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setLeftOpen(false)}
        />
        <div
          className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${
            leftOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{ width: 240 }}
        >
          <SidebarProgress currentStep={1} onClose={() => setLeftOpen(false)} />
        </div>
      </div>

      {/* Right AI panel drawer — mobile + tablet (<lg) */}
      <div
        className={`fixed inset-0 z-50 lg:hidden flex justify-end transition-opacity duration-300 ${
          rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setRightOpen(false)}
        />
        <div
          className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${
            rightOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: 260 }}
        >
          <AiActivityPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default PersonalInfoPage
