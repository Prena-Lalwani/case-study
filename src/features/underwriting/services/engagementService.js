/* Advisory engagement lifecycle actions. */
import { api } from './api.js'

export const confirmAssignment = (engagementId, officer, notes) =>
  api.post(`/advisory-engagements/${engagementId}/confirm`, { officer, notes })

export const reassignAdvisor = (engagementId, newAdvisorId, reason, officer) =>
  api.post(`/advisory-engagements/${engagementId}/reassign`, { newAdvisorId, reason, officer })

export const declineEngagement = (engagementId, reason, officer) =>
  api.post(`/advisory-engagements/${engagementId}/decline`, { reason, officer })

export const getEngagement = (engagementId) =>
  api.get(`/advisory-engagements/${engagementId}`)
