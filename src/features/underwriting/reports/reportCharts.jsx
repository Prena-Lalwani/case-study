import { useEffect, useRef, useState } from 'react'
import { TbArrowDownRight, TbArrowUpRight, TbChartBar, TbMinus } from 'react-icons/tb'

/* ── Empty state ──────────────────────────────────────────────────────── */
export const EmptyState = ({ height = 160, label = 'No data yet', sub }) => (
  <div
    className="flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border border-dashed border-gray-200"
    style={{ height, minHeight: 120 }}
  >
    <TbChartBar style={{ fontSize: 22 }} className="text-tertiary" />
    <p className="text-[12.5px] font-medium text-gray-700 mt-2">{label}</p>
    {sub && <p className="text-[11px] text-tertiary mt-1 max-w-[240px] leading-snug">{sub}</p>}
  </div>
)

export const C = {
  primary:  '#2563EB',
  success:  '#16A34A',
  warning:  '#F59E0B',
  critical: '#DC2626',
  track:    '#F3F4F6',
  text:     '#111827',
  muted:    '#6B7280',
  border:   '#E5E7EB',
}

/* ── KPI card with optional delta ─────────────────────────────────────── */
export const KpiCard = ({ label, value, sub, delta, deltaLabel = 'vs prior period', accent = C.primary, icon: Icon }) => {
  const isPos = delta != null && delta > 0
  const isNeg = delta != null && delta < 0
  const DeltaIcon = delta == null ? TbMinus : isPos ? TbArrowUpRight : isNeg ? TbArrowDownRight : TbMinus
  const deltaColor = delta == null ? 'text-tertiary' : isPos ? 'text-success' : isNeg ? 'text-error' : 'text-tertiary'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10.5px] font-semibold text-secondary uppercase tracking-widest">{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent + '15', color: accent }}>
            <Icon style={{ fontSize: 14 }} />
          </div>
        )}
      </div>
      <p className="text-[26px] font-bold text-gray-900 leading-none">{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        {delta != null && (
          <span className={`inline-flex items-center gap-0.5 text-[11.5px] font-semibold ${deltaColor}`}>
            <DeltaIcon style={{ fontSize: 12 }} />
            {Math.abs(Math.round(delta * 100))}%
          </span>
        )}
        <span className="text-[11px] text-tertiary">{delta != null ? deltaLabel : (sub ?? '')}</span>
      </div>
    </div>
  )
}

/* ── Smooth-curve helper ──────────────────────────────────────────────── */
const crCurve = pts => {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : ''
  let d = `M${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const cp1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const cp2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${cp1.x.toFixed(2)},${cp1.y.toFixed(2)} ${cp2.x.toFixed(2)},${cp2.y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  return d
}

const useSize = (initial = { w: 600, h: 200 }) => {
  const ref = useRef(null)
  const [sz, setSz] = useState(initial)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      if (width > 0 && height > 0) setSz({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, sz]
}

/* Compact "k / M" formatter — rounds and strips trailing .0 */
const fmtK = v => {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (abs >= 1_000)     return Math.round(v / 100) / 10 + 'k'   // 1.2k granularity
  if (abs >= 10)        return String(Math.round(v))
  if (abs === 0)        return '0'
  return Math.round(v * 10) / 10 + ''                            // 1 decimal for < 10
}

/* Round a value up to a "nice" scale boundary so ticks come out as 0, 25, 50, …  */
const niceCeil = v => {
  if (v <= 0) return 1
  const exp = Math.floor(Math.log10(v))
  const base = Math.pow(10, exp)
  const f = v / base
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * base
}

/* ── Line chart (single or multi-series) ──────────────────────────────── */
export const LineChart = ({ data, series, xKey = 'date', height = 220, currency = false, emptyLabel }) => {
  const [ref, { w, h }] = useSize({ w: 600, h: height })
  const PAD = { t: 12, r: 16, b: 28, l: 52 }
  const pw = Math.max(w - PAD.l - PAD.r, 1)
  const ph = Math.max(h - PAD.t - PAD.b, 1)

  if (!data?.length) return <EmptyState height={height} label={emptyLabel ?? 'No data yet'} sub="Charts populate as activity accrues." />

  const allVals = series.flatMap(s => data.map(d => Number(d[s.key] ?? 0)))
  const rawMax  = Math.max(...allVals)

  /* If every datapoint is zero (DB has rows but none in this window), treat as empty */
  if (rawMax === 0) return <EmptyState height={height} label={emptyLabel ?? 'No activity yet'} sub="Add clients to see the trend appear here." />

  const yMax    = niceCeil(rawMax * 1.1)           // round up to nice boundary
  const yMin    = 0

  const xOf = i => PAD.l + (data.length === 1 ? pw / 2 : (i / (data.length - 1)) * pw)
  const yOf = v => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * ph

  /* 5 ticks at clean values (0, ¼, ½, ¾, full of niceCeil) */
  const step = yMax / 4
  const yTicks = Array.from({ length: 5 }, (_, i) => i * step)

  /* Show ~6 x labels max */
  const stride = Math.max(1, Math.floor(data.length / 6))

  return (
    <div ref={ref} style={{ width: '100%', height }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* gridlines */}
        {yTicks.map((v, i) => {
          const y = yOf(v)
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={w - PAD.r} y2={y} stroke="#EFF2F7" strokeWidth="1" />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10.5" fill={C.muted}>
                {currency ? '$' + fmtK(v) : fmtK(v)}
              </text>
            </g>
          )
        })}
        <line x1={PAD.l} y1={PAD.t + ph} x2={w - PAD.r} y2={PAD.t + ph} stroke="#E2E8F0" strokeWidth="1" />

        {/* areas + lines per series */}
        {series.map((s, sIx) => {
          const pts  = data.map((d, i) => ({ x: xOf(i), y: yOf(Number(d[s.key] ?? 0)) }))
          const path = crCurve(pts)
          const closeArea = pts.length > 1
            ? ` L${pts[pts.length-1].x.toFixed(2)},${(PAD.t + ph).toFixed(2)} L${pts[0].x.toFixed(2)},${(PAD.t + ph).toFixed(2)}Z`
            : ''
          const gradId = `lcg_${sIx}_${(s.color || '').replace('#','')}`
          return (
            <g key={s.key}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.color} stopOpacity={series.length === 1 ? 0.18 : 0.10} />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              {series.length === 1 && <path d={path + closeArea} fill={`url(#${gradId})`} />}
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
            </g>
          )
        })}

        {/* x labels */}
        {data.map((d, i) => i % stride === 0 || i === data.length - 1 ? (
          <text key={i} x={xOf(i)} y={h - 6} textAnchor="middle" fontSize="10" fill={C.muted}>
            {String(d[xKey]).slice(5)}
          </text>
        ) : null)}
      </svg>
    </div>
  )
}

/* ── Horizontal bar chart ─────────────────────────────────────────────── */
export const HBarChart = ({ data, valueKey = 'count', labelKey = 'name', color = C.primary, max, emptyLabel }) => {
  if (!data?.length) return <EmptyState label={emptyLabel ?? 'No data yet'} />
  const top = (max ?? Math.max(...data.map(d => d[valueKey]))) || 1
  if (top === 0) return <EmptyState label={emptyLabel ?? 'No data yet'} />
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d[valueKey] / top) * 100
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[12px] text-gray-700 w-44 truncate shrink-0">{d[labelKey]}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
              <div className="h-full rounded" style={{ width: `${pct}%`, background: d.color ?? color }} />
            </div>
            <span className="text-[12px] font-semibold text-gray-900 w-12 text-right shrink-0">{d[valueKey]}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Donut / pie ──────────────────────────────────────────────────────── */
export const DonutChart = ({ slices, size = 180, stroke = 28, centerLabel, centerValue, emptyLabel }) => {
  const realTotal = slices.reduce((s, x) => s + x.value, 0)
  if (realTotal === 0) return <EmptyState height={size + 20} label={emptyLabel ?? 'No data yet'} />
  const total = realTotal || 1
  const r = (size - stroke) / 2
  const cx = size / 2
  const circ = 2 * Math.PI * r

  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
        <svg width={size} height={size} style={{ display: 'block' }}>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.track} strokeWidth={stroke} />
          {slices.map((s, i) => {
            const dash = (s.value / total) * circ
            const seg = (
              <circle
                key={i}
                cx={cx} cy={cx} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circ}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cx})`}
              />
            )
            offset += dash
            return seg
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {centerValue != null && (
            <span style={{ fontSize: 24, fontWeight: 800, color: C.text, lineHeight: 1 }}>{centerValue}</span>
          )}
          {centerLabel && (
            <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 3 }}>{centerLabel}</span>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-[12px] text-gray-700 truncate flex-1">{s.label}</span>
            <span className="text-[12px] font-semibold text-gray-900 ml-2">{s.value}</span>
            <span className="text-[10.5px] text-tertiary tabular-nums">
              {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Histogram (vertical bars) ───────────────────────────────────────── */
export const Histogram = ({ buckets, color = C.primary, height = 140, emptyLabel }) => {
  if (!buckets?.length) return <EmptyState height={height} label={emptyLabel ?? 'No data yet'} />
  const max = Math.max(...buckets.map(b => b.count))
  if (max === 0) return <EmptyState height={height} label={emptyLabel ?? 'No decisions yet'} sub="Approve or reject a loan to see the distribution." />
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {buckets.map((b, i) => {
        const pct = (b.count / max) * 100
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
            <div className="w-full rounded-t" style={{ height: `${pct}%`, background: b.color ?? color, minHeight: b.count > 0 ? 2 : 0 }} title={`${b.label}: ${b.count}`} />
            <span className="text-[10px] text-tertiary">{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── Stacked bar (single horizontal) ──────────────────────────────────── */
export const StackedBar = ({ segments, total, height = 12, showLabels = true, emptyLabel }) => {
  const realSum = total ?? segments.reduce((s, x) => s + x.value, 0)
  if (realSum === 0) return <EmptyState height={70} label={emptyLabel ?? 'No data yet'} />
  const sum = realSum || 1
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100" style={{ height }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${(s.value / sum) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
        ))}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-3 text-[11.5px]">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
              <span className="text-gray-700">{s.label}</span>
              <span className="font-semibold text-gray-900">{s.value}</span>
              <span className="text-tertiary tabular-nums">({Math.round((s.value / sum) * 100)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Report section wrapper ───────────────────────────────────────────── */
export const ReportSection = ({ title, subtitle, action, children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && <p className="text-[13px] font-semibold text-gray-900">{title}</p>}
          {subtitle && <p className="text-[11.5px] text-tertiary mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
)
