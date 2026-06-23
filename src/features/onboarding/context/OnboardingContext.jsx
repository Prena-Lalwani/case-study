import { createContext, useReducer, useEffect } from 'react'
import { authService } from '../../auth/services/authService'

/* ─── localStorage persistence ───────────────────────────────────────
 * Saves the full onboarding state on every change so refreshing the
 * page never loses progress. Blob preview URLs are stripped before
 * saving because they're invalid after a page reload.
 * ─────────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'mw_onboarding_state'

const saveState = (state) => {
  try {
    const toPersist = {
      ...state,
      // Blob URLs (createObjectURL) die on refresh — strip them
      documents: Object.fromEntries(
        Object.entries(state.documents).map(([k, v]) => [k, { ...v, preview: null }])
      ),
      // Always rerun KYC review on step 4 mount, so don't persist in-flight status
      kycReview: { status: null, result: null, error: null },
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
  } catch {
    // localStorage unavailable (private mode, quota exceeded) — fail silently
  }
}

const loadPersistedState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/* ─── Initial state factory ──────────────────────────────────────────
 * Called once on mount (lazy useReducer initialiser).
 * Merges localStorage data with the auth-seeded baseline so:
 *   - The current user's name/email always reflects the auth token
 *   - Everything else (documents, answers, identity) is restored
 * ─────────────────────────────────────────────────────────────────── */
const buildInitialState = () => {
  const _authUser = authService.getUser()

  const base = {
    personalInfo: {
      fullName: _authUser?.fullName ?? '',
      dob:      '',
      address:  '',
      email:    _authUser?.email ?? '',
      phone:    '',
      ssn:      '',
    },
    identity: {
      method:             'biometric',
      verificationStatus: 'idle',
      steps:              [],
    },
    documents: {
      govId:          { status: null, fileName: null, fileSize: null, preview: null },
      proofOfAddress: { status: null, fileName: null, fileSize: null, preview: null },
      bankStatement:  { status: null, fileName: null, fileSize: null, preview: null },
    },
    riskAnswers:        {},   // no pre-seeded answers
    aiConfidence:       {},
    aiValidationErrors: {},
    kycReview:          { status: null, result: null, error: null },
    completedSteps:     [],
  }

  const saved = loadPersistedState()
  if (!saved) return base

  return {
    ...base,
    ...saved,
    // Always use the current auth user's identity fields
    personalInfo: {
      ...saved.personalInfo,
      fullName: _authUser?.fullName ?? saved.personalInfo?.fullName ?? '',
      email:    _authUser?.email    ?? saved.personalInfo?.email    ?? '',
    },
    // kycReview always starts fresh (hook reruns on step 4 mount)
    kycReview: { status: null, result: null, error: null },
  }
}

/* ─── Reducer ────────────────────────────────────────────────────────
 * All state changes for the entire onboarding flow live here.
 * ─────────────────────────────────────────────────────────────────── */
const onboardingReducer = (state, action) => {
  switch (action.type) {

    case 'UPDATE_PERSONAL_INFO':
      return {
        ...state,
        personalInfo:       { ...state.personalInfo, [action.field]: action.value },
        aiConfidence:       { ...state.aiConfidence,       [action.field]: 0  },
        aiValidationErrors: { ...state.aiValidationErrors, [action.field]: '' },
      }

    case 'FILL_PERSONAL_INFO_FROM_AI': {
      const values     = {}
      const confidence = {}
      const errors     = {}
      Object.entries(action.fields).forEach(([key, field]) => {
        if (field?.value?.trim()) values[key] = field.value
        confidence[key] = field?.confidence    ?? 0
        errors[key]     = field?.validationError ?? ''
      })
      return {
        ...state,
        personalInfo:       { ...state.personalInfo, ...values },
        aiConfidence:       { ...state.aiConfidence, ...confidence },
        aiValidationErrors: { ...state.aiValidationErrors, ...errors },
      }
    }

    case 'SET_IDENTITY_METHOD':
      return {
        ...state,
        identity: { ...state.identity, method: action.method, verificationStatus: 'idle', steps: [] },
      }

    case 'SET_VERIFICATION_STATUS':
      return { ...state, identity: { ...state.identity, verificationStatus: action.status } }

    case 'SET_VERIFICATION_STEPS':
      return { ...state, identity: { ...state.identity, steps: action.steps } }

    case 'SET_DOCUMENT_RECEIVED':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.slot]: {
            status:   'received',
            fileName: action.fileName ?? null,
            fileSize: action.fileSize ?? null,
            preview:  action.preview  ?? null,
          },
        },
      }

    case 'CLEAR_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.slot]: { status: null, fileName: null, fileSize: null, preview: null },
        },
      }

    case 'SET_RISK_ANSWER':
      return {
        ...state,
        riskAnswers: { ...state.riskAnswers, [action.questionNum]: action.answer },
      }

    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.step)) return state
      return { ...state, completedSteps: [...state.completedSteps, action.step] }

    case 'SET_KYC_REVIEW_LOADING':
      return { ...state, kycReview: { status: 'loading', result: null, error: null } }

    case 'SET_KYC_REVIEW_RESULT':
      return { ...state, kycReview: { status: 'done', result: action.result, error: null } }

    case 'SET_KYC_REVIEW_ERROR':
      return { ...state, kycReview: { status: 'error', result: null, error: action.error } }

    case 'LOAD_FROM_DB': {
      const { legalName, dob, address, phone, ssn } = action.data
      return {
        ...state,
        personalInfo: {
          ...state.personalInfo,
          ...(legalName && { fullName: legalName }),
          ...(dob       && { dob }),
          ...(address   && { address }),
          ...(phone     && { phone }),
          ...(ssn       && { ssn }),
        },
      }
    }

    default:
      return state
  }
}

/* ─── Context + Provider ─────────────────────────────────────────── */
export const OnboardingContext = createContext(null)

export const OnboardingProvider = ({ children }) => {
  // Lazy initialiser — buildInitialState() runs once on mount only
  const [state, dispatch] = useReducer(onboardingReducer, undefined, buildInitialState)

  // Persist to localStorage on every state change
  useEffect(() => {
    saveState(state)
  }, [state])

  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  )
}
