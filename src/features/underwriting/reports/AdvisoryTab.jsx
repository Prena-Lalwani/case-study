import { useMemo } from 'react'
import { TbCheck, TbFileText, TbReportMoney, TbSparkles } from 'react-icons/tb'
import { aggregate, sliceByPeriod } from './syntheticHistory'
import { useReports } from '../hooks/useReports'
import { C, HBarChart, KpiCard, LineChart, ReportSection, StackedBar } from './reportCharts'

const AdvisoryTab = ({ period }) => {
  const history = useReports()
  const days    = useMemo(() => sliceByPeriod(period, history), [period, history])
  const agg     = useMemo(() => aggregate(days),                [days])

  if (!agg) return null

  const advisoryNew = agg.newClients['personal-advisory'] + agg.newClients['business-advisory']

  /* Time-series of avg completeness score */
  const scoreSeries = days.map(d => ({ date: d.date, score: d.advisory.avgCompletenessScore }))

  /* Engagement-ready % overall (rough: avg of daily engagementReadyPct) */
  const engagementReady = days.length
    ? Math.round(days.reduce((s, d) => s + d.advisory.engagementReadyPct, 0) / days.length * 100)
    : 0

  return (
    <div className="space-y-4">

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="New advisory clients"
          value={advisoryNew}
          sub={`${agg.newClients['personal-advisory']} personal · ${agg.newClients['business-advisory']} business`}
          icon={TbReportMoney}
          accent={C.success}
        />
        <KpiCard
          label="Avg completeness"
          value={agg.avgCompleteness}
          sub={agg.avgCompleteness >= 80 ? 'Above target' : agg.avgCompleteness >= 70 ? 'Acceptable' : 'Needs work'}
          icon={TbSparkles}
          accent={agg.avgCompleteness >= 80 ? C.success : agg.avgCompleteness >= 70 ? C.warning : C.critical}
        />
        <KpiCard
          label="Engagement-ready"
          value={`${engagementReady}%`}
          sub="score ≥ 80"
          icon={TbCheck}
          accent={C.success}
        />
        <KpiCard
          label="Total docs reviewed"
          value={history.docQuality.total}
          sub={`${history.docQuality.missing} missing flagged`}
          icon={TbFileText}
          accent={C.primary}
        />
      </div>

      {/* Completeness score trend */}
      <ReportSection
        title="Completeness score trend"
        subtitle="Average AI completeness across advisory clients per day"
      >
        <LineChart
          data={scoreSeries}
          series={[{ key: 'score', color: C.primary }]}
          height={220}
        />
      </ReportSection>

      {/* Two-column: missing docs + doc quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ReportSection title="Most common missing docs" subtitle="What we keep having to chase">
          <HBarChart
            data={history.missingDocs.slice(0, 8)}
            valueKey="count"
            labelKey="name"
            color={C.critical}
          />
        </ReportSection>

        <ReportSection title="Document quality" subtitle={`Across ${history.docQuality.total.toLocaleString()} documents`}>
          <div className="space-y-4">
            <StackedBar
              height={16}
              segments={[
                { label: 'Present',      value: history.docQuality.present,      color: C.success },
                { label: 'Low quality',  value: history.docQuality.lowQuality,   color: C.warning },
                { label: 'Inconsistent', value: history.docQuality.inconsistent, color: '#F97316' },
                { label: 'Missing',      value: history.docQuality.missing,      color: C.critical },
              ]}
            />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <QualityStat label="Present"      value={history.docQuality.present}      total={history.docQuality.total} color={C.success} />
              <QualityStat label="Low quality"  value={history.docQuality.lowQuality}   total={history.docQuality.total} color={C.warning} />
              <QualityStat label="Inconsistent" value={history.docQuality.inconsistent} total={history.docQuality.total} color="#F97316" />
              <QualityStat label="Missing"      value={history.docQuality.missing}      total={history.docQuality.total} color={C.critical} />
            </div>
          </div>
        </ReportSection>
      </div>

      {/* Personal vs Business advisory comparison */}
      <ReportSection title="Personal vs Business advisory" subtitle="Intake split across the period">
        <StackedBar
          height={20}
          segments={[
            { label: 'Personal Advisory', value: agg.newClients['personal-advisory'], color: C.success },
            { label: 'Business Advisory', value: agg.newClients['business-advisory'], color: '#8B5CF6' },
          ]}
        />
      </ReportSection>
    </div>
  )
}

const QualityStat = ({ label, value, total, color }) => (
  <div className="flex items-center gap-2">
    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
    <span className="text-[12px] text-gray-700 flex-1 truncate">{label}</span>
    <span className="text-[12px] font-semibold text-gray-900 tabular-nums">{value.toLocaleString()}</span>
    <span className="text-[10.5px] text-tertiary tabular-nums">{Math.round((value / total) * 100)}%</span>
  </div>
)

export default AdvisoryTab
