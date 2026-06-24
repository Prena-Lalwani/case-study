import { useMemo } from 'react'
import { TbCash, TbCheck, TbClock, TbX } from 'react-icons/tb'
import { aggregate, sliceByPeriod } from './syntheticHistory'
import { useReports } from '../hooks/useReports'
import { C, DonutChart, EmptyState, Histogram, KpiCard, LineChart, ReportSection, StackedBar } from './reportCharts'

const fmt$ = v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(1)}k` : `$${v}`

const LoansTab = ({ period }) => {
  const history = useReports()
  const days    = useMemo(() => sliceByPeriod(period, history), [period, history])
  const agg     = useMemo(() => aggregate(days),                [days])

  if (!agg) return null

  /* AI score histogram across the period */
  const buckets = [
    { label: '0–40',  count: 0, color: C.critical },
    { label: '40–60', count: 0, color: C.critical },
    { label: '60–75', count: 0, color: C.warning },
    { label: '75–85', count: 0, color: C.success },
    { label: '85+',   count: 0, color: C.success },
  ]
  /* Approximate: for each day weight by decisions, place around avgLoanScore.
     Per-day decision count lives on `loans.total` (NOT decisionsTotal, which is
     only on the aggregate) — reading the wrong field yielded NaN counts. */
  for (const d of days) {
    const decisions = Number(d.loans?.total ?? 0)
    if (decisions <= 0) continue
    const s = Number(d.loanAiScore)
    const ix = !Number.isFinite(s) ? 2 : s < 40 ? 0 : s < 60 ? 1 : s < 75 ? 2 : s < 85 ? 3 : 4
    buckets[ix].count += decisions
  }

  /* Time-series for approval rate */
  const approvalSeries = days.map(d => ({
    date: d.date,
    approveRate: Math.round((d.loans.approveRate ?? 0) * 100),
  }))

  return (
    <div className="space-y-4">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Approval rate"
          value={`${Math.round(agg.loans.approveRate * 100)}%`}
          sub={`${agg.loans.approved} approved`}
          icon={TbCheck}
          accent={C.success}
        />
        <KpiCard
          label="Decisions made"
          value={agg.loans.decisionsTotal}
          sub={`across the period`}
          icon={TbCash}
          accent={C.primary}
        />
        <KpiCard
          label="Total submitted"
          value={fmt$(agg.loans.valueSubmitted)}
          sub="loan value in pipeline"
          icon={TbCash}
          accent="#8B5CF6"
        />
        <KpiCard
          label="Avg AI score"
          value={agg.avgLoanScore}
          sub={agg.avgLoanScore >= 75 ? 'Strong portfolio' : agg.avgLoanScore >= 60 ? 'Healthy' : 'Below target'}
          accent={agg.avgLoanScore >= 75 ? C.success : agg.avgLoanScore >= 60 ? C.warning : C.critical}
        />
      </div>

      {/* Decision breakdown */}
      <ReportSection title="Decision breakdown" subtitle="How applications were resolved across the period">
        <StackedBar
          segments={[
            { label: 'Approved',     value: agg.loans.approved,    color: C.success },
            { label: 'Needs review', value: agg.loans.needsReview, color: C.warning },
            { label: 'Rejected',     value: agg.loans.rejected,    color: C.critical },
          ]}
        />
      </ReportSection>

      {/* Approval rate trend + score distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ReportSection title="Approval rate trend" subtitle="% of decisions approved per day">
          <LineChart
            data={approvalSeries}
            series={[{ key: 'approveRate', color: C.success }]}
            height={240}
            xTitle="DATE"
            yTitle="APPROVAL %"
          />
        </ReportSection>
        <ReportSection title="AI score distribution" subtitle="Spread across approval bands">
          <Histogram buckets={buckets} height={220} xTitle="SCORE BAND" yTitle="LOANS" />
        </ReportSection>
      </div>

      {/* Loan-type mix */}
      <ReportSection title="Loan-type mix" subtitle="What customers borrowed for">
        <DonutChart
          size={170}
          stroke={26}
          centerValue={Object.values(agg.loans.typeMix).reduce((s, v) => s + v, 0)}
          centerLabel="loans"
          slices={[
            { label: 'Home loan',     value: agg.loans.typeMix['Home loan'],     color: C.primary },
            { label: 'Auto loan',     value: agg.loans.typeMix['Auto loan'],     color: C.warning },
            { label: 'Personal loan', value: agg.loans.typeMix['Personal loan'], color: '#8B5CF6' },
            { label: 'Business loan', value: agg.loans.typeMix['Business loan'], color: C.success },
          ]}
        />
      </ReportSection>

      {/* Recent decisions mini-table (last 8 days) */}
      <ReportSection title="Daily decisions log" subtitle="Last 8 days · most recent first">
        {agg.loans.decisionsTotal === 0 ? (
          <EmptyState label="No loan decisions yet" sub="Approve or reject loans to populate this log." />
        ) : (
        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-gray-50 text-secondary">
              <tr>
                <Th>Date</Th>
                <Th className="text-right">Submissions</Th>
                <Th className="text-right">Approved</Th>
                <Th className="text-right">Needs review</Th>
                <Th className="text-right">Rejected</Th>
                <Th className="text-right">Approve rate</Th>
                <Th className="text-right">Value</Th>
              </tr>
            </thead>
            <tbody>
              {[...days].slice(-8).reverse().map((d, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <Td className="font-medium text-gray-900">{d.date}</Td>
                  <Td className="text-right tabular-nums">{d.loans.total}</Td>
                  <Td className="text-right tabular-nums text-success font-semibold">{d.loans.approved}</Td>
                  <Td className="text-right tabular-nums text-warning">{d.loans.needsReview}</Td>
                  <Td className="text-right tabular-nums text-error">{d.loans.rejected}</Td>
                  <Td className="text-right tabular-nums">{Math.round(d.loans.approveRate * 100)}%</Td>
                  <Td className="text-right tabular-nums">{fmt$(d.loans.valueSubmitted)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </ReportSection>
    </div>
  )
}

const Th = ({ children, className = '' }) => (
  <th className={`px-3 py-2 font-semibold text-[11px] uppercase tracking-wider ${className}`}>{children}</th>
)
const Td = ({ children, className = '' }) => (
  <td className={`px-3 py-2 ${className}`}>{children}</td>
)

export default LoansTab
