import { useState, useRef } from 'react'
import {
  TbFingerprint, TbCamera, TbCircleCheck, TbFileCheck,
  TbShieldCheck, TbLock, TbSparkles, TbLoader, TbCheck,
} from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'
import { onboardingService } from '../services/onboardingService'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import VerificationStatusPanel from '../components/VerificationStatusPanel'
import BottomBar from '../components/BottomBar'

/* ─── Static info ──────────────────────────────────────────────────── */
const VERIFY_ITEMS = [
  { icon: TbCircleCheck, title: 'Identity confirmed',  sub: 'Face match to your ID' },
  { icon: TbFileCheck,   title: 'ID authenticity',     sub: 'Document is genuine' },
  { icon: TbShieldCheck, title: 'Liveness check',      sub: 'Real person, present now' },
]

/* ─── Biometric simulation steps ──────────────────────────────────── */
const BIOMETRIC_STAGES = [
  [
    { label: 'Capturing biometric',  status: 'in_progress' },
    { label: 'Liveness check',       status: 'pending'     },
    { label: 'Identity match',       status: 'pending'     },
  ],
  [
    { label: 'Capturing biometric',  status: 'complete'    },
    { label: 'Liveness check',       status: 'in_progress' },
    { label: 'Identity match',       status: 'pending'     },
  ],
  [
    { label: 'Capturing biometric',  status: 'complete'    },
    { label: 'Liveness check',       status: 'complete'    },
    { label: 'Identity match',       status: 'in_progress' },
  ],
  [
    { label: 'Capturing biometric',  status: 'complete'    },
    { label: 'Liveness check',       status: 'complete'    },
    { label: 'Identity match',       status: 'complete'    },
  ],
]

/* ─── Page ─────────────────────────────────────────────────────────── */
const VerifyIdentityPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const { state, setIdentityMethod, setVerificationStatus, setVerificationSteps } = useOnboarding()
  const selected = state.identity.method
  const verStatus = state.identity.verificationStatus

  const govIdInputRef = useRef(null)

  /* ── Biometric — simulated step-by-step scan ── */
  const handleBiometricScan = () => {
    if (verStatus === 'scanning' || verStatus === 'verified') return
    setVerificationStatus('scanning')
    setVerificationSteps(BIOMETRIC_STAGES[0])
    setTimeout(() => setVerificationSteps(BIOMETRIC_STAGES[1]), 1500)
    setTimeout(() => setVerificationSteps(BIOMETRIC_STAGES[2]), 3000)
    setTimeout(() => {
      setVerificationSteps(BIOMETRIC_STAGES[3])
      setVerificationStatus('verified')
      onboardingService.patch({ currentStep: 3 }).catch(() => {})
    }, 4500)
  }

  /* ── Government ID — upload only, verification at Step 4 ── */
  const handleGovIdFile = (file) => {
    if (!file) return
    setVerificationStatus('scanning')
    setVerificationSteps([
      { label: 'Receiving document',       status: 'in_progress' },
      { label: 'AI verification (Step 4)', status: 'pending'     },
    ])
    setTimeout(() => {
      setVerificationSteps([
        { label: 'Document received',        status: 'complete' },
        { label: 'AI verification (Step 4)', status: 'pending'  },
      ])
      setVerificationStatus('received')
      onboardingService.patch({ currentStep: 3 }).catch(() => {})
    }, 1500)
  }

  const isVerified = verStatus === 'verified' || verStatus === 'received'
  const isScanning = verStatus === 'scanning'

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Verify identity"
        sessionInfo={isVerified ? 'Identity verified' : 'Session secure · verification pending'}
        sessionDotColor={isVerified ? 'text-success' : 'text-indigo-500'}
      />
      <StepStepper activeStep={2} />

      <div className="flex flex-1 overflow-hidden">

        <div className="hidden md:flex shrink-0">
          <SidebarProgress
            currentStep={2}
            stepBadge={verStatus === 'verified' ? 'VERIFIED' : verStatus === 'received' ? 'RECEIVED' : isScanning ? 'SCANNING' : 'PENDING'}
            stepBadgeColor={isVerified ? 'text-success' : isScanning ? 'text-indigo-500' : 'text-warning'}
          />
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          <div className="mb-5">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Verify your identity
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              We need to confirm who you are. This is required for KYC compliance.
            </p>
          </div>

          {/* Success banner */}
          {verStatus === 'verified' && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-5">
              <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 20 }} />
              <p className="text-[14px] font-semibold text-success">
                Identity verified successfully — you can continue
              </p>
            </div>
          )}
          {verStatus === 'received' && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
              <TbCircleCheck className="text-blue-action shrink-0" style={{ fontSize: 20 }} />
              <p className="text-[14px] font-semibold text-blue-action">
                Document received — AI verification will run at Step 4
              </p>
            </div>
          )}


          {/* Method cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

            {/* Biometric card */}
            <div
              onClick={() => !isScanning && setIdentityMethod('biometric')}
              className={`relative rounded-xl border-2 p-5 transition-all ${
                isScanning || isVerified ? 'cursor-default' : 'cursor-pointer'
              } ${
                selected === 'biometric'
                  ? isVerified ? 'border-success bg-green-50/30' : 'border-navy bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="absolute -top-3 left-4 flex items-center gap-1 bg-white border border-navy rounded-full px-2.5 py-0.5">
                <TbShieldCheck className="text-navy" style={{ fontSize: 11 }} />
                <span className="text-[10px] font-semibold text-navy uppercase tracking-wide">Most secure</span>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-3 mt-1">
                {selected === 'biometric' && isScanning
                  ? <TbLoader className="text-blue-action animate-spin" style={{ fontSize: 26 }} />
                  : selected === 'biometric' && isVerified
                  ? <TbCheck className="text-success" style={{ fontSize: 26 }} />
                  : <TbFingerprint className="text-blue-action" style={{ fontSize: 26 }} />
                }
              </div>

              <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Biometric scan</h3>
              <p className="text-[13px] text-secondary leading-snug mb-4">
                FaceID or fingerprint — instant verification with no documents to upload.
              </p>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (selected === 'biometric') handleBiometricScan() }}
                disabled={selected !== 'biometric' || isScanning || isVerified}
                className={`w-full flex items-center justify-center gap-2 text-[14px] font-medium rounded-lg py-2.5 transition-colors ${
                  selected !== 'biometric'
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : isVerified
                    ? 'bg-success text-white cursor-default'
                    : isScanning
                    ? 'bg-indigo-400 text-white cursor-default'
                    : 'bg-navy text-white hover:bg-opacity-90'
                }`}
              >
                {selected === 'biometric' && isScanning
                  ? <><TbLoader className="animate-spin" style={{ fontSize: 15 }} /> Scanning…</>
                  : selected === 'biometric' && isVerified
                  ? <><TbCircleCheck style={{ fontSize: 15 }} /> Verified</>
                  : <><TbSparkles style={{ fontSize: 15 }} /> Use biometric</>
                }
              </button>
            </div>

            {/* Government ID card */}
            <div
              onClick={() => !isScanning && setIdentityMethod('gov-id')}
              className={`relative rounded-xl border-2 p-5 transition-all flex flex-col ${
                isScanning || isVerified ? 'cursor-default' : 'cursor-pointer'
              } ${
                selected === 'gov-id'
                  ? verStatus === 'received' ? 'border-blue-action bg-blue-50/30' : 'border-navy bg-white shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                ref={govIdInputRef}
                type="file"
                accept="image/*,.json"
                className="hidden"
                onChange={(e) => handleGovIdFile(e.target.files?.[0])}
              />

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${verStatus === 'received' && selected === 'gov-id' ? 'bg-blue-50' : 'bg-gray-50'}`}>
                {selected === 'gov-id' && isScanning
                  ? <TbLoader className="text-secondary animate-spin" style={{ fontSize: 26 }} />
                  : selected === 'gov-id' && verStatus === 'received'
                  ? <TbCheck className="text-blue-action" style={{ fontSize: 26 }} />
                  : <TbCamera className="text-secondary" style={{ fontSize: 26 }} />
                }
              </div>

              <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Government ID scan</h3>
              <p className="text-[13px] text-secondary leading-snug mb-4 flex-1">
                Upload a photo of your ID. Gemini AI verifies authenticity in seconds.
              </p>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (selected === 'gov-id' && !isScanning && !isVerified) govIdInputRef.current?.click()
                }}
                disabled={selected !== 'gov-id' || isScanning || isVerified}
                className={`w-full flex items-center justify-center gap-2 text-[14px] font-medium rounded-lg py-2.5 transition-colors ${
                  selected !== 'gov-id'
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : verStatus === 'received'
                    ? 'bg-blue-action text-white cursor-default'
                    : isScanning
                    ? 'bg-indigo-400 text-white cursor-default'
                    : 'bg-navy text-white hover:bg-opacity-90'
                }`}
              >
                {selected === 'gov-id' && isScanning
                  ? <><TbLoader className="animate-spin" style={{ fontSize: 15 }} /> Uploading…</>
                  : selected === 'gov-id' && verStatus === 'received'
                  ? <><TbCircleCheck style={{ fontSize: 15 }} /> Received</>
                  : <><TbCamera style={{ fontSize: 15 }} /> Upload ID</>
                }
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

        <div className="hidden lg:flex shrink-0">
          <VerificationStatusPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-1"
        continuePath="/onboarding/step-3"
        continueLabel={isVerified ? 'Continue to documents' : 'Verify identity to continue'}
        continueDisabled={!isVerified}
      />

      {/* Left drawer */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          <SidebarProgress
            currentStep={2}
            stepBadge={verStatus === 'verified' ? 'VERIFIED' : verStatus === 'received' ? 'RECEIVED' : isScanning ? 'SCANNING' : 'PENDING'}
            stepBadgeColor={isVerified ? 'text-success' : isScanning ? 'text-indigo-500' : 'text-warning'}
            onClose={() => setLeftOpen(false)}
          />
        </div>
      </div>

      {/* Right drawer */}
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
