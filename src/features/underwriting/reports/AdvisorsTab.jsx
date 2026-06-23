import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { TbArrowRight, TbAward, TbCrown, TbMedal, TbStar, TbUsers, TbUserStar } from 'react-icons/tb'
import { useReports } from '../hooks/useReports'
import { C, EmptyState, KpiCard, ReportSection } from './reportCharts'

const AdvisorsTab = ({ period: _period }) => {
  const navigate = useNavigate()
  const history  = useReports()
  const advisors = history.advisorActivity
  const open     = (a) => navigate(`/underwriting/advisors/${a.id}`)

  /* Score = clients × completeness × completion rate (composite quality) */
  const ranked = useMemo(() => {
    const scored = advisors.map(a => ({
      ...a,
      perfScore: Math.round(a.totalAssigned * (a.avgCompleteness / 100) * a.completionRate),
    }))
    return scored.sort((a, b) => b.perfScore - a.perfScore)
  }, [advisors])

  const total          = advisors.length
  const totalAssigned  = advisors.reduce((s, a) => s + a.totalAssigned, 0)
  const avgComplete    = total > 0 ? Math.round(advisors.reduce((s, a) => s + a.avgCompleteness, 0) / total) : 0
  const overloaded     = advisors.filter(a => a.clientLoad >= 35).length

  const top3 = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  return (
    <div className="space-y-4">

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Total advisors"      value={total}         sub="active on the bench"  icon={TbUserStar} accent={C.primary} />
        <KpiCard label="Clients assigned"    value={totalAssigned} sub="over 90 days"          icon={TbUsers}    accent={C.success} />
        <KpiCard label="Avg completeness"    value={avgComplete}   sub="across all advisors"  icon={TbStar}     accent={C.warning} />
        <KpiCard label="Overloaded"          value={overloaded}    sub="≥35 active clients"    icon={TbAward}    accent={C.critical} />
      </div>

      {/* Top 3 podium */}
      <ReportSection title="Top performers" subtitle="Ranked by clients handled × completeness × completion rate · click to open profile">
        {top3.length === 0 ? (
          <EmptyState label="No advisors yet" sub="Add advisors via the Advisors page — top performers will rank here as they get assignments." />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {top3.map((a, i) => <PodiumCard key={a.id} advisor={a} rank={i + 1} onClick={() => open(a)} />)}
          </div>
        )}
      </ReportSection>

      {/* Full leaderboard */}
      <ReportSection title="Advisor leaderboard" subtitle="Performance breakdown for every advisor · click a row to open">
        {ranked.length === 0 ? (
          <EmptyState label="No advisors on the bench" />
        ) : (
        <div className="overflow-hidden border border-gray-100 rounded-lg">
          <table className="w-full text-left text-[12.5px]">
            <thead className="bg-gray-50 text-secondary">
              <tr>
                <Th>Rank</Th>
                <Th>Advisor</Th>
                <Th>Specialty</Th>
                <Th className="text-right">Clients</Th>
                <Th className="text-right">Avg score</Th>
                <Th className="text-right">Completion</Th>
                <Th className="text-right">AI pick rate</Th>
                <Th>Caseload</Th>
                <Th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {ranked.map((a, i) => (
                <tr key={a.id} onClick={() => open(a)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                  <Td className="font-bold text-gray-900">{i + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-[10.5px] font-semibold shrink-0">
                        {a.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{a.name}</p>
                        <p className="text-[10.5px] text-tertiary">{a.id}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-secondary truncate" style={{ maxWidth: 200 }}>{a.specialty}</Td>
                  <Td className="text-right tabular-nums font-semibold text-gray-900">{a.totalAssigned}</Td>
                  <Td className="text-right tabular-nums">
                    <ScorePill score={a.avgCompleteness} />
                  </Td>
                  <Td className="text-right tabular-nums">{Math.round(a.completionRate * 100)}%</Td>
                  <Td className="text-right tabular-nums">{Math.round((1 - a.override) * 100)}%</Td>
                  <Td><CaseloadBar load={a.clientLoad} /></Td>
                  <Td className="text-right"><TbArrowRight className="text-tertiary inline" style={{ fontSize: 13 }} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </ReportSection>

      {/* Caseload distribution */}
      <ReportSection title="Caseload distribution" subtitle="Active clients per advisor · click to open profile">
        {advisors.length === 0 ? (
          <EmptyState label="No advisors yet" sub="Add advisors to see caseload distribution." />
        ) : (
        <div className="space-y-2.5">
          {[...advisors].sort((a, b) => b.clientLoad - a.clientLoad).map(a => (
            <button
              key={a.id}
              onClick={() => open(a)}
              className="w-full flex items-center gap-3 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center text-[10.5px] font-semibold shrink-0">
                {a.initials}
              </div>
              <span className="text-[12.5px] text-gray-700 w-40 truncate shrink-0 text-left">{a.name}</span>
              <div className="flex-1">
                <CaseloadBar load={a.clientLoad} />
              </div>
              <span className="text-[12px] font-semibold text-gray-900 w-12 text-right tabular-nums shrink-0">{a.clientLoad}</span>
            </button>
          ))}
        </div>
        )}
      </ReportSection>
    </div>
  )
}

/* ── Atoms ───────────────────────────────────────────────────────────── */

const PodiumCard = ({ advisor, rank, onClick }) => {
  const cfg = {
    1: { Icon: TbCrown, color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', label: 'Gold'   },
    2: { Icon: TbMedal, color: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', label: 'Silver' },
    3: { Icon: TbMedal, color: '#92400E', bg: '#FFF7ED', border: '#FDBA74', label: 'Bronze' },
  }[rank]

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-4 relative overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider" style={{ background: '#fff', color: cfg.color, border: `1px solid ${cfg.border}` }}>
        <cfg.Icon style={{ fontSize: 12 }} /> {cfg.label}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-navy text-white flex items-center justify-center text-[14px] font-semibold shrink-0">
          {advisor.initials}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-gray-900 truncate">{advisor.name}</p>
          <p className="text-[11px] text-secondary truncate">{advisor.specialty}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
        <Mini label="Clients" value={advisor.totalAssigned} />
        <Mini label="Avg score" value={advisor.avgCompleteness} />
        <Mini label="Score" value={advisor.perfScore} highlight={cfg.color} />
      </div>
    </div>
  )
}

const Mini = ({ label, value, highlight }) => (
  <div>
    <p className="text-[9.5px] font-semibold text-tertiary uppercase tracking-wider">{label}</p>
    <p className="text-[15px] font-bold mt-0.5" style={{ color: highlight ?? C.text }}>{value}</p>
  </div>
)

const ScorePill = ({ score }) => {
  const color = score >= 80 ? C.success : score >= 70 ? C.warning : C.critical
  const bg    = score >= 80 ? '#F0FDF4' : score >= 70 ? '#FFFBEB' : '#FEF2F2'
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ color, background: bg }}>
      {score}
    </span>
  )
}

const CaseloadBar = ({ load }) => {
  const max = 50
  const pct = Math.min((load / max) * 100, 100)
  const color = load >= 35 ? C.critical : load >= 25 ? C.warning : C.success
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

const Th = ({ children, className = '' }) => (
  <th className={`px-3 py-2 font-semibold text-[11px] uppercase tracking-wider ${className}`}>{children}</th>
)
const Td = ({ children, className = '', style }) => (
  <td className={`px-3 py-2 ${className}`} style={style}>{children}</td>
)

export default AdvisorsTab
