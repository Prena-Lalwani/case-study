import { TbShield, TbUsers, TbAccessible } from 'react-icons/tb'
import SignUpForm from '../components/SignUpForm'

/**
 * Full-viewport sign-up page with centered card — no navy header stripe (logo mark above title).
 */
const SignUpPage = () => {
  return (
    <div className="fixed inset-0 bg-page flex items-center justify-center px-4 overflow-auto py-6">
      <div
        className="w-[380px] bg-white rounded-2xl shadow-sm border"
        style={{ borderColor: '#e0e0e0', borderWidth: '0.5px' }}
      >
        {/* ── Card header: logo + title ── */}
        <div className="flex flex-col items-center pt-6 pb-4 px-6">
          <div
            className="bg-navy rounded-xl flex items-center justify-center text-white font-bold mb-3"
            style={{ width: 44, height: 44, fontSize: 13 }}
          >
            MW
          </div>
          <h1 className="text-[20px] font-semibold text-gray-900 m-0 leading-tight">
            Create your account
          </h1>
          <p className="text-[11px] text-secondary text-center mt-1.5 leading-relaxed">
            Start your onboarding journey. Takes about 15 minutes.
          </p>
        </div>

        {/* ── Form body ── */}
        <div className="px-6 pb-5">
          <SignUpForm />
        </div>

        {/* ── Security footer ── */}
        <div
          className="flex items-center justify-center gap-4 px-6 py-3 border-t"
          style={{ borderColor: '#f0f0f0' }}
        >
          <span className="flex items-center gap-1 text-[9px] text-tertiary">
            <TbShield style={{ fontSize: 11 }} />
            AES-256
          </span>
          <span className="text-tertiary text-[9px]">·</span>
          <span className="flex items-center gap-1 text-[9px] text-tertiary">
            <TbUsers style={{ fontSize: 11 }} />
            SOC 2
          </span>
          <span className="text-tertiary text-[9px]">·</span>
          <span className="flex items-center gap-1 text-[9px] text-tertiary">
            <TbAccessible style={{ fontSize: 11 }} />
            WCAG 2.1
          </span>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
