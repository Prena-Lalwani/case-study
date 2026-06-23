import { useState, useRef } from 'react'
import { TbUpload, TbFileUpload, TbLoader, TbAlertTriangle, TbInfoCircle } from 'react-icons/tb'
import { useOnboarding } from '../hooks/useOnboarding'

/* ─── Field-name aliases to handle different JSON structures ─────── */
const ALIASES = {
  fullName: ['fullName', 'legalName', 'name', 'full_name', 'clientName'],
  dob:      ['dob', 'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date', 'birthday'],
  address:  ['address', 'residentialAddress', 'residential_address', 'homeAddress', 'street'],
  email:    ['email', 'emailAddress', 'email_address', 'mail'],
  phone:    ['phone', 'phoneNumber', 'phone_number', 'mobile', 'tel', 'contact'],
  ssn:      ['ssn', 'nationalId', 'national_id', 'idNumber', 'id_number', 'passport', 'passportNumber', 'xyz'],
}

/* Flatten a nested object and look for the first matching alias key */
const findField = (obj, aliases) => {
  const flat = {}
  const flatten = (o) => {
    for (const [k, v] of Object.entries(o ?? {})) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) flatten(v)
      else flat[k.toLowerCase()] = String(v ?? '').trim()
    }
  }
  flatten(obj)
  for (const alias of aliases) {
    const val = flat[alias.toLowerCase()]
    if (val) return val
  }
  return ''
}

/* Format a raw date string as "DD Mon YYYY" */
const formatDob = (raw) => {
  if (!raw) return ''
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`
}

/* Business rule checks — mirror the real Gemini prompt rules */
const validateDob = (raw) => {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  const age = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return age < 25 ? 'Applicant must be 25 or older' : ''
}

const validateAddress = (addr) => {
  if (!addr) return ''
  const parts = addr.split(/[\s,]+/).filter(Boolean)
  return parts.length < 4 ? 'Address is incomplete — please verify' : ''
}

const validateSsn = (ssn) => {
  if (!ssn) return ''
  const c = ssn.replace(/[^0-9A-Za-z-]/g, '')
  if (/^\d{3}-\d{2}-\d{4}$/.test(c)) return ''
  if (/^\d{9}$/.test(c))              return ''
  if (/^[A-Za-z]{1,2}\d{6,9}$/.test(c)) return ''
  return 'ID number format is invalid'
}

/* Build the result object in the same shape fillPersonalInfoFromAi expects */
const mockExtractFromJson = (data) => {
  const rawDob  = findField(data, ALIASES.dob)
  const dob     = formatDob(rawDob) || rawDob
  const address = findField(data, ALIASES.address)
  const ssn     = findField(data, ALIASES.ssn)
  const fullName = findField(data, ALIASES.fullName)
  const email   = findField(data, ALIASES.email)
  const phone   = findField(data, ALIASES.phone)

  return {
    fullName: { value: fullName, confidence: fullName ? 97 : 0, validationError: '' },
    dob:      { value: dob,      confidence: dob     ? 94 : 0, validationError: dob     ? validateDob(rawDob || dob) : '' },
    address:  { value: address,  confidence: address ? 78 : 0, validationError: address ? validateAddress(address)   : '' },
    email:    { value: email,    confidence: email   ? 99 : 0, validationError: '' },
    phone:    { value: phone,    confidence: phone   ? 96 : 0, validationError: '' },
    ssn:      { value: ssn,      confidence: ssn     ? 88 : 0, validationError: ssn     ? validateSsn(ssn)           : '' },
  }
}

/* ─── Component ──────────────────────────────────────────────────── */
const UploadBanner = () => {
  const inputRef = useRef(null)
  const { fillPersonalInfoFromAi } = useOnboarding()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState(null)
  const [imageMode, setImageMode] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setError(null)
    setImageMode(false)

    if (!file.type.includes('json') && !file.type.startsWith('image/')) {
      setError('Only JSON or image files are accepted.')
      return
    }

    // Image files can't be processed in demo mode without a real Gemini call
    if (file.type.startsWith('image/')) {
      setImageMode(true)
      return
    }

    // JSON path — parse and mock-extract
    setIsLoading(true)
    try {
      const text   = await file.text()
      const data   = JSON.parse(text)

      // Simulate AI processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const result = mockExtractFromJson(data)
      console.log('🗂️ Mock extraction result:', result)
      fillPersonalInfoFromAi(result)
    } catch (err) {
      setError('Could not parse JSON file — make sure it is valid JSON.')
    } finally {
      setIsLoading(false)
    }
  }

  const onInputChange = (e) => handleFile(e.target.files?.[0])

  /* ── Loading ── */
  if (isLoading) return (
    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shrink-0">
        <TbLoader className="text-indigo-500 animate-spin" style={{ fontSize: 18 }} />
      </div>
      <div>
        <p className="text-[14px] font-semibold text-indigo-800 leading-tight">Reading your ID…</p>
        <p className="text-[12px] text-indigo-400 mt-0.5">Extracting name, DOB, address and ID number</p>
      </div>
    </div>
  )

  /* ── Error ── */
  if (error) return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-white border border-red-200 flex items-center justify-center shrink-0">
        <TbAlertTriangle className="text-error" style={{ fontSize: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-error leading-tight">Extraction failed</p>
        <p className="text-[12px] text-secondary mt-0.5 truncate">{error}</p>
      </div>
      <button type="button" onClick={() => { setError(null); inputRef.current?.click() }}
        className="text-[13px] font-medium text-blue-action hover:underline shrink-0">
        Try again
      </button>
      <input ref={inputRef} type="file" accept="image/*,.json" className="hidden" onChange={onInputChange} />
    </div>
  )

  /* ── Image in demo mode — prompt to use JSON ── */
  if (imageMode) return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
      <div className="w-8 h-8 rounded-lg bg-white border border-amber-200 flex items-center justify-center shrink-0">
        <TbInfoCircle className="text-warning" style={{ fontSize: 18 }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-gray-800 leading-tight">Image extraction unavailable in demo mode</p>
        <p className="text-[12px] text-secondary mt-0.5">Upload a <span className="font-mono">.json</span> file to auto-fill the form, or fill in manually below.</p>
      </div>
      <button type="button" onClick={() => { setImageMode(false); inputRef.current?.click() }}
        className="text-[13px] font-medium text-blue-action hover:underline shrink-0">
        Use JSON
      </button>
      <input ref={inputRef} type="file" accept="image/*,.json" className="hidden" onChange={onInputChange} />
    </div>
  )

  /* ── Idle ── */
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-5">
      <input ref={inputRef} type="file" accept="image/*,.json" className="hidden" onChange={onInputChange} />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center shrink-0">
          <TbFileUpload className="text-blue-action" style={{ fontSize: 18 }} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-navy leading-tight">
            Upload your government ID to auto-fill{' '}
            <span className="text-blue-action">4 fields instantly</span>
          </p>
          <p className="text-[12px] text-secondary mt-0.5">
            Drop a <span className="font-mono">.json</span> file to test · image files not supported in demo mode
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-1.5 border border-blue-action text-blue-action text-[13px] font-medium px-3 py-1.5 rounded-lg hover:bg-blue-action hover:text-white transition-colors duration-150 sm:shrink-0 w-full sm:w-auto"
      >
        <TbUpload style={{ fontSize: 15 }} />
        Upload ID
      </button>
    </div>
  )
}

export default UploadBanner
