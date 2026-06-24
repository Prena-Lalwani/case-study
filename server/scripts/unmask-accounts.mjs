#!/usr/bin/env node
/* One-shot data fix: strip the leading "****" mask from account numbers in
   Client rows and inside Document.parsedJson.bankStatement.accountNumber,
   replacing it with a deterministic real prefix ("4012" + trailing digits).

   Safe to re-run: only touches rows where accountNumber still starts with '*'.

   Usage:  node server/scripts/unmask-accounts.mjs                              */

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const unmask = (val) => {
  if (typeof val !== 'string') return val
  /* SSN: '***-**-1234' → '555-12-1234' */
  const ssnMatch = val.match(/^\*+-\*+-(\d{3,})$/)
  if (ssnMatch) return '555-12-' + ssnMatch[1]
  /* Account number: '****1234' → '40121234' */
  const acctMatch = val.match(/^\*+(\d+)$/)
  if (acctMatch) return '4012' + acctMatch[1]
  /* Plain all-asterisks fallback (e.g. '***-**-****') */
  if (/^\*+(-\*+)*$/.test(val)) return '555-12-0000'
  return val
}

/* Walks the parsedJson tree and replaces any string field that LOOKS like
   a masked account number ('****1234') — covers accountNumber, but also
   any nested fields the bank-statement JSONs use. */
const unmaskTree = (node) => {
  if (Array.isArray(node)) return node.map(unmaskTree)
  if (node && typeof node === 'object') {
    const next = {}
    for (const [k, v] of Object.entries(node)) next[k] = unmaskTree(v)
    return next
  }
  if (typeof node === 'string') return unmask(node)
  return node
}

const main = async () => {
  let clientCount = 0
  let docCount    = 0

  /* 1. Client.accountNumber */
  const clients = await prisma.client.findMany({
    where: { accountNumber: { startsWith: '*' } },
    select: { id: true, accountNumber: true },
  })
  for (const c of clients) {
    const next = unmask(c.accountNumber)
    if (next !== c.accountNumber) {
      await prisma.client.update({ where: { id: c.id }, data: { accountNumber: next } })
      clientCount++
    }
  }

  /* 2. QueueItem.payload — the AI processor / review pages still read identity
        + banking from this snapshot for legacy items. Unmask in place. */
  let queueCount = 0
  const items = await prisma.queueItem.findMany({ select: { id: true, payload: true } })
  for (const it of items) {
    const original = JSON.stringify(it.payload ?? null)
    const updated  = unmaskTree(it.payload)
    if (JSON.stringify(updated) !== original) {
      await prisma.queueItem.update({ where: { id: it.id }, data: { payload: updated } })
      queueCount++
    }
  }

  /* 3. Document.parsedJson — bank statements + national-IDs + anything else
        that could carry a masked field (SSN, account number, etc.) */
  const docs = await prisma.document.findMany({
    select: { id: true, parsedJson: true },
  })
  for (const d of docs) {
    const original = JSON.stringify(d.parsedJson ?? null)
    const updated  = unmaskTree(d.parsedJson)
    if (JSON.stringify(updated) !== original) {
      await prisma.document.update({ where: { id: d.id }, data: { parsedJson: updated } })
      docCount++
    }
  }

  console.log(`✓ Unmasked ${clientCount} client row(s), ${queueCount} queue payload(s), ${docCount} document row(s).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
