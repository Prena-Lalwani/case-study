import { FcGoogle } from 'react-icons/fc'
import { TbFingerprint } from 'react-icons/tb'

/**
 * Row of social / biometric sign-in buttons.
 */
const SocialLoginButtons = () => {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className="flex-1 flex items-center justify-center gap-1.5 bg-white border rounded-lg px-2 py-2 text-[11px] text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-150"
        style={{ borderColor: '#e0e0e0', borderWidth: '0.5px' }}
      >
        <FcGoogle style={{ fontSize: 14, flexShrink: 0 }} />
        <span>Continue with Google</span>
      </button>

      <button
        type="button"
        className="flex-1 flex items-center justify-center gap-1.5 bg-white border rounded-lg px-2 py-2 text-[11px] text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-150"
        style={{ borderColor: '#e0e0e0', borderWidth: '0.5px' }}
      >
        <TbFingerprint className="text-blue-action" style={{ fontSize: 15, flexShrink: 0 }} />
        <span>Sign in with biometric</span>
      </button>
    </div>
  )
}

export default SocialLoginButtons
