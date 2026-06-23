import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import UnderwritingPage         from '../features/underwriting/pages/UnderwritingPage'
import ApplicationReviewPage   from '../features/underwriting/pages/ApplicationReviewPage'
import ClientsPage             from '../features/underwriting/pages/ClientsPage'
import AdvisoryQueuePage       from '../features/underwriting/pages/AdvisoryQueuePage'
import AdvisoryReviewPage      from '../features/underwriting/pages/AdvisoryReviewPage'
import AdvisorsPage            from '../features/underwriting/pages/AdvisorsPage'
import AdvisorDetailPage       from '../features/underwriting/pages/AdvisorDetailPage'
import ClientDetailPage        from '../features/underwriting/pages/ClientDetailPage'
import ReportsPage             from '../features/underwriting/pages/ReportsPage'
import ProcessingBootstrap     from '../features/underwriting/components/ProcessingBootstrap'
import RequireAuth             from '../features/auth/RequireAuth'
import SignInPage from '../features/auth/pages/SignInPage'
import SignUpPage from '../features/auth/pages/SignUpPage'
import PersonalInfoPage from '../features/onboarding/pages/PersonalInfoPage'
import VerifyIdentityPage from '../features/onboarding/pages/VerifyIdentityPage'
import LegalDocumentsPage from '../features/onboarding/pages/LegalDocumentsPage'
import AiReviewPage from '../features/onboarding/pages/AiReviewPage'
import RiskAssessmentPage from '../features/onboarding/pages/RiskAssessmentPage'
import ComplianceReviewPage from '../features/onboarding/pages/ComplianceReviewPage'
import AdvisorPage from '../features/onboarding/pages/AdvisorPage'
import ActivatedPage from '../features/onboarding/pages/ActivatedPage'
import { OnboardingProvider } from '../features/onboarding/context/OnboardingContext'

/** Minimal placeholder page — full pages built later */
const Placeholder = ({ name }) => (
  <div className="min-h-screen bg-page flex items-center justify-center">
    <h2 className="text-xl font-medium text-navy">{name}</h2>
  </div>
)

/**
 * Layout route — wraps all /onboarding/* routes in OnboardingProvider.
 * <Outlet /> renders whichever child route matches.
 * This means all 8 step pages share the same OnboardingContext instance,
 * so data entered in step 1 is still available in step 5.
 */
const OnboardingLayout = () => (
  <OnboardingProvider>
    <Outlet />
  </OnboardingProvider>
)

const AppRouter = () => {
  return (
    <BrowserRouter>
      <ProcessingBootstrap />
      <Routes>
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/verify-otp" element={<Placeholder name="Verify OTP" />} />
        <Route path="/forgot-password" element={<Placeholder name="Forgot Password" />} />

        {/* All onboarding steps share one OnboardingProvider instance */}
        <Route element={<OnboardingLayout />}>
          <Route path="/onboarding/step-1" element={<PersonalInfoPage />} />
          <Route path="/onboarding/step-2" element={<VerifyIdentityPage />} />
          <Route path="/onboarding/step-3" element={<LegalDocumentsPage />} />
          <Route path="/onboarding/step-4" element={<AiReviewPage />} />
          <Route path="/onboarding/step-5" element={<RiskAssessmentPage />} />
          <Route path="/onboarding/step-6" element={<ComplianceReviewPage />} />
          <Route path="/onboarding/step-7" element={<AdvisorPage />} />
          <Route path="/onboarding/step-8" element={<ActivatedPage />} />
        </Route>

        <Route path="/underwriting" element={<RequireAuth><UnderwritingPage /></RequireAuth>} />
        <Route path="/underwriting/review/:appId" element={<RequireAuth><ApplicationReviewPage /></RequireAuth>} />
        <Route path="/underwriting/team" element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="/underwriting/advisory" element={<RequireAuth><AdvisoryQueuePage /></RequireAuth>} />
        <Route path="/underwriting/advisory/review/:itemId" element={<RequireAuth><AdvisoryReviewPage /></RequireAuth>} />
        <Route path="/underwriting/advisors" element={<RequireAuth><AdvisorsPage /></RequireAuth>} />
        <Route path="/underwriting/advisors/:id" element={<RequireAuth><AdvisorDetailPage /></RequireAuth>} />
        <Route path="/underwriting/team/:id" element={<RequireAuth><ClientDetailPage /></RequireAuth>} />
        <Route path="/underwriting/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
