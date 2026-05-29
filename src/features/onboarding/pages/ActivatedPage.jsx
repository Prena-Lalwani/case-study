import {
  TbCheck, TbUser, TbFingerprint, TbFileText, TbSparkles,
  TbBolt, TbArrowRight, TbMessage2, TbDownload, TbCircleCheck,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'

/* ─── Confetti pieces (deterministic positions) ────────────────────── */
const CONFETTI = [
  { top: '9%',  left: '6%',  w: 10, h: 10, bg: '#1D3557', r: 15  },
  { top: '16%', left: '13%', w: 8,  h: 12, bg: '#2d8f4e', r: -25 },
  { top: '6%',  left: '20%', w: 9,  h: 9,  bg: '#6B5CE7', r: 40  },
  { top: '24%', left: '4%',  w: 7,  h: 7,  bg: '#EF9F27', r: 10  },
  { top: '38%', left: '9%',  w: 11, h: 8,  bg: '#1D3557', r: -15 },
  { top: '52%', left: '3%',  w: 8,  h: 8,  bg: '#2A8A8A', r: 30  },
  { top: '66%', left: '7%',  w: 10, h: 10, bg: '#EF9F27', r: -40 },
  { top: '78%', left: '14%', w: 9,  h: 6,  bg: '#1D3557', r: 20  },
  { top: '88%', left: '5%',  w: 7,  h: 11, bg: '#6B5CE7', r: -10 },
  { top: '7%',  left: '72%', w: 9,  h: 9,  bg: '#EF9F27', r: 25  },
  { top: '13%', left: '80%', w: 11, h: 8,  bg: '#1D3557', r: -30 },
  { top: '5%',  left: '88%', w: 8,  h: 12, bg: '#2d8f4e', r: 15  },
  { top: '20%', left: '93%', w: 10, h: 10, bg: '#1D3557', r: -20 },
  { top: '33%', left: '87%', w: 7,  h: 7,  bg: '#EF9F27', r: 35  },
  { top: '45%', left: '95%', w: 9,  h: 9,  bg: '#6B5CE7', r: -25 },
  { top: '58%', left: '90%', w: 11, h: 8,  bg: '#2A8A8A', r: 10  },
  { top: '70%', left: '82%', w: 8,  h: 10, bg: '#1D3557', r: -35 },
  { top: '82%', left: '91%', w: 10, h: 7,  bg: '#2d8f4e', r: 20  },
  { top: '92%', left: '78%', w: 7,  h: 7,  bg: '#EF9F27', r: -15 },
  { top: '30%', left: '1%',  w: 6,  h: 9,  bg: '#2d8f4e', r: 45  },
  { top: '60%', left: '18%', w: 8,  h: 8,  bg: '#6B5CE7', r: -40 },
  { top: '75%', left: '2%',  w: 10, h: 6,  bg: '#2A8A8A', r: 30  },
  { top: '10%', left: '95%', w: 9,  h: 9,  bg: '#6B5CE7', r: -20 },
  { top: '50%', left: '97%', w: 7,  h: 11, bg: '#EF9F27', r: 15  },
  { top: '85%', left: '96%', w: 8,  h: 8,  bg: '#1D3557', r: 40  },
]

/* ─── Summary cards ─────────────────────────────────────────────────── */
const SUMMARY_CARDS = [
  {
    icon: TbUser,        label: 'Personal info',     sub: '5 / 5 fields confirmed · AI pre-filled 3',
    bg: 'bg-blue-50',    iconBg: 'bg-blue-100',       iconColor: 'text-blue-action',
  },
  {
    icon: TbFingerprint, label: 'Identity verified',  sub: 'Biometric passed · 99% confidence',
    bg: 'bg-green-50',   iconBg: 'bg-green-100',      iconColor: 'text-success',
  },
  {
    icon: TbFileText,    label: 'Documents',           sub: '3 / 3 verified · 1 flag resolved',
    bg: 'bg-amber-50',   iconBg: 'bg-amber-100',      iconColor: 'text-warning',
  },
  {
    icon: TbSparkles,    label: 'Risk profile',        sub: '12 / 12 answered · Moderate Growth',
    bg: 'bg-purple-50',  iconBg: 'bg-purple-100',     iconColor: 'text-purple-500',
  },
]

/* ─── Compliance items ──────────────────────────────────────────────── */
const COMPLIANCE = ['KYC complete', 'AML passed', 'SOC 2 verified', 'WCAG 2.1']

/* ─── Page ─────────────────────────────────────────────────────────── */
const ActivatedPage = () => (
  <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

    <TopNavbar
      pageTitle="Activated"
      sessionInfo="Account active"
      sessionDotColor="text-success"
    />
    <StepStepper allComplete />

    {/* Scrollable main */}
    <main className="flex-1 overflow-y-auto bg-gray-50 relative">

      {/* Confetti layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              top: c.top, left: c.left,
              width: c.w, height: c.h,
              backgroundColor: c.bg,
              transform: `rotate(${c.r}deg)`,
              opacity: 0.75,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">

        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-success flex items-center justify-center mb-4 shadow-lg">
            <TbCheck className="text-white" style={{ fontSize: 32 }} />
          </div>
          <h1 className="text-[28px] md:text-[34px] font-bold text-navy leading-tight mb-2">
            Account activated!
          </h1>
          <p className="text-[17px] font-semibold text-gray-800 mb-1">
            Welcome to Meridian Wealth, John.
          </p>
          <p className="text-[14px] text-secondary">
            Your account is fully verified and ready to use.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {SUMMARY_CARDS.map(({ icon: Icon, label, sub, bg, iconBg, iconColor }) => (
            <div key={label} className={`${bg} rounded-xl px-4 py-4 flex items-center gap-3`}>
              <div className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
                <Icon className={iconColor} style={{ fontSize: 20 }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-semibold text-gray-800">{label}</p>
                  <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 15 }} />
                </div>
                <p className="text-[12px] text-secondary mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Advisor + Compliance row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

          {/* Advisor card */}
          <div className="rounded-xl px-5 py-5 flex flex-col justify-between" style={{ backgroundColor: '#1D3557' }}>
            <div className="flex items-start gap-3 mb-4">
              <div
                className="rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{ width: 42, height: 42, backgroundColor: '#2A6060', fontSize: 14 }}
              >
                SR
              </div>
              <div>
                <p className="text-[15px] font-bold text-white leading-tight">
                  Sarah Reynolds{' '}
                  <span className="text-[13px] font-normal text-blue-300">— your advisor</span>
                </p>
                <p className="text-[12px] text-blue-200 mt-0.5 leading-snug">
                  Senior Wealth Advisor · Will contact you within 1 business day
                </p>
              </div>
            </div>
            <button
              type="button"
              className="self-start flex items-center gap-2 border border-white/30 text-white text-[13px] font-medium rounded-lg px-4 py-2 hover:bg-white/10 transition-colors"
            >
              <TbMessage2 style={{ fontSize: 15 }} />
              Message Sarah
            </button>
          </div>

          {/* Compliance card */}
          <div className="bg-green-50 rounded-xl px-5 py-5">
            <p className="text-[13px] font-semibold text-gray-800 mb-3">Compliance &amp; security</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
              {COMPLIANCE.map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <TbCircleCheck className="text-success shrink-0" style={{ fontSize: 15 }} />
                  <span className="text-[13px] text-gray-700">{item}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="flex items-center gap-2 border border-gray-300 bg-white text-[12px] font-medium text-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
            >
              <TbDownload style={{ fontSize: 14 }} />
              Download compliance checklist PDF
            </button>
          </div>
        </div>

        {/* AI stats card */}
        <div className="rounded-xl px-5 py-5 mb-4" style={{ backgroundColor: '#1D3557' }}>
          <div className="flex items-center gap-1.5 mb-3">
            <TbBolt className="text-amber-400 shrink-0" style={{ fontSize: 14 }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">AI Saved You</span>
          </div>
          <div className="flex flex-wrap items-end gap-y-3 gap-x-8">
            <div>
              <p className="text-white font-bold leading-tight" style={{ fontSize: 32 }}>
                12 <span style={{ fontSize: 18 }}>min</span>{' '}
                44 <span style={{ fontSize: 18 }}>s</span>{' '}
                <span className="text-[16px] font-medium text-blue-300">total</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Fields Auto-Filled</p>
                <p className="text-[20px] font-bold text-white">3</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Documents Verified</p>
                <p className="text-[20px] font-bold text-white">3 <span className="text-[14px] font-medium text-blue-300">/ 3</span></p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Matched From</p>
                <p className="text-[20px] font-bold text-white">47 <span className="text-[14px] font-medium text-blue-300">advisors</span></p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-300 mb-0.5">Model</p>
                <p className="text-[14px] font-bold text-white">Meridian-IDX v3.2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Go to dashboard */}
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 bg-navy text-white text-[16px] font-semibold rounded-xl py-4 hover:bg-opacity-90 transition-colors"
        >
          Go to your dashboard
          <TbArrowRight style={{ fontSize: 18 }} />
        </button>

      </div>
    </main>
  </div>
)

export default ActivatedPage
