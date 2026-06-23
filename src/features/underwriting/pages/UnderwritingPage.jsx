import { useMemo, useState } from 'react'
import { TbDownload } from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import ApplicationQueueView from '../components/ApplicationQueueView'
import ContextChat from '../chat/ContextChat'
import { LOAN_PIPELINE_PROMPT } from '../chat/chatPrompts'
import { useLoanApplications } from '../hooks/useLoanApplications'

const CURRENT_USER = {
  name:     'Marcus Webb',
  role:     'Senior Credit Analyst',
  initials: 'MW',
}

const STAT_CONFIG = [
  { key: 'incoming',      label: 'INCOMING',       sub: 'applications today', bar: 'bg-navy'        },
  { key: 'aiReviewing',   label: 'AI REVIEWING',   sub: 'in progress',        bar: 'bg-warning'     },
  { key: 'needsOfficer',  label: 'NEEDS OFFICER',  sub: 'awaiting review',    bar: 'bg-blue-action' },
  { key: 'autoRejected',  label: 'AUTO-REJECTED',  sub: 'score below 50%',    bar: 'bg-error'       },
  { key: 'approvedToday', label: 'APPROVED TODAY', sub: 'decisions made',     bar: 'bg-success'     },
]

const UnderwritingPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const apps = useLoanApplications()

  const stats = useMemo(() => ({
    incoming:     apps.length,
    aiReviewing:  apps.filter(a => a.status === 'ai_reviewing').length,
    needsOfficer: apps.filter(a => a.status === 'needs_review').length,
    autoRejected: apps.filter(a => a.status === 'auto_rejected').length,
    approvedToday: apps.filter(a => a.status === 'approved').length,
  }), [apps])

  const pendingCount = stats.needsOfficer + stats.autoRejected

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  })

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar
        user={CURRENT_USER}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">

        {/* ── Mobile top bar ── */}
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span className="text-[14px] font-semibold text-navy">Loan Underwriting</span>
        </div>

        {/* ── Page header + stats ── */}
        <div className="bg-white border-b border-gray-200 px-8 py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-semibold text-gray-900 leading-tight">
                Application queue
              </h1>
              <p className="text-[13px] text-secondary mt-1">
                {todayLabel} · {pendingCount} applications awaiting decision
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TbDownload style={{ fontSize: 15 }} />
                Export report
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mt-6">
            {STAT_CONFIG.map(({ key, label, sub, bar }) => {
              const pct = stats.incoming > 0
                ? Math.round((stats[key] / stats.incoming) * 100)
                : 0
              return (
                <div key={key} className="bg-white border border-gray-200 rounded-lg px-4 pt-4 pb-0 overflow-hidden">
                  <p className="text-[10px] font-semibold text-secondary uppercase tracking-widest">
                    {label}
                  </p>
                  <p className="text-[30px] font-bold text-gray-900 leading-none mt-1">
                    {stats[key]}
                  </p>
                  <p className="text-[11px] text-tertiary mt-1.5 mb-3">{sub}</p>
                  {/* Proportional fill bar: value / total incoming */}
                  <div className="h-[3px] w-full bg-gray-100">
                    <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Application queue ── */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          <ApplicationQueueView apps={apps} />
        </div>
      </div>

      <ContextChat
        storageKey="chat:loan-pipeline"
        contextLabel={`loan pipeline (${apps.length} applications)`}
        contextData={{
          totals: stats,
          applications: apps.map(a => ({
            id: a.id, name: a.name,
            loanType: a.loanType, loanAmount: a.loanAmount, loanTerm: a.loanTerm,
            aiScore: a.aiScore, dti: a.dti, status: a.status,
            summary: a.summary,
          })),
        }}
        systemPrompt={LOAN_PIPELINE_PROMPT}
        suggestions={[
          'What is the average AI score for needs-review applications?',
          'Which applications look the most risky?',
          'Common reasons for auto-rejection?',
          'What loan type dominates our pipeline?',
        ]}
      />
    </div>
  )
}

export default UnderwritingPage
