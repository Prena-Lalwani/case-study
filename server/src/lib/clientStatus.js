import { prisma } from '../db.js'

/*
 * Recompute a client's lifecycle status from the AGGREGATE of all their
 * loans + advisory engagements — never from a single decision. This stops
 * "reject one of three loans" flipping the whole client to inactive.
 *
 *   active   — has at least one approved loan or confirmed engagement
 *   pending  — nothing active yet, but something is still in progress
 *   inactive — everything is closed (rejected/declined) and nothing active
 *
 * Pass a transaction client (`tx`) to run inside an interactive $transaction.
 */
const OPEN_LOAN     = ['ai_reviewing', 'needs_review', 'submitted']
const OPEN_ENGAGE   = ['pending', 'proposed']

export const recomputeClientStatus = async (clientId, tx = prisma) => {
  const [loans, engagements] = await Promise.all([
    tx.loanApplication.findMany({ where: { clientId }, select: { status: true } }),
    tx.advisoryEngagement.findMany({ where: { clientId }, select: { status: true } }),
  ])

  const anyActive = loans.some(l => l.status === 'approved')
                 || engagements.some(e => e.status === 'confirmed')
  const anyOpen   = loans.some(l => OPEN_LOAN.includes(l.status))
                 || engagements.some(e => OPEN_ENGAGE.includes(e.status))

  const status = anyActive ? 'active' : anyOpen ? 'pending' : 'inactive'
  await tx.client.update({ where: { id: clientId }, data: { status } })
  return status
}
