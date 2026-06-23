import { useState } from 'react'
import { useOnboarding } from '../hooks/useOnboarding'
import { TbCheck, TbSparkles, TbLock, TbCircleFilled } from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AiMatchPanel from '../components/AiMatchPanel'
import BottomBar from '../components/BottomBar'

/* ─── All 12 quiz questions ───────────────────────────────────────── */
const QUESTIONS = [
  { n: 1,  text: 'What is your primary investment goal?',               options: ['Capital growth', 'Regular income', 'Capital preservation'] },
  { n: 2,  text: 'What is your investment time horizon?',               options: ['Less than 2 yrs', '3–7 years', '8+ years'] },
  { n: 3,  text: 'How would you react to a 20% portfolio drop?',        options: ['Sell immediately', 'Hold and wait', 'Buy more'] },
  { n: 4,  text: 'What percentage of your savings are you investing?',  options: ['Less than 25%', '25–50%', 'More than 50%'] },
  { n: 5,  text: 'How would you describe your investment experience?',  options: ['None', 'Some experience', 'Experienced'] },
  { n: 6,  text: 'What is your primary source of funds?',               options: ['Employment', 'Business', 'Inheritance'] },
  { n: 7,  text: 'What is your annual income range?',                   options: ['Under $50k', '$50k–$150k', 'Over $150k'] },
  { n: 8,  text: 'What is your estimated net worth?',                   options: ['Under $100k', '$100k–$500k', 'Over $500k'] },
  { n: 9,  text: 'How many financial dependents do you have?',          options: ['None', '1–2', '3 or more'] },
  { n: 10, text: 'Do you hold any other investments?',                  options: ['None', 'Stocks / Bonds', 'Real estate'] },
  { n: 11, text: 'Are you aware of your applicable tax bracket?',       options: ['Not sure', 'Aware', 'Actively managed'] },
  { n: 12, text: 'How would you describe your overall risk appetite?',  options: ['Conservative', 'Moderate', 'Aggressive'] },
]

/* ─── Sub-components ──────────────────────────────────────────────── */

const RadioOption = ({ label, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all ${
      selected
        ? 'bg-green-50 border-green-400'
        : 'bg-white border-gray-200 hover:border-blue-action hover:bg-blue-50'
    }`}
  >
    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
      selected ? 'border-success bg-success' : 'border-gray-300'
    }`}>
      {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
    </span>
    <span className={`text-[13px] ${selected ? 'font-medium text-gray-800' : 'text-gray-700'}`}>
      {label}
    </span>
  </button>
)

const AnsweredQuestion = ({ q, answer, onSelect }) => (
  <div className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-tertiary">Q{q.n}</span>
        <span className="text-[14px] font-medium text-gray-800">{q.text}</span>
      </div>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-success shrink-0">
        <TbCheck style={{ fontSize: 12 }} /> ANSWERED
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {q.options.map((opt) => (
        <RadioOption key={opt} label={opt} selected={opt === answer} onClick={() => onSelect(opt)} />
      ))}
    </div>
  </div>
)

const CurrentQuestion = ({ q, selected, onSelect }) => (
  <div className="rounded-xl border-2 border-navy bg-white p-5">
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-tertiary">Q{q.n}</span>
        <span className="text-[15px] font-semibold text-gray-900">{q.text}</span>
      </div>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-action shrink-0">
        <TbCircleFilled style={{ fontSize: 7 }} /> NOW
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {q.options.map((opt) => (
        <RadioOption key={opt} label={opt} selected={opt === selected} onClick={() => onSelect(opt)} />
      ))}
    </div>
  </div>
)

/* ─── Quiz progress (sidebar extra) — dynamic ────────────────────── */
const QuizProgressExtra = ({ answered, total }) => (
  <div className="mb-5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-[13px] text-tertiary">Quiz progress</span>
      <span className="text-[13px] font-semibold text-navy">{answered} of {total}</span>
    </div>
    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-navy rounded-full transition-all duration-300" style={{ width: `${(answered / total) * 100}%` }} />
    </div>
  </div>
)

/* ─── Page ─────────────────────────────────────────────────────────── */
const RiskAssessmentPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const { state, setRiskAnswer } = useOnboarding()
  const answers = state.riskAnswers

  // First unanswered question index (0-based); -1 means all done
  const currentIdx = QUESTIONS.findIndex(q => answers[q.n] == null)
  const answeredCount = QUESTIONS.filter(q => answers[q.n] != null).length
  const allAnswered = answeredCount === QUESTIONS.length

  const answered  = currentIdx === -1 ? QUESTIONS : QUESTIONS.slice(0, currentIdx)
  const current   = currentIdx === -1 ? null       : QUESTIONS[currentIdx]
  const lockedCount = currentIdx === -1 ? 0 : QUESTIONS.length - currentIdx - 1

  const sidebar = (onClose) => (
    <SidebarProgress
      currentStep={5}
      onClose={onClose}
      hideTimeEstimate
      extraContent={<QuizProgressExtra answered={answeredCount} total={QUESTIONS.length} />}
    />
  )

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Risk assessment"
      />
      <StepStepper activeStep={5} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar */}
        <div className="hidden md:flex shrink-0">{sidebar(null)}</div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          {/* Header */}
          <div className="mb-4">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Risk assessment
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              Help us understand your investment goals. AI analyzes answers in real-time.
            </p>
          </div>

          {/* AI banner */}
          <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0">
              <TbSparkles className="text-indigo-500" style={{ fontSize: 14 }} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-indigo-800">AI advisor matching active</p>
              <p className="text-[12px] text-indigo-400 mt-0.5">Your investor profile is being built with each answer you give</p>
            </div>
          </div>

          {/* Answered questions */}
          {answered.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-5 mb-4 flex flex-col gap-5">
              {answered.map((q) => (
                <AnsweredQuestion
                  key={q.n}
                  q={q}
                  answer={answers[q.n]}
                  onSelect={(ans) => setRiskAnswer(q.n, ans)}
                />
              ))}
            </div>
          )}

          {/* Current question */}
          {current && (
            <div className="mb-4">
              <CurrentQuestion
                q={current}
                selected={answers[current.n] ?? null}
                onSelect={(ans) => setRiskAnswer(current.n, ans)}
              />
            </div>
          )}

          {/* Locked remaining questions */}
          {lockedCount > 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <TbLock className="text-tertiary" style={{ fontSize: 16 }} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-gray-700">
                  Q{current.n + 1}–Q12 · {lockedCount} more {lockedCount === 1 ? 'question' : 'questions'}
                </p>
                <p className="text-[12px] text-secondary mt-0.5">
                  Unlock as you answer · about {Math.ceil(lockedCount * 0.5)} minutes remaining
                </p>
              </div>
            </div>
          )}

          {/* All done banner */}
          {allAnswered && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <TbCheck className="text-success shrink-0" style={{ fontSize: 18 }} />
              <p className="text-[13px] font-semibold text-success">
                All {QUESTIONS.length} questions answered — your investor profile is ready.
              </p>
            </div>
          )}

        </main>

        {/* Right panel */}
        <div className="hidden lg:flex shrink-0">
          <AiMatchPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-4"
        continuePath="/onboarding/step-6"
        continueLabel={allAnswered ? 'Submit profile' : `${QUESTIONS.length - answeredCount} questions remaining`}
        continueDisabled={!allAnswered}
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
          <AiMatchPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default RiskAssessmentPage
