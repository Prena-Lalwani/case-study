import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { TbCheck, TbUserStar, TbX } from 'react-icons/tb'

const FOCUS_OPTIONS = [
  { key: 'personal-advisory', label: 'Personal advisory' },
  { key: 'business-advisory', label: 'Business advisory' },
  { key: 'personal-loan',     label: 'Personal loan'     },
  { key: 'business-loan',     label: 'Business loan'     },
]

const EMPTY = {
  name:            '',
  title:           '',
  specialty:       '',
  yearsExperience: '',
  clientLoad:      '',
  credentials:     '',
  languages:       '',
  bio:             '',
  focus:           [],
}

/* Convert comma-separated string ↔ array */
const toArray  = s => (s ?? '').split(',').map(x => x.trim()).filter(Boolean)
const toString = a => Array.isArray(a) ? a.join(', ') : ''

const AdvisorFormModal = ({ open, mode = 'create', advisor, onClose, onSave }) => {
  const [form, setForm]   = useState(EMPTY)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setTouched(false)
    if (mode === 'edit' && advisor) {
      setForm({
        name:            advisor.name ?? '',
        title:           advisor.title ?? '',
        specialty:       advisor.specialty ?? '',
        yearsExperience: advisor.yearsExperience ?? '',
        clientLoad:      advisor.clientLoad ?? '',
        credentials:     toString(advisor.credentials),
        languages:       toString(advisor.languages),
        bio:             advisor.bio ?? '',
        focus:           Array.isArray(advisor.focus) ? advisor.focus : [],
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, mode, advisor])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleFocus = (k) =>
    setForm(f => ({
      ...f,
      focus: f.focus.includes(k) ? f.focus.filter(x => x !== k) : [...f.focus, k],
    }))

  const isValid =
    form.name.trim().length > 1 &&
    form.title.trim().length > 1 &&
    form.specialty.trim().length > 1

  const handleSave = () => {
    setTouched(true)
    if (!isValid) return
    onSave({
      name:            form.name.trim(),
      title:           form.title.trim(),
      specialty:       form.specialty.trim(),
      yearsExperience: form.yearsExperience === '' ? 0 : Number(form.yearsExperience),
      clientLoad:      form.clientLoad      === '' ? 0 : Number(form.clientLoad),
      credentials:     toArray(form.credentials),
      languages:       toArray(form.languages),
      bio:             form.bio.trim(),
      focus:           form.focus,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-action flex items-center justify-center">
              <TbUserStar style={{ fontSize: 18 }} />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-gray-900 leading-tight">
                {mode === 'edit' ? 'Edit advisor' : 'Add new advisor'}
              </h2>
              <p className="text-[12px] text-secondary mt-0.5">
                {mode === 'edit' ? `Updating ${advisor?.name}` : 'Bring a new advisor onto the bench'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors">
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 bg-gray-50/50">

          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required error={touched && form.name.trim().length < 2 ? 'Required' : null}>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sarah Chen" className="adv-input" />
            </Field>

            <Field label="Title" required error={touched && form.title.trim().length < 2 ? 'Required' : null}>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Wealth Advisor" className="adv-input" />
            </Field>

            <Field label="Specialty" required error={touched && form.specialty.trim().length < 2 ? 'Required' : null} wide>
              <input value={form.specialty} onChange={e => set('specialty', e.target.value)} placeholder="e.g. Retirement & Estate Planning" className="adv-input" />
            </Field>

            <Field label="Years of experience">
              <input type="number" value={form.yearsExperience} onChange={e => set('yearsExperience', e.target.value)} placeholder="0" className="adv-input" />
            </Field>

            <Field label="Current caseload">
              <input type="number" value={form.clientLoad} onChange={e => set('clientLoad', e.target.value)} placeholder="0" className="adv-input" />
            </Field>

            <Field label="Credentials (comma separated)" wide>
              <input value={form.credentials} onChange={e => set('credentials', e.target.value)} placeholder="e.g. CFP, CFA, MBA" className="adv-input" />
            </Field>

            <Field label="Languages (comma separated)" wide>
              <input value={form.languages} onChange={e => set('languages', e.target.value)} placeholder="e.g. English, Mandarin" className="adv-input" />
            </Field>

            <Field label="Bio" wide>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} placeholder="Short professional summary…" className="adv-input resize-none" />
            </Field>

            <Field label="Focus areas (which flows can the AI assign?)" wide>
              <div className="grid grid-cols-2 gap-2">
                {FOCUS_OPTIONS.map(f => {
                  const active = form.focus.includes(f.key)
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => toggleFocus(f.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12.5px] font-medium transition-colors ${
                        active
                          ? 'border-blue-action bg-blue-50 text-blue-action'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${active ? 'bg-blue-action border-blue-action' : 'border-gray-300'}`}>
                        {active && <TbCheck className="text-white" style={{ fontSize: 11 }} />}
                      </span>
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={touched && !isValid}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <TbCheck style={{ fontSize: 14 }} />
            {mode === 'edit' ? 'Save changes' : 'Add advisor'}
          </button>
        </div>
      </div>

      <style>{`
        .adv-input {
          width: 100%; font-size: 13px; color: #111827; background: #fff;
          border: 1px solid #E5E7EB; border-radius: 8px;
          padding: 9px 12px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .adv-input::placeholder { color: #9CA3AF; }
        .adv-input:focus { border-color: #457B9D; box-shadow: 0 0 0 3px rgba(69,123,157,0.12); }
      `}</style>
    </div>
  )
}

const Field = ({ label, required, error, wide, children }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <p className="block text-[12px] font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-error">*</span>}
    </p>
    {children}
    {error && <p className="text-[11px] text-error mt-1">{error}</p>}
  </div>
)

AdvisorFormModal.propTypes = {
  open:    PropTypes.bool.isRequired,
  mode:    PropTypes.oneOf(['create', 'edit']),
  advisor: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onSave:  PropTypes.func.isRequired,
}

export default AdvisorFormModal
