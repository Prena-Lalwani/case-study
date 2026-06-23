/* Derive the client roster from the existing application data.
 * One client per unique applicant; loan-application metrics are aggregated. */

import applicationDetails from './applicationDetails'
import loanData from '../../../../mock-data/loan-applications.json'

const APPS_BY_ID = Object.fromEntries(loanData.applications.map(a => [a.id, a]))

/* Extract "City, ST" from "99 Heritage Oak Dr, Nashville, TN 37201" */
const cityStateOf = address => {
  if (!address) return ''
  const parts = address.split(',').map(s => s.trim())
  if (parts.length < 3) return parts.join(', ')
  const city  = parts[parts.length - 3]
  const state = (parts[parts.length - 2] || '').split(' ')[0]
  return state ? `${city}, ${state}` : city
}

const buildClient = appIds => {
  const details = applicationDetails[appIds[0]]
  const summaries = appIds.map(id => APPS_BY_ID[id]).filter(Boolean)

  const isBusiness = summaries.some(a => a.loanType === 'Business loan')
  const anyApproved = summaries.some(a => a.status === 'approved')
  const allRejected = summaries.length > 0 && summaries.every(a => a.status === 'auto_rejected')

  const status = anyApproved
    ? 'active'
    : allRejected
      ? 'inactive'
      : 'pending'

  const totalApproved = summaries
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + (a.loanAmount ?? 0), 0)

  const joinedDate = summaries
    .map(a => a.date)
    .filter(Boolean)
    .sort()[0] ?? details.submittedAt?.slice(0, 10) ?? '2026-01-01'

  return {
    id:                'CL-' + appIds[0].replace('APP-', ''),
    name:              details.personalInfo.fullName,
    email:             details.personalInfo.email,
    phone:             details.personalInfo.phone,
    type:              isBusiness ? 'business' : 'individual',
    company:           isBusiness ? details.employment?.employer ?? null : null,
    status,
    location:          cityStateOf(details.personalInfo.address),
    totalApplications: summaries.length,
    totalApproved,
    joinedDate,
  }
}

/* Group application IDs by applicant name (in case anyone has multiple apps) */
const groupAppIdsByName = () => {
  const groups = {}
  for (const id of Object.keys(applicationDetails)) {
    const name = applicationDetails[id].personalInfo.fullName
    if (!groups[name]) groups[name] = []
    groups[name].push(id)
  }
  return Object.values(groups)
}

export const SEED_CLIENTS = groupAppIdsByName()
  .map(buildClient)
  .sort((a, b) => (a.joinedDate > b.joinedDate ? -1 : 1))
