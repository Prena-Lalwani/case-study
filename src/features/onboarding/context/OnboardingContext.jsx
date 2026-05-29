import { createContext, useReducer } from 'react'

/* ─── Initial state ──────────────────────────────────────────────────
 * One object that represents everything collected across all steps.
 * Each step page reads from and writes to its own slice of this.
 * ─────────────────────────────────────────────────────────────────── */
const initialState = {
  // Step 1 — Personal info (pre-filled with AI demo values)
  personalInfo: {
    fullName: 'John A. Doe',
    dob:      '14 Mar 1985',
    address:  '142 W 57th St, Apt ___, New York NY 10019',
    email:    'john.doe@meridian-mail.com',
    phone:    '+1 (212) 555 — 0142',
    ssn:      '•••••8421',
  },

  // Step 2 — Which identity verification method the user picked
  identity: {
    method: 'biometric',   // 'biometric' | 'gov-id'
  },

  // Step 3 — How many documents have been uploaded/verified
  documents: {
    uploadedCount: 1,      // Gov ID starts pre-verified
  },

  // Step 5 — Risk quiz answers keyed by question number
  // Q1–Q3 pre-answered for the demo, Q4 starts empty
  riskAnswers: {
    1: 'Capital growth',
    2: '3–7 years',
    3: 'Hold and wait',
  },

  // Tracks which steps the user has explicitly finished
  completedSteps: [],
}

/* ─── Reducer ────────────────────────────────────────────────────────
 * All state changes for the entire onboarding flow live here.
 * Components never touch state directly — they dispatch an action
 * and the reducer decides what changes.
 * ─────────────────────────────────────────────────────────────────── */
const onboardingReducer = (state, action) => {
  switch (action.type) {

    case 'UPDATE_PERSONAL_INFO':
      return {
        ...state,
        personalInfo: { ...state.personalInfo, [action.field]: action.value },
      }

    case 'SET_IDENTITY_METHOD':
      return {
        ...state,
        identity: { ...state.identity, method: action.method },
      }

    case 'INCREMENT_DOCUMENTS':
      return {
        ...state,
        documents: {
          ...state.documents,
          uploadedCount: state.documents.uploadedCount + 1,
        },
      }

    case 'SET_RISK_ANSWER':
      return {
        ...state,
        riskAnswers: { ...state.riskAnswers, [action.questionNum]: action.answer },
      }

    case 'COMPLETE_STEP':
      if (state.completedSteps.includes(action.step)) return state   // idempotent
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.step],
      }

    default:
      return state
  }
}

/* ─── Context + Provider ─────────────────────────────────────────── */
export const OnboardingContext = createContext(null)

export const OnboardingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState)
  return (
    <OnboardingContext.Provider value={{ state, dispatch }}>
      {children}
    </OnboardingContext.Provider>
  )
}

