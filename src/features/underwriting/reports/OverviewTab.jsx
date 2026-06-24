import { useMemo } from 'react'
import {
  TbBuilding,
  TbCash,
  TbReportMoney,
  TbUser,
  TbUsers,
  TbWallet,
} from 'react-icons/tb'
import { aggregate, deltaVsPrior, sliceByPeriod } from './syntheticHistory'
import { useReports } from '../hooks/useReports'
import { C, DonutChart, GroupedBarChart, KpiCard, LineChart, ReportSection } from './reportCharts'

const fmt$ = v => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(1)}k` : `$${v}`

const OverviewTab = ({ period }) => {
  const history = useReports()
  const days    = useMemo(() => sliceByPeriod(period, history), [period, history])
  const agg     = useMemo(() => aggregate(days),                [days])
  const delta   = useMemo(() => deltaVsPrior(period, history),  [period, history])

  if (!agg) return null

  /* Time-series stacked by flow */
  const seriesData = days.map(d => ({
    date: d.date,
    advisory: d.newClients['personal-advisory'] + d.newClients['business-advisory'],
    loans:    d.newClients['personal-loan']     + d.newClients['business-loan'],
    total:    d.newClientsTotal,
  }))

  /* Running cumulative total — a monotonic "growth trajectory" that reads well
     even when daily intake is sparse. */
  let running = 0
  const cumulativeData = seriesData.map(d => {
    running += d.total
    return { date: d.date, cumulative: running }
  })

  const advisoryTotal = agg.newClients['personal-advisory'] + agg.newClients['business-advisory']
  const loansTotal    = agg.newClients['personal-loan']     + agg.newClients['business-loan']
  const personalTotal = agg.newClients['personal-advisory'] + agg.newClients['personal-loan']
  const businessTotal = agg.newClients['business-advisory'] + agg.newClients['business-loan']

  return (
    <div className="space-y-4">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Total new clients"
          value={agg.totalNew}
          delta={delta}
          icon={TbUsers}
          accent={C.primary}
        />
        <KpiCard
          label="Advisory clients"
          value={advisoryTotal}
          sub={`${Math.round((advisoryTotal / agg.totalNew) * 100)}% of intake`}
          icon={TbReportMoney}
          accent={C.success}
        />
        <KpiCard
          label="Loan applications"
          value={loansTotal}
          sub={`${Math.round((loansTotal / agg.totalNew) * 100)}% of intake`}
          icon={TbCash}
          accent={C.warning}
        />
        <KpiCard
          label="Loan exposure"
          value={fmt$(agg.loans.valueSubmitted)}
          sub={`${agg.loans.decisionsTotal} decisions made`}
          icon={TbWallet}
          accent="#8B5CF6"
        />
      </div>

      {/* Client growth — two complementary views: per-period activity + cumulative trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left — new intakes per period (discrete counts read far better as bars) */}
        <ReportSection
          title="New intakes"
          subtitle={`By ${period === 'ytd' || period === '90d' ? 'period' : 'day'}, split by service`}
        >
          <GroupedBarChart
            data={seriesData}
            series={[
              { key: 'advisory', color: C.success, label: 'Advisory' },
              { key: 'loans',    color: C.primary, label: 'Loans' },
            ]}
            height={240}
            xTitle="DATE"
            yTitle="NEW CLIENTS"
            emptyLabel="No intakes in this period"
          />
          <div className="flex gap-4 mt-3 text-[12px]">
            <Legend color={C.success} label="Advisory" />
            <Legend color={C.primary} label="Loans" />
          </div>
        </ReportSection>

        {/* Right — cumulative growth trajectory (monotonic, reads well even when sparse) */}
        <ReportSection
          title="Cumulative growth"
          subtitle="Total clients onboarded over the period"
        >
          <LineChart
            data={cumulativeData}
            series={[{ key: 'cumulative', color: C.primary, label: 'Total clients' }]}
            height={240}
            xTitle="DATE"
            yTitle="TOTAL CLIENTS"
            emptyLabel="No intakes in this period"
          />
          <div className="flex gap-4 mt-3 text-[12px]">
            <Legend color={C.primary} label="Cumulative clients" />
          </div>
        </ReportSection>
      </div>

      {/* Two donuts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ReportSection title="Loan vs Advisory" subtitle="Where new intake landed">
          <DonutChart
            size={170}
            stroke={26}
            centerValue={agg.totalNew}
            centerLabel="clients"
            slices={[
              { label: 'Advisory', value: advisoryTotal, color: C.success },
              { label: 'Loans',    value: loansTotal,    color: C.primary },
            ]}
          />
        </ReportSection>
        <ReportSection title="Personal vs Business" subtitle="Client-type composition">
          <DonutChart
            size={170}
            stroke={26}
            centerValue={agg.totalNew}
            centerLabel="clients"
            slices={[
              { label: 'Personal', value: personalTotal, color: C.primary },
              { label: 'Business', value: businessTotal, color: '#8B5CF6' },
            ]}
          />
        </ReportSection>
      </div>

      {/* Flow breakdown */}
      <ReportSection title="Flow-by-flow breakdown" subtitle="New clients per intake type">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FlowCard label="Personal Advisory" value={agg.newClients['personal-advisory']} color={C.success} icon={TbUser} />
          <FlowCard label="Business Advisory" value={agg.newClients['business-advisory']} color={C.success} icon={TbBuilding} />
          <FlowCard label="Personal Loan"     value={agg.newClients['personal-loan']}     color={C.primary} icon={TbUser} />
          <FlowCard label="Business Loan"     value={agg.newClients['business-loan']}     color={C.primary} icon={TbBuilding} />
        </div>
      </ReportSection>
    </div>
  )
}

const Legend = ({ color, label }) => (
  <div className="flex items-center gap-1.5">
    <svg width="20" height="6"><line x1="1" y1="3" x2="19" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>
    <span className="text-secondary">{label}</span>
  </div>
)

const FlowCard = ({ label, value, color, icon: Icon }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: color + '15', color }}>
        <Icon style={{ fontSize: 13 }} />
      </div>
      <p className="text-[10.5px] font-semibold text-secondary uppercase tracking-wider truncate">{label}</p>
    </div>
    <p className="text-[22px] font-bold text-gray-900 leading-none">{value}</p>
  </div>
)

export default OverviewTab
