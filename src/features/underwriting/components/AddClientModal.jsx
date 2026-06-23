import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import {
  TbAlertTriangle,
  TbArrowLeft,
  TbArrowRight,
  TbBuilding,
  TbBuildingBank,
  TbCash,
  TbCheck,
  TbCompass,
  TbEdit,
  TbFileStack,
  TbId,
  TbPlus,
  TbReportMoney,
  TbSparkles,
  TbX,
} from 'react-icons/tb'
import DocumentUpload from './DocumentUpload'
import {
  BANK_STATEMENT_PROMPT,
  BANK_STATEMENT_SCHEMA,
  NATIONAL_ID_PROMPT,
  NATIONAL_ID_SCHEMA,
  SALARY_SLIP_PROMPT,
  SALARY_SLIP_SCHEMA,
} from '../ai/clientExtractionSchemas'

/* ── JSON parsers ─────────────────────────────────────────────────────── */
const parseIdentityJson = obj => {
  const pi = obj.personalInfo ?? {}
  const id = obj.documents?.nationalId ?? obj.nationalId ?? obj
  return {
    fullName:    pi.fullName    || id.fullName,
    dateOfBirth: pi.dateOfBirth || id.dateOfBirth,
    address:     pi.address     || id.address,
    idNumber:    id.idNumber,
    nationality: pi.nationality,
    email:       pi.email,
    phone:       pi.phone,
  }
}

const parseEmploymentJson = obj => {
  const em = obj.employment ?? {}
  const ss = obj.documents?.salarySlip ?? obj.salarySlip ?? {}
  const fi = obj.financials ?? {}
  return {
    employer:      em.employer     || ss.employer,
    jobTitle:      em.jobTitle,
    monthlyGross:  em.monthlyGross || ss.grossSalary,
    monthlyNet:    em.monthlyNet   || ss.netPay,
    yearsEmployed: em.yearsEmployed,
    creditScore:   fi.creditScore,
  }
}

const parseBankingJson = obj => {
  const bs = obj.documents?.bankStatement ?? obj.bankStatement ?? obj
  return {
    bankName:              bs.bank,
    accountHolder:         bs.accountHolder,
    accountNumber:         bs.accountNumber,
    statementPeriod:       bs.statementPeriod,
    averageMonthlyCredit:  bs.averageMonthlyCredit,
    averageMonthlyDebit:   bs.averageMonthlyDebit,
    averageClosingBalance: bs.averageClosingBalance,
  }
}

const parseFullClientJson = obj => ({
  ...parseIdentityJson(obj),
  ...parseEmploymentJson(obj),
  ...parseBankingJson(obj),
  loanType:        obj.loanRequest?.type,
  loanAmount:      obj.loanRequest?.amount,
  loanTermYears:   obj.loanRequest?.termYears,
  loanPurpose:     obj.loanRequest?.purpose,
  propertyAddress: obj.loanRequest?.propertyAddress,
  propertyValue:   obj.loanRequest?.propertyValue,
})

const PARSERS = {
  identity:   parseIdentityJson,
  employment: parseEmploymentJson,
  banking:    parseBankingJson,
}

/* Shorthand schema bundles so doc config stays compact */
const SCH = {
  identity:   { prompt: NATIONAL_ID_PROMPT,   schema: NATIONAL_ID_SCHEMA },
  employment: { prompt: SALARY_SLIP_PROMPT,   schema: SALARY_SLIP_SCHEMA },
  banking:    { prompt: BANK_STATEMENT_PROMPT, schema: BANK_STATEMENT_SCHEMA },
}

/* ── Flow definitions ────────────────────────────────────────────────── */
const FLOWS = {
  'personal-advisory': {
    label: 'Personal Advisory',
    desc:  'Financial guidance for an individual client',
    icon:  TbCompass,
    accent: { bg: 'bg-blue-50', text: 'text-blue-action', border: 'border-blue-action' },
    derives: { applicationType: 'advisory', clientType: 'individual' },
    showLoanDetails: false,
    identity: [
      { key: 'nationalId', title: 'National ID / Passport', hint: 'Establish identity & KYC compliance', required: true, parser: 'identity', sch: 'identity' },
    ],
    financials: [
      { key: 'salarySlip',         title: 'Salary slip (last 1–3 months)',  hint: 'Current income proof',         required: true, parser: 'employment', sch: 'employment' },
      { key: 'bankStatement',      title: 'Bank statement (3–6 months)',    hint: 'Actual cash flow vs. declared', required: true, parser: 'banking',    sch: 'banking' },
      { key: 'personalTaxReturn',  title: 'Tax return (last year)',         hint: 'Income verification & deduction picture', required: true },
    ],
    additional: [
      { key: 'multiYearTax',     title: 'Multi-year tax returns (2–3 years)', hint: 'Income trajectory analysis' },
      { key: 'investments',      title: 'Investment / brokerage statements',  hint: 'Full asset allocation picture' },
      { key: 'retirement',       title: 'Retirement account statements',      hint: '401(k), IRA — full asset view' },
      { key: 'creditReport',     title: 'Credit report',                      hint: 'Formal liabilities view' },
      { key: 'debtAgreements',   title: 'Existing debt agreements',           hint: 'Mortgage, auto, student loans' },
      { key: 'insurance',        title: 'Insurance policies',                 hint: 'Gap analysis (life, health, disability)' },
      { key: 'estate',           title: 'Estate documents',                   hint: 'Will, trust (legacy planning)' },
      { key: 'goalWorksheet',    title: 'Financial goals worksheet',          hint: 'Risk tolerance & objectives' },
    ],
  },

  'business-advisory': {
    label: 'Business Advisory',
    desc:  'Strategic financial guidance for a company',
    icon:  TbReportMoney,
    accent: { bg: 'bg-green-50', text: 'text-success', border: 'border-success' },
    derives: { applicationType: 'advisory', clientType: 'business' },
    showLoanDetails: false,
    identity: [
      { key: 'certIncorporation', title: 'Certificate of Incorporation',  hint: 'Legal entity establishment',    required: true },
      { key: 'businessLicense',   title: 'Business license',              hint: 'Permit to operate (recommended)' },
    ],
    financials: [
      { key: 'auditedFinancials',      title: 'Audited financial statements (1–2 years)', hint: 'P&L, Balance Sheet, Cash Flow', required: true },
      { key: 'corporateTaxReturn',     title: 'Corporate tax returns (1–2 years)',         hint: 'Verify financials',             required: true },
      { key: 'corporateBankStatement', title: 'Corporate bank statements (6–12 months)',  hint: 'Real cash position across all accounts', required: true, parser: 'banking', sch: 'banking' },
      { key: 'debtSchedule',           title: 'Debt schedule',                              hint: 'Current obligations & covenants', required: true },
    ],
    additional: [
      { key: 'thirdYearFinancials', title: '3rd year of financial statements',    hint: 'Deeper trend analysis' },
      { key: 'managementAccounts',  title: 'Management accounts (latest M/Q)',    hint: 'Most current view of operations' },
      { key: 'arApAging',           title: 'AR / AP aging reports',                hint: 'Working capital health' },
      { key: 'capTable',            title: 'Cap table / ownership structure',     hint: 'Governance & decision authority' },
      { key: 'majorContracts',      title: 'Major customer / supplier contracts', hint: 'Revenue concentration risk' },
      { key: 'budgetForecast',      title: 'Budget & forecast',                    hint: 'Forward-looking projections' },
      { key: 'industryLicenses',    title: 'Industry licenses / compliance certs', hint: 'Regulatory standing' },
      { key: 'businessInsurance',   title: 'Business insurance policies',          hint: 'Risk mitigation profile' },
    ],
  },

  'personal-loan': {
    label: 'Personal Loan',
    desc:  'Loan application for an individual',
    icon:  TbCash,
    accent: { bg: 'bg-orange-50', text: 'text-warning', border: 'border-warning' },
    derives: { applicationType: 'loan', clientType: 'individual' },
    showLoanDetails: true,
    identity: [
      { key: 'nationalId', title: 'National ID / Passport', hint: 'Identity & KYC compliance', required: true, parser: 'identity', sch: 'identity' },
    ],
    financials: [
      { key: 'salarySlip',        title: 'Salary slip (last 1–3 months)', hint: 'Current income proof',                required: true, parser: 'employment', sch: 'employment' },
      { key: 'bankStatement',     title: 'Bank statement (3–6 months)',   hint: 'Verify deposits & spending patterns', required: true, parser: 'banking',    sch: 'banking' },
      { key: 'personalTaxReturn', title: 'Tax return (last 1–2 years)',   hint: 'Income verification + side income',   required: true },
      { key: 'creditReport',      title: 'Credit report / Credit score',  hint: 'Repayment history & risk profile',    required: true },
    ],
    additional: [
      { key: 'employmentVerification', title: 'Employment verification letter', hint: 'Employer confirms employment + salary' },
      { key: 'multiYearTax',           title: 'Multi-year tax returns',         hint: 'Income stability' },
      { key: 'investments',            title: 'Investment / brokerage statements', hint: 'Asset backing' },
      { key: 'debtAgreements',         title: 'Existing debt agreements',          hint: 'Full DTI picture' },
      { key: 'cosignerDocs',           title: 'Co-signer / guarantor documents',   hint: 'If applicable' },
      { key: 'insurance',              title: 'Insurance policies',                hint: 'Income protection' },
      { key: 'rentalHistory',          title: 'Rental / lease history',            hint: 'First-time borrowers' },
    ],
  },

  'business-loan': {
    label: 'Business Loan',
    desc:  'Loan application for a company',
    icon:  TbBuildingBank,
    accent: { bg: 'bg-purple-50', text: 'text-violet-700', border: 'border-violet-500' },
    derives: { applicationType: 'loan', clientType: 'business' },
    showLoanDetails: true,
    identity: [
      { key: 'certIncorporation', title: 'Certificate of Incorporation', hint: 'Legal entity exists', required: true },
      { key: 'businessLicense',   title: 'Business license / operating permit', hint: 'Legal to operate', required: true },
    ],
    financials: [
      { key: 'auditedFinancials',      title: 'Audited financial statements (2–3 years)', hint: 'P&L, Balance Sheet, Cash Flow', required: true },
      { key: 'corporateTaxReturn',     title: 'Corporate tax returns (last 2 years)',     hint: 'Verify financials',             required: true },
      { key: 'corporateBankStatement', title: 'Corporate bank statements (6–12 months)',  hint: 'Actual cash flow',              required: true, parser: 'banking', sch: 'banking' },
      { key: 'debtSchedule',           title: 'Debt schedule',                             hint: 'Existing obligations & covenants', required: true },
      { key: 'personalGuarantor',      title: 'Personal guarantor documents',             hint: 'Owners\' personal ID + financials (SME loans)', required: true },
    ],
    additional: [
      { key: 'arApAging',          title: 'AR / AP aging reports',              hint: 'Working capital health' },
      { key: 'majorContracts',     title: 'Major customer / supplier contracts', hint: 'Revenue concentration risk' },
      { key: 'managementAccounts', title: 'Management accounts',                 hint: 'Most recent quarter' },
      { key: 'capTable',           title: 'Cap table / ownership structure',    hint: 'Governance' },
      { key: 'businessPlan',       title: 'Business plan / use-of-funds',       hint: 'Critical for expansion / acquisition' },
      { key: 'financialProjections', title: 'Financial projections',            hint: 'Forward ability to repay' },
      { key: 'industryLicenses',   title: 'Industry licenses / regulatory certs', hint: 'Compliance' },
      { key: 'businessInsurance',  title: 'Business insurance policies',         hint: 'Risk mitigation' },
      { key: 'lenderReferences',   title: 'References from existing lenders',    hint: 'Track record' },
      { key: 'thirdYearFinancials', title: '3rd year of financial statements',   hint: 'Deeper trend' },
    ],
  },
}

const FLOW_KEYS = Object.keys(FLOWS)

/* ── Step config ─────────────────────────────────────────────────────── */
const ALL_STEPS = [
  { key: 'application', label: 'Application', icon: TbFileStack,    modes: 'all' },
  { key: 'identity',    label: 'Identity',    icon: TbId,           modes: 'all' },
  { key: 'financials',  label: 'Financials',  icon: TbReportMoney,  modes: 'all' },
  { key: 'loanRequest', label: 'Loan',        icon: TbCash,         modes: 'loan' },
  { key: 'additional',  label: 'Extras',      icon: TbPlus,         modes: 'all' },
  { key: 'review',      label: 'Review',      icon: TbCheck,        modes: 'all' },
]

const LOAN_TYPES = ['Home loan', 'Auto loan', 'Personal loan', 'Business loan']

const EMPTY = {
  flowKey: 'personal-loan',
  // identity
  fullName: '', dateOfBirth: '', address: '', nationality: '', idNumber: '',
  email: '', phone: '', location: '', company: '',
  // employment / financials
  employer: '', jobTitle: '', monthlyGross: '', monthlyNet: '',
  yearsEmployed: '', creditScore: '',
  // banking
  bankName: '', accountHolder: '', accountNumber: '', statementPeriod: '',
  averageMonthlyCredit: '', averageMonthlyDebit: '', averageClosingBalance: '',
  // loan request
  loanType: 'Home loan', loanAmount: '', loanTermYears: '', loanPurpose: '',
  propertyAddress: '', propertyValue: '',
  // misc
  notes: '',
}

/* ── Modal ───────────────────────────────────────────────────────────── */
const AddClientModal = ({ open, onClose, onSave }) => {
  const [stepIdx, setStepIdx]           = useState(0)
  const [form, setForm]                 = useState(EMPTY)
  const [touched, setTouched]           = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [uploaded, setUploaded]         = useState({})

  useEffect(() => {
    if (open) {
      setStepIdx(0); setForm(EMPTY); setTouched(false)
      setIsExtracting(false); setUploaded({})
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const flow = FLOWS[form.flowKey] ?? FLOWS['personal-loan']
  const isLoan = flow.derives.applicationType === 'loan'
  const isBusiness = flow.derives.clientType === 'business'

  const STEPS = useMemo(
    () => ALL_STEPS.filter(s => s.modes === 'all' || (s.modes === 'loan' && isLoan)),
    [isLoan]
  )

  if (!open) return null

  const set     = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setMany = obj    => setForm(f => {
    const next = { ...f }
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      if (v !== undefined && v !== null && v !== '') next[k] = v
    }
    return next
  })
  const markUploaded = key => setUploaded(u => ({ ...u, [key]: true }))

  const currentKey = STEPS[stepIdx]?.key
  const stepDocs   =
    currentKey === 'identity'   ? flow.identity   :
    currentKey === 'financials' ? flow.financials :
    currentKey === 'additional' ? flow.additional :
                                  []

  const requiredDocsForStep = stepDocs.filter(d => d.required)
  const missingRequiredDocs = requiredDocsForStep.filter(d => !uploaded[d.key])

  /* ── Validation per step ── */
  const isStepValid = () => {
    if (currentKey === 'application') return true
    if (currentKey === 'identity') {
      if (missingRequiredDocs.length > 0) return false
      if (!(form.fullName.trim().length > 1)) return false
      if (!/\S+@\S+\.\S+/.test(form.email)) return false
      if (isBusiness && form.company.trim().length < 2) return false
      return true
    }
    if (currentKey === 'financials')  return missingRequiredDocs.length === 0
    if (currentKey === 'additional')  return true  /* all optional */
    if (currentKey === 'loanRequest') return form.loanAmount !== '' && Number(form.loanAmount) > 0
    return true
  }
  const canContinue = isStepValid()

  const next = () => {
    setTouched(true)
    if (!canContinue) return
    setTouched(false)
    setStepIdx(i => Math.min(i + 1, STEPS.length - 1))
  }
  const back = () => {
    setTouched(false)
    setStepIdx(i => Math.max(i - 1, 0))
  }

  const handleSave = () => {
    const num = v => v === '' || v == null ? 0 : Number(v)
    onSave({
      name:    form.fullName.trim(),
      email:   form.email.trim(),
      phone:   form.phone.trim(),
      type:    flow.derives.clientType,
      company: isBusiness ? (form.company || form.employer).trim() : null,
      location: form.location.trim(),
      flowKey:         form.flowKey,
      applicationType: flow.derives.applicationType,
      dateOfBirth: form.dateOfBirth,
      address:     form.address,
      idNumber:    form.idNumber,
      nationality: form.nationality,
      employer:    form.employer.trim(),
      jobTitle:    form.jobTitle.trim(),
      monthlyGross:  num(form.monthlyGross),
      monthlyNet:    num(form.monthlyNet),
      yearsEmployed: num(form.yearsEmployed),
      creditScore:   num(form.creditScore),
      bankName:              form.bankName,
      accountHolder:         form.accountHolder,
      accountNumber:         form.accountNumber,
      statementPeriod:       form.statementPeriod,
      averageMonthlyCredit:  num(form.averageMonthlyCredit),
      averageMonthlyDebit:   num(form.averageMonthlyDebit),
      averageClosingBalance: num(form.averageClosingBalance),
      loanRequest: isLoan ? {
        type:            form.loanType,
        amount:          num(form.loanAmount),
        termYears:       num(form.loanTermYears),
        purpose:         form.loanPurpose,
        propertyAddress: form.propertyAddress,
        propertyValue:   num(form.propertyValue),
      } : null,
      uploadedDocuments: Object.keys(uploaded).filter(k => uploaded[k]),
      notes: form.notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[860px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900 leading-tight">Add new client</h2>
            <p className="text-[12.5px] text-secondary mt-0.5">
              Upload documents (image or JSON) to auto-fill, or enter the details manually.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors">
            <TbX style={{ fontSize: 18 }} />
          </button>
        </div>

        <Stepper steps={STEPS} stepIdx={stepIdx} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 bg-gray-50/50 relative">
          {currentKey === 'application' && (
            <StepApplication
              form={form} set={set} setMany={setMany}
              onLoadingChange={setIsExtracting} isExtracting={isExtracting}
              onBulkUploaded={() => {
                // bulk import satisfies most common required docs
                setUploaded(u => ({
                  ...u,
                  nationalId: true, salarySlip: true, bankStatement: true,
                  corporateBankStatement: true, certIncorporation: true,
                  auditedFinancials: true, corporateTaxReturn: true,
                  personalTaxReturn: true, debtSchedule: true,
                  creditReport: true, businessLicense: true, personalGuarantor: true,
                }))
              }}
            />
          )}
          {currentKey === 'identity' && (
            <StepDocs
              title={isBusiness ? 'Business identity & legal' : 'Personal identity'}
              hint={isBusiness
                ? 'Upload the legal documents establishing the business entity.'
                : 'Upload the applicant\'s ID document. AI will auto-fill the fields below.'}
              docs={flow.identity}
              uploaded={uploaded}
              touched={touched}
              missing={missingRequiredDocs}
              setMany={setMany}
              markUploaded={markUploaded}
              onLoadingChange={setIsExtracting}
              isExtracting={isExtracting}
            >
              <IdentityFields form={form} set={set} touched={touched} isBusiness={isBusiness} isExtracting={isExtracting} />
            </StepDocs>
          )}
          {currentKey === 'financials' && (
            <StepDocs
              title={isBusiness ? 'Business financials' : 'Income, cash & tax'}
              hint={isBusiness
                ? 'Upload the financial statements and supporting documents.'
                : 'Upload income proof, banking activity, and tax history.'}
              docs={flow.financials}
              uploaded={uploaded}
              touched={touched}
              missing={missingRequiredDocs}
              setMany={setMany}
              markUploaded={markUploaded}
              onLoadingChange={setIsExtracting}
              isExtracting={isExtracting}
            >
              <FinancialsFields form={form} set={set} isExtracting={isExtracting} isBusiness={isBusiness} />
            </StepDocs>
          )}
          {currentKey === 'loanRequest' && (
            <StepLoanRequest form={form} set={set} touched={touched} />
          )}
          {currentKey === 'additional' && (
            <StepDocs
              title="Optional supporting documents"
              hint="These aren't mandatory but sharpen the advisor's view. Skip any that aren't available."
              docs={flow.additional}
              uploaded={uploaded}
              touched={false}
              missing={[]}
              setMany={setMany}
              markUploaded={markUploaded}
              onLoadingChange={setIsExtracting}
              isExtracting={isExtracting}
            />
          )}
          {currentKey === 'review' && (
            <StepReview form={form} flow={flow} steps={STEPS} uploaded={uploaded} onJump={setStepIdx} />
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 bg-white">
          <div className="text-[12px] text-tertiary">
            Step {stepIdx + 1} of {STEPS.length}
            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-gray-100 text-secondary">
              <flow.icon style={{ fontSize: 11 }} /> {flow.label}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            {stepIdx > 0 ? (
              <button onClick={back} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <TbArrowLeft style={{ fontSize: 14 }} /> Back
              </button>
            ) : (
              <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-secondary border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            )}

            {stepIdx < STEPS.length - 1 ? (
              <button
                onClick={next}
                disabled={(touched && !canContinue) || isExtracting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-navy rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isExtracting ? 'Waiting for AI…' : currentKey === 'additional' ? 'Skip / Continue' : 'Continue'}
                <TbArrowRight style={{ fontSize: 14 }} />
              </button>
            ) : (
              <button onClick={handleSave} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:opacity-90 transition-opacity">
                <TbCheck style={{ fontSize: 14 }} /> Create client
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .ac-input {
          width: 100%; font-size: 13px; color: #111827; background: #fff;
          border: 1px solid #E5E7EB; border-radius: 8px;
          padding: 9px 12px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ac-input::placeholder { color: #9CA3AF; }
        .ac-input:focus { border-color: #457B9D; box-shadow: 0 0 0 3px rgba(69,123,157,0.12); }
        .ac-input:disabled { background: #F9FAFB; color: #6B7280; }
      `}</style>
    </div>
  )
}

/* ── Stepper ─────────────────────────────────────────────────────────── */
const Stepper = ({ steps, stepIdx }) => (
  <div className="flex items-center px-7 py-4 border-b border-gray-200 bg-white shrink-0 gap-2 overflow-x-auto">
    {steps.map(({ key, label, icon: Icon }, i) => {
      const done   = i < stepIdx
      const active = i === stepIdx
      return (
        <div key={key} className="flex items-center gap-2 flex-1 min-w-[90px]">
          <div className={`flex items-center gap-2 ${active ? '' : 'opacity-70'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold transition-colors ${
              done ? 'bg-success text-white' : active ? 'bg-navy text-white' : 'bg-gray-100 text-tertiary'
            }`}>
              {done ? <TbCheck style={{ fontSize: 14 }} /> : <Icon style={{ fontSize: 14 }} />}
            </div>
            <span className={`text-[13px] font-medium whitespace-nowrap ${
              active ? 'text-gray-900' : done ? 'text-success' : 'text-tertiary'
            }`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px ${i < stepIdx ? 'bg-success' : 'bg-gray-200'}`} />
          )}
        </div>
      )
    })}
  </div>
)

/* ── Step: Application (4-way flow picker) ───────────────────────────── */
const StepApplication = ({ form, set, setMany, onLoadingChange, onBulkUploaded }) => {
  const handleFullJson = data => {
    setMany({
      ...data,
      loanType: data.loanType || form.loanType,
    })
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="What are we setting up?"
        hint="Pick the type of engagement — this controls which documents we'll need."
      />

      <div className="grid grid-cols-2 gap-3">
        {FLOW_KEYS.map(k => {
          const f = FLOWS[k]
          const Icon = f.icon
          const active = form.flowKey === k
          return (
            <button
              key={k}
              type="button"
              onClick={() => set('flowKey', k)}
              className={`text-left px-4 py-4 rounded-xl border transition-all ${
                active
                  ? `${f.accent.border} ${f.accent.bg} shadow-sm`
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? `${f.accent.text} ${f.accent.bg}` : 'bg-gray-100 text-secondary'}`}>
                  <Icon style={{ fontSize: 20 }} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[14px] font-semibold leading-tight ${active ? f.accent.text : 'text-gray-900'}`}>
                    {f.label}
                  </p>
                  <p className="text-[11.5px] text-secondary mt-1 leading-snug">{f.desc}</p>
                </div>
              </div>

              {/* Required doc count */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Pill icon={TbId}          count={f.identity.filter(d => d.required).length}   label="Identity" />
                <Pill icon={TbReportMoney} count={f.financials.filter(d => d.required).length} label="Financials" />
                {f.showLoanDetails && <Pill icon={TbCash} count={1} label="Loan" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Bulk JSON import */}
      <div className="pt-2">
        <Label>Quick import (optional)</Label>
        <DocumentUpload
          title="Upload complete client JSON"
          hint="Drop a full client file (e.g. sam-mitchell.json) to auto-fill every section AND satisfy mandatory docs."
          accept="application/json,.json"
          onExtracted={handleFullJson}
          parseJson={parseFullClientJson}
          onLoadingChange={onLoadingChange}
          onSuccess={onBulkUploaded}
        />
      </div>
    </div>
  )
}

const Pill = ({ icon: Icon, count, label }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-white border border-gray-200 text-secondary">
    <Icon style={{ fontSize: 11 }} />
    <span className="text-gray-900">{count}</span>
    {label}
  </span>
)

/* ── Reusable doc step body ──────────────────────────────────────────── */
const StepDocs = ({
  title, hint, docs, uploaded, touched, missing,
  setMany, markUploaded, onLoadingChange, isExtracting, children,
}) => (
  <div className="space-y-5">
    <SectionHeader title={title} hint={hint} />

    <div className="space-y-3">
      {docs.map(doc => {
        const parser = doc.parser ? PARSERS[doc.parser] : undefined
        const sch    = doc.sch    ? SCH[doc.sch]       : null
        return (
          <DocumentUpload
            key={doc.key}
            title={doc.title}
            hint={doc.hint}
            required={!!doc.required}
            prompt={sch?.prompt}
            schema={sch?.schema}
            parseJson={parser}
            onExtracted={parser ? setMany : (() => {})}
            onSuccess={() => markUploaded(doc.key)}
            onLoadingChange={onLoadingChange}
          />
        )
      })}
    </div>

    {touched && missing.length > 0 && <DocMissingBanner missing={missing} />}

    {children && <EditableHint isExtracting={isExtracting} />}
    {children}
  </div>
)

/* ── Identity manual fields ──────────────────────────────────────────── */
const IdentityFields = ({ form, set, touched, isBusiness, isExtracting }) => (
  <FieldsLock locked={isExtracting} className="grid grid-cols-2 gap-4">
    <Field label="Full name" required error={touched && form.fullName.trim().length < 2 ? 'Required' : null}>
      <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="e.g. Sam Mitchell" className="ac-input" />
    </Field>

    <Field label="Date of birth">
      <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className="ac-input" />
    </Field>

    <Field label="ID number">
      <input value={form.idNumber} onChange={e => set('idNumber', e.target.value)} placeholder="National ID / passport / EIN" className="ac-input" />
    </Field>

    <Field label="Nationality / jurisdiction">
      <input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. US Citizen / Delaware C-Corp" className="ac-input" />
    </Field>

    <Field label="Address" wide>
      <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street, City, State, ZIP" className="ac-input" />
    </Field>

    <Field label="Email" required error={touched && !/\S+@\S+\.\S+/.test(form.email) ? 'Enter a valid email' : null}>
      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@example.com" className="ac-input" />
    </Field>

    <Field label="Phone">
      <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 (555) 123-4567" className="ac-input" />
    </Field>

    {isBusiness && (
      <Field
        label="Company name"
        required
        error={touched && form.company.trim().length < 2 ? 'Required' : null}
        wide
      >
        <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Mitchell Holdings LLC" className="ac-input" />
      </Field>
    )}

    <Field label="Location (city, state)" wide>
      <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" className="ac-input" />
    </Field>
  </FieldsLock>
)

/* ── Financials manual fields ────────────────────────────────────────── */
const FinancialsFields = ({ form, set, isExtracting, isBusiness }) => (
  <FieldsLock locked={isExtracting} className="grid grid-cols-2 gap-4">
    <Field label={isBusiness ? 'Operating entity' : 'Employer'}>
      <input value={form.employer} onChange={e => set('employer', e.target.value)} placeholder={isBusiness ? 'Trading entity name' : 'Company name'} className="ac-input" />
    </Field>
    <Field label={isBusiness ? 'Industry / sector' : 'Job title'}>
      <input value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder={isBusiness ? 'e.g. Manufacturing' : 'e.g. Senior Engineer'} className="ac-input" />
    </Field>
    <Field label={isBusiness ? 'Monthly revenue (USD)' : 'Monthly gross income (USD)'}>
      <input type="number" value={form.monthlyGross} onChange={e => set('monthlyGross', e.target.value)} placeholder="0" className="ac-input" />
    </Field>
    <Field label={isBusiness ? 'Monthly net income (USD)' : 'Monthly net income (USD)'}>
      <input type="number" value={form.monthlyNet} onChange={e => set('monthlyNet', e.target.value)} placeholder="0" className="ac-input" />
    </Field>
    <Field label={isBusiness ? 'Years in business' : 'Years employed'}>
      <input type="number" value={form.yearsEmployed} onChange={e => set('yearsEmployed', e.target.value)} placeholder="0" className="ac-input" />
    </Field>
    <Field label="Credit score">
      <input type="number" value={form.creditScore} onChange={e => set('creditScore', e.target.value)} placeholder="300 – 850" className="ac-input" />
    </Field>

    <Field label="Bank">
      <input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="e.g. SunTrust" className="ac-input" />
    </Field>
    <Field label="Account holder">
      <input value={form.accountHolder} onChange={e => set('accountHolder', e.target.value)} placeholder="Name on account" className="ac-input" />
    </Field>
    <Field label="Statement period">
      <input value={form.statementPeriod} onChange={e => set('statementPeriod', e.target.value)} placeholder="e.g. Mar 2026 – May 2026" className="ac-input" />
    </Field>
    <Field label="Avg monthly credit (USD)">
      <input type="number" value={form.averageMonthlyCredit} onChange={e => set('averageMonthlyCredit', e.target.value)} placeholder="0" className="ac-input" />
    </Field>
    <Field label="Avg monthly debit (USD)">
      <input type="number" value={form.averageMonthlyDebit} onChange={e => set('averageMonthlyDebit', e.target.value)} placeholder="0" className="ac-input" />
    </Field>
    <Field label="Avg closing balance (USD)">
      <input type="number" value={form.averageClosingBalance} onChange={e => set('averageClosingBalance', e.target.value)} placeholder="0" className="ac-input" />
    </Field>

    <Field label="Internal notes" wide>
      <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Optional context for the analyst team…" className="ac-input resize-none" />
    </Field>
  </FieldsLock>
)

/* ── Step: Loan request ──────────────────────────────────────────────── */
const StepLoanRequest = ({ form, set, touched }) => {
  const isHomeLoan = form.loanType === 'Home loan'
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Loan request"
        hint="Capture what the applicant is borrowing and the proposed terms."
      />

      <Field label="Loan type">
        <div className="grid grid-cols-4 gap-2.5">
          {LOAN_TYPES.map(lt => {
            const active = form.loanType === lt
            return (
              <button
                key={lt}
                type="button"
                onClick={() => set('loanType', lt)}
                className={`px-3 py-2 rounded-lg border text-[12.5px] font-medium transition-colors ${
                  active
                    ? 'border-blue-action bg-blue-50 text-blue-action'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {lt}
              </button>
            )
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Loan amount (USD)" required error={touched && !(Number(form.loanAmount) > 0) ? 'Required' : null}>
          <input type="number" value={form.loanAmount} onChange={e => set('loanAmount', e.target.value)} placeholder="0" className="ac-input" />
        </Field>
        <Field label="Term (years)">
          <input type="number" value={form.loanTermYears} onChange={e => set('loanTermYears', e.target.value)} placeholder="e.g. 30" className="ac-input" />
        </Field>

        <Field label="Loan purpose" wide>
          <input value={form.loanPurpose} onChange={e => set('loanPurpose', e.target.value)} placeholder="e.g. Purchase primary residence" className="ac-input" />
        </Field>

        {isHomeLoan && (
          <>
            <Field label="Property address" wide>
              <input value={form.propertyAddress} onChange={e => set('propertyAddress', e.target.value)} placeholder="Property street, city, state" className="ac-input" />
            </Field>
            <Field label="Property value (USD)" wide>
              <input type="number" value={form.propertyValue} onChange={e => set('propertyValue', e.target.value)} placeholder="0" className="ac-input" />
            </Field>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Step: Review ────────────────────────────────────────────────────── */
const StepReview = ({ form, flow, steps, uploaded, onJump }) => {
  const fmt  = v => (v === '' || v == null) ? '—' : String(v)
  const fmt$ = v => (v === '' || v == null || Number(v) === 0) ? '—' : `$${Number(v).toLocaleString()}`
  const indexOf = key => steps.findIndex(s => s.key === key)
  const isBusiness = flow.derives.clientType === 'business'
  const isLoan     = flow.derives.applicationType === 'loan'

  const docState = doc => uploaded[doc.key]
    ? { label: 'Uploaded', cls: 'text-success bg-green-50 border-green-200' }
    : doc.required
      ? { label: 'Missing', cls: 'text-error bg-red-50 border-red-200' }
      : { label: 'Skipped', cls: 'text-tertiary bg-gray-100 border-gray-200' }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Review & confirm"
        hint="Double-check details before creating the client. Use Edit to jump back."
      />

      <Section title="Application" onEdit={() => onJump(indexOf('application'))}>
        <KV label="Flow"        value={flow.label} />
        <KV label="Client type" value={isBusiness ? 'Business' : 'Individual'} />
      </Section>

      <Section title="Identity" onEdit={() => onJump(indexOf('identity'))}>
        <KV label="Full name"     value={fmt(form.fullName)} />
        {isBusiness && <KV label="Company" value={fmt(form.company)} />}
        <KV label="Email"         value={fmt(form.email)} />
        <KV label="Phone"         value={fmt(form.phone)} />
        <KV label="Date of birth" value={fmt(form.dateOfBirth)} />
        <KV label="ID number"     value={fmt(form.idNumber)} />
        <KV label="Address"       value={fmt(form.address)} wide />
      </Section>

      <Section title="Financials" onEdit={() => onJump(indexOf('financials'))}>
        <KV label={isBusiness ? 'Operating entity' : 'Employer'} value={fmt(form.employer)} />
        <KV label={isBusiness ? 'Sector' : 'Job title'}         value={fmt(form.jobTitle)} />
        <KV label={isBusiness ? 'Monthly revenue' : 'Monthly gross'} value={fmt$(form.monthlyGross)} />
        <KV label="Monthly net"   value={fmt$(form.monthlyNet)} />
        <KV label="Bank"          value={fmt(form.bankName)} />
        <KV label="Avg balance"   value={fmt$(form.averageClosingBalance)} />
        {form.notes && <KV label="Notes" value={form.notes} wide />}
      </Section>

      {isLoan && (
        <Section title="Loan request" onEdit={() => onJump(indexOf('loanRequest'))}>
          <KV label="Loan type" value={fmt(form.loanType)} />
          <KV label="Amount"    value={fmt$(form.loanAmount)} />
          <KV label="Term"      value={form.loanTermYears ? `${form.loanTermYears} years` : '—'} />
          <KV label="Purpose"   value={fmt(form.loanPurpose)} wide />
        </Section>
      )}

      {/* Document checklist */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[13.5px] font-semibold text-gray-900">Document checklist</h4>
          <span className="text-[11px] text-tertiary">
            {Object.keys(uploaded).filter(k => uploaded[k]).length} uploaded
          </span>
        </div>

        <DocList title="Mandatory" docs={[...flow.identity, ...flow.financials].filter(d => d.required)} docState={docState} />
        {flow.additional.length > 0 && (
          <DocList title="Optional" docs={flow.additional} docState={docState} className="mt-4" />
        )}
      </div>
    </div>
  )
}

const DocList = ({ title, docs, docState, className = '' }) => (
  <div className={className}>
    <p className="text-[11px] text-tertiary uppercase tracking-wider mb-2">{title}</p>
    <div className="space-y-1.5">
      {docs.map(doc => {
        const st = docState(doc)
        return (
          <div key={doc.key} className="flex items-center justify-between text-[12.5px] gap-3">
            <span className="text-gray-800 truncate">{doc.title}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${st.cls} shrink-0`}>
              {st.label}
            </span>
          </div>
        )
      })}
    </div>
  </div>
)

/* ── Atoms ───────────────────────────────────────────────────────────── */

const FieldsLock = ({ locked, className = '', children }) => (
  <fieldset
    disabled={locked}
    className={`${className} transition-opacity ${locked ? 'opacity-50 pointer-events-none' : ''}`}
  >
    {children}
  </fieldset>
)

const DocMissingBanner = ({ missing }) => (
  <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-error">
    <TbAlertTriangle style={{ fontSize: 14, marginTop: 1 }} className="shrink-0" />
    <div className="text-[12px] leading-snug">
      <p className="font-semibold">{missing.length} mandatory document{missing.length > 1 ? 's' : ''} still required:</p>
      <ul className="mt-1 list-disc list-inside opacity-90">
        {missing.map(d => <li key={d.key}>{d.title}</li>)}
      </ul>
    </div>
  </div>
)

const EditableHint = ({ isExtracting }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
    isExtracting
      ? 'bg-blue-50 text-blue-action border border-blue-100'
      : 'bg-amber-50 text-amber-700 border border-amber-100'
  }`}>
    {isExtracting ? (
      <>
        <TbLoaderInline />
        <span>AI is reading the document — fields below will populate in a moment…</span>
      </>
    ) : (
      <>
        <TbEdit style={{ fontSize: 13 }} />
        <span>Fields below are editable — override anything AI got wrong.</span>
      </>
    )}
  </div>
)

const TbLoaderInline = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" className="animate-spin">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="14 28" strokeLinecap="round" />
  </svg>
)

const SectionHeader = ({ title, hint }) => (
  <div>
    <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
    <p className="text-[12.5px] text-secondary mt-0.5 flex items-center gap-1.5">
      <TbSparkles className="text-blue-action" style={{ fontSize: 12 }} />
      {hint}
    </p>
  </div>
)

const Label = ({ children }) => (
  <p className="block text-[12px] font-medium text-gray-700 mb-2">{children}</p>
)

const Field = ({ label, required, error, wide, children }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <p className="block text-[12px] font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-error">*</span>}
    </p>
    {children}
    {error && <p className="text-[11px] text-error mt-1">{error}</p>}
  </div>
)

const Section = ({ title, onEdit, children }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[13.5px] font-semibold text-gray-900">{title}</h4>
      <button
        onClick={onEdit}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11.5px] font-medium text-blue-action hover:bg-blue-50 rounded-md transition-colors"
      >
        <TbEdit style={{ fontSize: 12 }} /> Edit
      </button>
    </div>
    <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
      {children}
    </div>
  </div>
)

const KV = ({ label, value, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <p className="text-[11px] text-tertiary uppercase tracking-wider">{label}</p>
    <p className="text-[13px] text-gray-900 mt-0.5 break-words">{value}</p>
  </div>
)

AddClientModal.propTypes = {
  open:    PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave:  PropTypes.func.isRequired,
}

export default AddClientModal
