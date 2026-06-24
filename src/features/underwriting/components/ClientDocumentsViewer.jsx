import { useEffect, useState } from 'react'
import {
  TbBriefcase,
  TbBuilding,
  TbCircleCheck,
  TbDownload,
  TbFileDescription,
  TbFileText,
  TbId,
  TbLicense,
  TbReceipt,
  TbReportMoney,
  TbWallet,
  TbX,
} from 'react-icons/tb'

/* ─────────────────────────────────────────────────────────────────────────
   Shared client-document viewer.

   Renders the client's uploaded documents as a card grid; clicking a card
   opens a modal showing the original file (image or PDF) AND the AI-extracted
   structured data side by side.

   Used by:
     • ClientDetailPage         (full client profile)
     • ApplicationReviewPage    (loan officer review)
     • AdvisoryReviewPage       (advisory officer review)

   Props:
     documents — array of Document records from the API. Each shape:
       { id, docType, filename?, mimeType?, fileDataUrl?, parsedJson?,
         uploadSource?, aiConfidence?, status?, uploadedAt? }
     title?     — heading text  (default "Documents on file")
     emptyHint? — small text under heading when no documents
   ───────────────────────────────────────────────────────────────────────── */

const DOC_META = {
  'national-id':         { label: 'National ID',          Icon: TbId,              tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  'passport':            { label: 'Passport',             Icon: TbId,              tone: 'text-blue-700 bg-blue-50 border-blue-200' },
  'salary-slip':         { label: 'Salary Slip',          Icon: TbReceipt,         tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  'bank-statement':      { label: 'Bank Statement',       Icon: TbWallet,          tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  'employment-letter':   { label: 'Employment Letter',    Icon: TbFileDescription, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  'tax-return':          { label: 'Tax Return',           Icon: TbReportMoney,     tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  'business-license':    { label: 'Business License',     Icon: TbLicense,         tone: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  'financial-statement': { label: 'Financial Statement',  Icon: TbReportMoney,     tone: 'text-rose-700 bg-rose-50 border-rose-200' },
  'corporate-bank-statement': { label: 'Corporate Bank Statement', Icon: TbWallet, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
  'partnership-agreement': { label: 'Partnership Agreement', Icon: TbBriefcase,    tone: 'text-slate-700 bg-slate-50 border-slate-200' },
  'cosigner-docs':       { label: 'Co-signer Docs',       Icon: TbBuilding,        tone: 'text-slate-700 bg-slate-50 border-slate-200' },
}
const humanize = (s) => String(s ?? '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const docMetaOf = (type) =>
  DOC_META[type] ?? {
    label: humanize(type),
    Icon:  TbFileText,
    tone:  'text-gray-700 bg-gray-50 border-gray-200',
  }

const DOC_STATUS_STYLE = {
  verified: { label: 'Verified', cls: 'bg-green-50 text-success border-green-200' },
  pending:  { label: 'Pending',  cls: 'bg-orange-50 text-warning border-orange-200' },
  flagged:  { label: 'Flagged',  cls: 'bg-red-50 text-error border-red-200' },
}

const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/* ── Public component ──────────────────────────────────────────────────── */
const ClientDocumentsViewer = ({
  documents = [],
  title = 'Documents on file',
  emptyHint,
}) => {
  const [openDoc, setOpenDoc] = useState(null)

  if (!documents || documents.length === 0) {
    if (!emptyHint) return null
    return (
      <div>
        <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest mb-2">{title}</p>
        <div className="bg-white border border-dashed border-gray-300 rounded-xl py-8 text-center">
          <TbFileText className="mx-auto text-tertiary" style={{ fontSize: 28 }} />
          <p className="text-[12.5px] text-gray-700 font-medium mt-1.5">No documents uploaded yet</p>
          <p className="text-[11px] text-tertiary mt-0.5">{emptyHint}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-secondary uppercase tracking-widest">{title}</p>
        <span className="text-[11px] text-tertiary">{documents.length} document{documents.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {documents.map(d => (
          <DocumentCard key={d.id ?? d.docType} doc={d} onOpen={() => setOpenDoc(d)} />
        ))}
      </div>

      {/* key remounts the modal per-doc so initial tab state is fresh (no setState-in-effect) */}
      <DocumentViewerModal key={openDoc?.id ?? 'closed'} doc={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  )
}

/* ── Card ──────────────────────────────────────────────────────────────── */
const DocumentCard = ({ doc, onOpen }) => {
  const meta = docMetaOf(doc.docType)
  const stat = doc.status ? DOC_STATUS_STYLE[doc.status] : null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-action hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${meta.tone}`}>
          <meta.Icon style={{ fontSize: 18 }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-gray-900 truncate">{meta.label}</p>
          <p className="text-[11.5px] text-tertiary truncate mt-0.5 font-mono">{doc.filename ?? '—'}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {stat && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${stat.cls}`}>
                <TbCircleCheck style={{ fontSize: 11 }} />
                {stat.label}
              </span>
            )}
            {doc.aiConfidence != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-action border border-blue-200">
                {doc.aiConfidence}% AI
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11.5px]">
        <span className="text-tertiary">Uploaded {fmtDate(doc.uploadedAt)}</span>
        <span className="text-blue-action font-medium group-hover:underline">View →</span>
      </div>
    </button>
  )
}

/* ── Modal ─────────────────────────────────────────────────────────────── */
const DocumentViewerModal = ({ doc, onClose }) => {
  const hasFile   = !!doc?.fileDataUrl
  const hasParsed = !!doc?.parsedJson
  // Component is remounted per-doc (keyed by parent), so the initializer
  // reflects the right doc — no effect needed to reset the tab.
  const [tab, setTab] = useState(hasFile ? 'original' : 'parsed')

  useEffect(() => {
    if (!doc) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [doc, onClose])

  if (!doc) return null
  const meta = docMetaOf(doc.docType)
  const stat = doc.status ? DOC_STATUS_STYLE[doc.status] : null
  const isImage = doc.mimeType?.startsWith('image/') || doc.fileDataUrl?.startsWith('data:image/')
  const isPdf   = doc.mimeType === 'application/pdf' || doc.fileDataUrl?.startsWith('data:application/pdf')

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(doc.parsedJson ?? {}, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = (doc.filename?.replace(/\.[^.]+$/, '') ?? doc.docType) + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadOriginal = () => {
    if (!doc.fileDataUrl) return
    const a = document.createElement('a')
    a.href = doc.fileDataUrl
    a.download = doc.filename ?? doc.docType
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${meta.tone}`}>
            <meta.Icon style={{ fontSize: 20 }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-gray-900">{meta.label}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-[11.5px] text-tertiary font-mono truncate">{doc.filename ?? '—'}</p>
              <span className="text-tertiary">·</span>
              <p className="text-[11.5px] text-tertiary">Uploaded {fmtDate(doc.uploadedAt)}</p>
              {stat && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${stat.cls}`}>{stat.label}</span>
              )}
              {doc.aiConfidence != null && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-action border border-blue-200">
                  {doc.aiConfidence}% AI
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tertiary hover:bg-gray-100 hover:text-gray-700 transition-colors shrink-0"
            aria-label="Close"
          >
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Tabs (only when both original and parsed exist) */}
        {(hasFile && hasParsed) && (
          <div className="px-5 pt-2 border-b border-gray-200 flex items-center gap-1">
            <TabBtn active={tab === 'original'} onClick={() => setTab('original')}>Original file</TabBtn>
            <TabBtn active={tab === 'parsed'}   onClick={() => setTab('parsed')}>Extracted data</TabBtn>
          </div>
        )}

        {/* Body */}
        <div className={`flex-1 overflow-y-auto ${tab === 'original' && hasFile ? 'bg-gray-100' : ''}`}>
          {tab === 'original' && hasFile ? (
            <div className="flex items-center justify-center p-4 min-h-full">
              {isImage && (
                <img
                  src={doc.fileDataUrl}
                  alt={doc.filename ?? meta.label}
                  className="max-w-full max-h-[70vh] rounded-lg shadow-sm bg-white"
                />
              )}
              {isPdf && (
                <iframe
                  src={doc.fileDataUrl}
                  title={doc.filename ?? meta.label}
                  className="w-full h-[70vh] rounded-lg shadow-sm bg-white border border-gray-200"
                />
              )}
              {!isImage && !isPdf && (
                <div className="text-center py-12">
                  <TbFileText className="mx-auto text-tertiary" style={{ fontSize: 36 }} />
                  <p className="text-[13px] text-gray-700 font-medium mt-2">Preview not available for this file type</p>
                  <p className="text-[11.5px] text-tertiary mt-1">{doc.mimeType ?? 'unknown type'} · use Download to view</p>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-4">
              {hasParsed
                ? <ParsedJsonView value={doc.parsedJson} />
                : <p className="text-[13px] text-tertiary italic py-8 text-center">No parsed content available for this document.</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-[11.5px] text-tertiary">
            {hasFile && doc.uploadSource === 'image' ? 'Original upload + AI-extracted data'
              : doc.uploadSource === 'image' ? 'AI-extracted from uploaded image'
              : 'Structured JSON document'}
          </span>
          <div className="flex items-center gap-2">
            {hasFile && (
              <button
                onClick={downloadOriginal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-secondary bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TbDownload style={{ fontSize: 13 }} /> Download original
              </button>
            )}
            {hasParsed && (
              <button
                onClick={downloadJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-medium text-secondary bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TbDownload style={{ fontSize: 13 }} /> Download JSON
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-[12.5px] font-semibold text-white bg-navy rounded-lg hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const TabBtn = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors ${
      active ? 'border-blue-action text-blue-action' : 'border-transparent text-secondary hover:text-gray-900'
    }`}
  >
    {children}
  </button>
)

/* Pretty-printed recursive renderer for parsedJson. */
const ParsedJsonView = ({ value, depth = 0 }) => {
  if (value === null || value === undefined) return <span className="text-tertiary italic">—</span>
  if (typeof value === 'boolean') {
    return <span className={`text-[12.5px] font-semibold ${value ? 'text-success' : 'text-error'}`}>{value ? 'Yes' : 'No'}</span>
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const s = String(value)
    return <span className="text-[13px] text-gray-900 break-words">{s.length === 0 ? <span className="text-tertiary italic">—</span> : s}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-tertiary italic">empty</span>
    const allPrimitive = value.every(v => v === null || ['string', 'number', 'boolean'].includes(typeof v))
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11.5px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {String(v)}
            </span>
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
            <p className="text-[10.5px] font-semibold text-tertiary uppercase tracking-wider mb-1.5">Item {i + 1}</p>
            <ParsedJsonView value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return <span className="text-tertiary italic">empty</span>
  return (
    <div className={depth === 0 ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3' : 'space-y-2'}>
      {entries.map(([k, v]) => {
        const isObj    = v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0
        const isArrObj = Array.isArray(v) && v.some(x => x && typeof x === 'object')
        const wide = isObj || isArrObj
        return (
          <div key={k} className={wide ? 'col-span-full' : ''}>
            <p className="text-[10.5px] font-semibold text-tertiary uppercase tracking-wider mb-1">{humanize(k)}</p>
            <ParsedJsonView value={v} depth={depth + 1} />
          </div>
        )
      })}
    </div>
  )
}

export default ClientDocumentsViewer
