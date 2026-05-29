import AuthCard from '../components/AuthCard'
import SignInForm from '../components/SignInForm'

/**
 * Full-viewport sign-in page — centers AuthCard on the page background.
 */
const SignInPage = () => {
  return (
    <div className="fixed inset-0 bg-page flex items-center justify-center px-4 overflow-auto">
      <AuthCard>
        <SignInForm />
      </AuthCard>
    </div>
  )
}

export default SignInPage
