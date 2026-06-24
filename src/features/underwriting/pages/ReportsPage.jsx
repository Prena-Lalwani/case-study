import { useState } from 'react'
import { useUrlState } from '../../../hooks/useNavState'
import {
  TbCalendar,
  TbCash,
  TbChartBar,
  TbReportMoney,
  TbUserStar,
} from 'react-icons/tb'
import UnderwritingSidebar, { TbMenu2 } from '../components/UnderwritingSidebar'
import ContextChat from '../chat/ContextChat'
import { REPORTS_PROMPT } from '../chat/chatPrompts'
import AdvisorsTab from '../reports/AdvisorsTab'
import AdvisoryTab from '../reports/AdvisoryTab'
import LoansTab from '../reports/LoansTab'
import OverviewTab from '../reports/OverviewTab'
import { aggregate, PERIOD_OPTIONS, sliceByPeriod } from '../reports/syntheticHistory'
import { useReports } from '../hooks/useReports'

const CURRENT_USER = { name: 'Marcus Webb', role: 'Senior Credit Analyst', initials: 'MW' }

const TABS = [
  { key: 'overview', label: 'Overview', icon: TbChartBar },
  { key: 'loans',    label: 'Loans',    icon: TbCash },
  { key: 'advisory', label: 'Advisory', icon: TbReportMoney },
  { key: 'advisors', label: 'Advisors', icon: TbUserStar },
]

const ReportsPage = () => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [tab, setTab] = useUrlState('tab', 'overview')

  /* Each tab has its own period state — switching tabs preserves last selection */
  const [periods, setPeriods] = useState({
    overview: '30d',
    loans:    '30d',
    advisory: '30d',
    advisors: '90d',
  })
  const period = periods[tab]
  const setPeriod = p => setPeriods(s => ({ ...s, [tab]: p }))

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="fixed inset-0 flex bg-white overflow-hidden">
      <UnderwritingSidebar user={CURRENT_USER} mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-page">
        {/* Mobile bar */}
        <div className="md:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <TbMenu2 style={{ fontSize: 20 }} />
          </button>
          <span className="text-[14px] font-semibold text-navy">Reports</span>
        </div>

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-5 sm:py-6 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-semibold text-gray-900 leading-tight">Reports</h1>
              <p className="text-[13px] text-secondary mt-1">{todayLabel} · firm-wide performance & advisor activity</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mt-5 -mb-5 sm:-mb-6 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => {
              const isActive = tab === key
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-action text-blue-action'
                      : 'border-transparent text-secondary hover:text-gray-800'
                  }`}
                >
                  <Icon style={{ fontSize: 15 }} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Period + Export bar */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-3 shrink-0 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TbCalendar className="text-tertiary" style={{ fontSize: 15 }} />
            <span className="text-[12px] font-medium text-secondary">Period:</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {PERIOD_OPTIONS.map(p => {
                const isActive = period === p.key
                return (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-secondary hover:text-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            {tab === 'advisors' && (
              <span className="text-[11px] text-tertiary ml-2 italic">Advisor totals are computed over the full 90-day window</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5">
          {tab === 'overview' && <OverviewTab period={period} />}
          {tab === 'loans'    && <LoansTab    period={period} />}
          {tab === 'advisory' && <AdvisoryTab period={period} />}
          {tab === 'advisors' && <AdvisorsTab period={period} />}
        </div>
      </div>

      <ReportsChat tab={tab} period={period} />
    </div>
  )
}

/* Builds the AI digest for the current active tab/period and renders the chat */
const ReportsChat = ({ tab, period }) => {
  const history = useReports()
  const days    = sliceByPeriod(period, history)
  const agg     = aggregate(days)

  /* Compact digest: aggregates + advisor leaderboard + missing docs */
  const digest = {
    period,
    activeTab: tab,
    range: { from: days[0]?.date, to: days[days.length - 1]?.date, days: days.length },
    aggregates: agg && {
      totalNewClients: agg.totalNew,
      newClientsByFlow: agg.newClients,
      loans: agg.loans,
      avgCompletenessScore: agg.avgCompleteness,
      avgLoanAiScore: agg.avgLoanScore,
    },
    docs: {
      qualityBreakdown: history.docQuality,
      mostCommonMissing: history.missingDocs,
    },
    advisors: history.advisorActivity.map(a => ({
      id: a.id, name: a.name, specialty: a.specialty,
      yearsExperience: a.yearsExperience, currentCaseload: a.clientLoad,
      totalAssigned: a.totalAssigned, avgCompleteness: a.avgCompleteness,
      completionRate: a.completionRate, aiPickRate: 1 - a.override,
      focus: a.focus,
    })),
  }

  return (
    <ContextChat
      storageKey={`chat:reports:${tab}`}
      contextLabel={`${tab} · ${period}`}
      contextData={digest}
      systemPrompt={REPORTS_PROMPT}
      suggestions={[
        'How is the firm trending vs the prior period?',
        'Where should I focus next quarter to grow?',
        'Which advisor delivers the best outcomes?',
        'What is the biggest risk in our current pipeline?',
      ]}
    />
  )
}

export default ReportsPage
