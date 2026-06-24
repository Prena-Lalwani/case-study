import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  TbAlertCircle,
  TbCheck,
  TbCloudUpload,
  TbFileText,
  TbLoader2,
  TbRefresh,
  TbSparkles,
} from 'react-icons/tb'
import { useGeminiExtract } from '../../onboarding/hooks/useGeminiExtract'

const isJsonFile = file =>
  file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')

/**
 * Document upload card with AI extraction + JSON parsing.
 * - Images → Gemini extraction with provided schema + prompt
 * - JSON   → parsed locally and passed through parseJson(obj) → onExtracted
 *
 * onLoadingChange(bool) — bubbled to parent so it can dim the form fields
 * while extraction is in progress.
 */
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload  = () => resolve(r.result)
  r.onerror = () => reject(r.error)
  r.readAsDataURL(file)
})

const DocumentUpload = ({
  title, hint, prompt, schema,
  onExtracted, parseJson, onLoadingChange, onSuccess, onFile,
  required, accept,
}) => {
  const fileInputRef = useRef(null)
  const [fileName, setFileName] = useState(null)
  const [source, setSource]     = useState(null)
  const [status, setStatus]     = useState('idle')
  const [errMsg, setErrMsg]     = useState(null)
  const { extractFromImage }    = useGeminiExtract()

  /* Notify parent whenever loading state flips */
  useEffect(() => {
    onLoadingChange?.(status === 'loading')
  }, [status, onLoadingChange])

  const handleFile = async file => {
    if (!file) return
    setFileName(file.name)
    setErrMsg(null)
    setStatus('loading')

    if (isJsonFile(file)) {
      setSource('json')
      try {
        const text   = await file.text()
        const parsed = JSON.parse(text)
        const flat   = parseJson ? parseJson(parsed) : parsed
        if (!flat || typeof flat !== 'object') throw new Error('Empty payload')
        /* tiny delay so users see the progress bar */
        await new Promise(r => setTimeout(r, 350))
        onExtracted(flat)
        onFile?.({ filename: file.name, mimeType: file.type || 'application/json', fileDataUrl: null, source: 'json' })
        onSuccess?.()
        setStatus('success')
      } catch (err) {
        setStatus('error')
        setErrMsg(err.message ? `Could not read JSON: ${err.message}` : 'Could not read JSON file.')
      }
      return
    }

    setSource('ai')
    // Capture the file as a data URL in parallel with AI extraction so we can persist it.
    const [result, dataUrl] = await Promise.all([
      extractFromImage(file, prompt, schema),
      fileToDataUrl(file).catch(() => null),
    ])
    if (result) {
      onExtracted(result)
      onFile?.({ filename: file.name, mimeType: file.type || 'application/octet-stream', fileDataUrl: dataUrl, source: 'image' })
      onSuccess?.()
      setStatus('success')
    } else {
      setStatus('error')
      setErrMsg('AI could not read this document. Try a clearer image or fill the fields manually.')
    }
  }

  const onChoose = () => fileInputRef.current?.click()

  const accentColor =
    status === 'success' ? 'border-green-200 bg-green-50/40' :
    status === 'error'   ? 'border-red-200 bg-red-50/40'    :
    status === 'loading' ? 'border-blue-action/40 bg-blue-50/30' :
                           'border-dashed border-gray-300 bg-gray-50/60'

  const iconBg =
    status === 'success' ? 'bg-success text-white' :
    status === 'error'   ? 'bg-error text-white'   :
    status === 'loading' ? 'bg-blue-action text-white' :
                           'bg-white border border-gray-200 text-secondary'

  const Icon =
    status === 'loading' ? () => <TbLoader2 className="animate-spin" style={{ fontSize: 19 }} /> :
    status === 'success' ? () => <TbCheck style={{ fontSize: 19 }} /> :
    status === 'error'   ? () => <TbAlertCircle style={{ fontSize: 19 }} /> :
                           () => <TbCloudUpload style={{ fontSize: 19 }} />

  return (
    <div className={`rounded-xl border transition-colors ${accentColor} px-5 py-4 relative overflow-hidden`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13.5px] font-semibold text-gray-900">
              {title} {required && <span className="text-error">*</span>}
            </p>
            {required && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-error border border-red-100">
                Required
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-action">
              <TbSparkles style={{ fontSize: 10 }} /> AI
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-secondary">
              <TbFileText style={{ fontSize: 10 }} /> JSON
            </span>
          </div>
          <p className="text-[12px] text-secondary mt-0.5">{hint}</p>

          {/* Status text */}
          {fileName && status !== 'idle' && (
            <p className="text-[11px] text-tertiary mt-2 truncate">
              {fileName}
              {status === 'loading' && (
                <span className="text-blue-action ml-2 font-medium">
                  {source === 'json' ? 'Parsing document…' : 'Extracting with AI…'}
                </span>
              )}
              {status === 'success' && (
                <span className="text-success ml-2 font-medium">
                  {source === 'json' ? 'JSON parsed — fields populated below' : 'AI extracted — fields populated below'}
                </span>
              )}
            </p>
          )}

          {errMsg && <p className="text-[11px] text-error mt-1.5">{errMsg}</p>}

          {/* Progress bar — visible during loading */}
          {status === 'loading' && (
            <div className="mt-3 h-1 w-full bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-action rounded-full doc-progress" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onChoose}
          disabled={status === 'loading'}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors disabled:opacity-50 ${
            status === 'success' || status === 'error'
              ? 'text-secondary border border-gray-200 bg-white hover:bg-gray-50'
              : 'text-white bg-navy hover:opacity-90'
          }`}
        >
          {status === 'success' || status === 'error' ? (
            <><TbRefresh style={{ fontSize: 13 }} /> Replace</>
          ) : (
            <><TbCloudUpload style={{ fontSize: 13 }} /> Upload</>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept ?? 'image/*,application/json,.json'}
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      <style>{`
        @keyframes doc-progress-anim {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(60%); }
          100% { transform: translateX(220%); }
        }
        .doc-progress {
          width: 40%;
          animation: doc-progress-anim 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

DocumentUpload.propTypes = {
  title:            PropTypes.string.isRequired,
  hint:             PropTypes.string.isRequired,
  prompt:           PropTypes.string,
  schema:           PropTypes.object,
  onExtracted:      PropTypes.func.isRequired,
  parseJson:        PropTypes.func,
  onLoadingChange:  PropTypes.func,
  onSuccess:        PropTypes.func,
  required:         PropTypes.bool,
  accept:           PropTypes.string,
}

export default DocumentUpload
