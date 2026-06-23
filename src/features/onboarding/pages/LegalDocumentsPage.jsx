import { useState, useReducer, useRef, useEffect, useCallback } from 'react'
import { useOnboarding } from '../hooks/useOnboarding'
import {
  TbFile, TbCheck, TbAlertTriangle,
  TbUpload, TbLock, TbFileText, TbX, TbLoader,
  TbCircleCheck,
} from 'react-icons/tb'
import TopNavbar from '../components/TopNavbar'
import StepStepper from '../components/StepStepper'
import SidebarProgress from '../components/SidebarProgress'
import AiDocumentReviewPanel from '../components/AiDocumentReviewPanel'
import BottomBar from '../components/BottomBar'

/* ─── Helpers ─────────────────────────────────────────────────────── */
const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'application/json']
const MAX_BYTES = 10 * 1024 * 1024

const fmtBytes = (b) =>
  b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`

const isImage = (f) => f?.type?.startsWith('image/')

/* ─── Upload slot reducer (local — only for in-flight animation) ─── */
const uploadInitialState = { file: null, preview: null, isDragging: false, status: 'idle', fileError: '' }

const uploadReducer = (state, action) => {
  switch (action.type) {
    case 'DRAG_ENTER':   return { ...state, isDragging: true }
    case 'DRAG_LEAVE':   return { ...state, isDragging: false }
    case 'FILE_PICKED':  return { ...state, file: action.file, preview: action.preview, status: 'uploading', isDragging: false, fileError: '' }
    case 'UPLOAD_DONE':  return { ...state, status: 'done' }
    case 'SET_ERROR':    return { ...state, fileError: action.message }
    case 'RESET':        return uploadInitialState
    default:             return state
  }
}

/* ─── Received card — shown when context has saved data ──────────── */
const ReceivedCard = ({ label, fileName, fileSize, preview, fromStep2, onReset }) => (
  <div className="rounded-xl border-2 border-blue-action bg-blue-50/30 p-5">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
        {preview
          ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
          : <TbCircleCheck className="text-blue-action" style={{ fontSize: 20 }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[16px] font-semibold text-gray-900">{label}</span>
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-action text-[11px] font-semibold px-2 py-0.5 rounded-full">
            <TbCheck style={{ fontSize: 11 }} /> RECEIVED
          </span>
        </div>
        {fromStep2 ? (
          <p className="text-[13px] text-secondary">Submitted at Step 2 — pending AI review at Step 4</p>
        ) : (
          <>
            {fileName && <p className="text-[13px] text-secondary mb-1 truncate">{fileName}{fileSize ? ` · ${fileSize}` : ''}</p>}
            <p className="text-[13px] text-blue-action">Pending AI review at Step 4</p>
          </>
        )}
      </div>
      {!fromStep2 && (
        <button
          type="button"
          onClick={onReset}
          className="p-1.5 rounded-lg hover:bg-blue-100 text-secondary hover:text-gray-700 transition-colors shrink-0"
          title="Remove and re-upload"
        >
          <TbX style={{ fontSize: 16 }} />
        </button>
      )}
    </div>
  </div>
)

/* ─── Interactive upload slot ────────────────────────────────────── */
const UploadSlot = ({ label, hint, required, docData, onReceived, onCleared }) => {
  const [us, dispatch] = useReducer(uploadReducer, uploadInitialState)
  const { file, preview, isDragging, status, fileError } = us
  const inputRef = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const handleFile = useCallback((f) => {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) {
      dispatch({ type: 'SET_ERROR', message: 'Only PDF, JPG, PNG, and JSON files are accepted.' })
      return
    }
    if (f.size > MAX_BYTES) {
      dispatch({ type: 'SET_ERROR', message: 'File must be under 10 MB.' })
      return
    }
    const objectUrl = isImage(f) ? URL.createObjectURL(f) : null
    dispatch({ type: 'FILE_PICKED', file: f, preview: objectUrl })
    setTimeout(() => {
      dispatch({ type: 'UPLOAD_DONE' })
      onReceived?.({ fileName: f.name, fileSize: fmtBytes(f.size), preview: objectUrl })
    }, 1500)
  }, [onReceived])

  const reset = () => {
    dispatch({ type: 'RESET' })
    if (inputRef.current) inputRef.current.value = ''
    onCleared?.()
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])
  const onDragOver   = (e) => { e.preventDefault(); dispatch({ type: 'DRAG_ENTER' }) }
  const onDragLeave  = (e) => { e.preventDefault(); dispatch({ type: 'DRAG_LEAVE' }) }
  const onDrop       = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  // Context has saved data — show received card immediately (survives back/forward navigation)
  if (docData?.status === 'received') {
    return (
      <ReceivedCard
        label={label}
        fileName={docData.fileName}
        fileSize={docData.fileSize}
        preview={docData.preview}
        onReset={reset}
      />
    )
  }

  /* uploading — progress */
  if (status === 'uploading') return (
    <div className="rounded-xl border-2 border-blue-action bg-blue-50/30 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
          {preview
            ? <img src={preview} alt="preview" className="w-full h-full object-cover" />
            : <TbFileText className="text-blue-action" style={{ fontSize: 20 }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[15px] font-semibold text-gray-800 truncate">{file.name}</span>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-action text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
              <TbLoader className="animate-spin" style={{ fontSize: 10 }} /> UPLOADING
            </span>
          </div>
          <p className="text-[13px] text-secondary mb-3">{fmtBytes(file.size)}</p>
          <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-action rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
          <p className="text-[12px] text-blue-action mt-1.5">Uploading document…</p>
        </div>
      </div>
    </div>
  )

  /* idle — drop zone */
  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.json" className="hidden" onChange={onInputChange} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-8 flex flex-col items-center text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-action bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-action hover:bg-blue-50/30'
        }`}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <TbUpload className={isDragging ? 'text-blue-action' : 'text-tertiary'} style={{ fontSize: 20 }} />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-semibold text-gray-800">{label}</span>
          {required && (
            <span className="text-[10px] font-semibold text-error bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
              Required
            </span>
          )}
        </div>
        <p className="text-[13px] mb-0.5">
          <span className="text-blue-action font-medium">{isDragging ? 'Drop to upload' : 'Drag & drop'}</span>
          <span className="text-secondary"> or click to browse</span>
        </p>
        {hint && <p className="text-[12px] text-tertiary mb-3">{hint} · JSON accepted</p>}
        <div className="flex items-center gap-1.5 text-[12px] text-secondary">
          <TbLock style={{ fontSize: 12 }} />
          <span>Encrypted on upload · <span className="font-medium">Never shared with third parties</span></span>
        </div>
      </div>
      {fileError && (
        <p className="mt-2 text-[12px] text-error flex items-center gap-1">
          <TbAlertTriangle style={{ fontSize: 13 }} /> {fileError}
        </p>
      )}
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────────── */
const LegalDocumentsPage = () => {
  const [leftOpen,  setLeftOpen]  = useState(false)
  const [rightOpen, setRightOpen] = useState(false)

  const { state, setDocumentReceived, clearDocument, canProceed, documentsReceived } = useOnboarding()
  const docs = state.documents

  // Gov-id is pre-received if user submitted at Step 2
  const govIdFromStep2 =
    state.identity.method === 'gov-id' &&
    (state.identity.verificationStatus === 'received' || state.identity.verificationStatus === 'verified')

  // Auto-mark govId as received when carried over from Step 2
  useEffect(() => {
    if (govIdFromStep2 && docs.govId?.status !== 'received') {
      setDocumentReceived('govId', { fileName: 'Submitted at Step 2', fileSize: null, preview: null })
    }
  }, [govIdFromStep2]) // eslint-disable-line react-hooks/exhaustive-deps

  const canContinue = canProceed(3)
  const badgeText   = `${documentsReceived} OF 3`

  return (
    <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">

      <TopNavbar
        onMenuClick={() => setLeftOpen(true)}
        onAiClick={() => setRightOpen(true)}
        pageTitle="Legal documents"
        sessionInfo={canContinue ? 'All documents received' : 'Session secure · documents pending'}
        sessionDotColor={canContinue ? 'text-success' : 'text-indigo-500'}
      />
      <StepStepper activeStep={3} />

      <div className="flex flex-1 overflow-hidden">

        <div className="hidden md:flex shrink-0">
          <SidebarProgress
            currentStep={3}
            stepBadge={badgeText}
            stepBadgeColor={canContinue ? 'text-success' : 'text-indigo-500'}
          />
        </div>

        <main className="flex-1 overflow-y-auto bg-gray-50 px-3 sm:px-5 md:px-6 lg:px-8 py-4 md:py-6">

          <div className="mb-5">
            <h1 className="text-[19px] md:text-[22px] font-semibold text-gray-900 leading-tight">
              Upload legal documents
            </h1>
            <p className="text-[13px] text-secondary mt-1">
              Upload all 3 required documents. AI will review everything together at Step 4.
            </p>
          </div>

          {canContinue ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
              <TbCircleCheck className="text-blue-action shrink-0" style={{ fontSize: 20 }} />
              <p className="text-[14px] font-semibold text-blue-action">
                All documents received — AI review runs at Step 4
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
              <div className="flex items-center gap-3">
                <TbFile className="text-secondary shrink-0" style={{ fontSize: 18 }} />
                <p className="text-[13px] text-gray-700">
                  <span className="font-semibold">No scanning on this step</span> — documents are collected here and sent to AI review at Step 4
                </p>
              </div>
              <span className="text-[13px] font-semibold text-indigo-500 shrink-0">{documentsReceived} of 3</span>
            </div>
          )}

          <div className="flex flex-col gap-4">

            {/* Gov ID — pre-received from Step 2 or upload zone */}
            {govIdFromStep2
              ? <ReceivedCard label="Government ID" fileName={null} fileSize={null} preview={null} fromStep2 />
              : (
                <UploadSlot
                  label="Government ID"
                  hint="Passport, driving licence, or national ID card"
                  required
                  docData={docs.govId}
                  onReceived={(meta) => setDocumentReceived('govId', meta)}
                  onCleared={() => clearDocument('govId')}
                />
              )
            }

            <UploadSlot
              label="Proof of address"
              hint="Utility bill or bank letter — must be from the last 3 months"
              required
              docData={docs.proofOfAddress}
              onReceived={(meta) => setDocumentReceived('proofOfAddress', meta)}
              onCleared={() => clearDocument('proofOfAddress')}
            />

            <UploadSlot
              label="Bank statement"
              hint="PDF, JPG, PNG · Max 10 MB · Last 3 months required"
              required
              docData={docs.bankStatement}
              onReceived={(meta) => setDocumentReceived('bankStatement', meta)}
              onCleared={() => clearDocument('bankStatement')}
            />

          </div>
        </main>

        <div className="hidden lg:flex shrink-0">
          <AiDocumentReviewPanel />
        </div>
      </div>

      <BottomBar
        backPath="/onboarding/step-2"
        continuePath="/onboarding/step-4"
        continueLabel={canContinue ? 'Continue to AI review' : `${3 - documentsReceived} document${3 - documentsReceived !== 1 ? 's' : ''} remaining`}
        continueDisabled={!canContinue}
      />

      {/* Left drawer */}
      <div className={`fixed inset-0 z-50 md:hidden flex transition-opacity duration-300 ${leftOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setLeftOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${leftOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ width: 240 }}>
          <SidebarProgress
            currentStep={3}
            stepBadge={badgeText}
            stepBadgeColor={canContinue ? 'text-success' : 'text-indigo-500'}
            onClose={() => setLeftOpen(false)}
          />
        </div>
      </div>

      {/* Right drawer */}
      <div className={`fixed inset-0 z-50 lg:hidden flex justify-end transition-opacity duration-300 ${rightOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setRightOpen(false)} />
        <div className={`relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ${rightOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: 280 }}>
          <AiDocumentReviewPanel onClose={() => setRightOpen(false)} />
        </div>
      </div>
    </div>
  )
}

export default LegalDocumentsPage
