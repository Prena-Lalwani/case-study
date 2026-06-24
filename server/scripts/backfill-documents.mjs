#!/usr/bin/env node
/* Backfill Document rows for clients that have none.

   Scans mock-data/clients/<flow>/<slug>/ folders, reads each manifest +
   document JSON files, and matches them to DB clients by normalized name
   (comparing against the national-id fullName, then the folder slug).

   Safe to re-run: skips a (client, docType) pair that already exists.

   Usage:  node server/scripts/backfill-documents.mjs                        */

import { PrismaClient } from '@prisma/client'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const __dirname = dirname(fileURLToPath(import.meta.url))
const CLIENTS_ROOT = join(__dirname, '..', '..', 'mock-data', 'clients')

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')

// docType used in manifest → canonical docType we store
const DOC_TYPE_MAP = {
  'national-id':         'national-id',
  'salary-slip':         'salary-slip',
  'bank-statement':      'bank-statement',
  'corporate-bank-statement': 'corporate-bank-statement',
  'personal-tax-return': 'tax-return',
  'tax-return':          'tax-return',
  'business-license':    'business-license',
  'financial-statement': 'financial-statement',
  'credit-report':       'credit-report',
}
// These are intake forms, not "documents" — skip.
const SKIP = new Set(['manifest', 'advisory-request', 'loan-request', 'application-request'])

const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return null } }

// Walk all folders, build [{ slug, flow, fullName, dir, docFiles }]
const scanMockFolders = () => {
  const out = []
  if (!existsSync(CLIENTS_ROOT)) return out
  for (const flow of readdirSync(CLIENTS_ROOT, { withFileTypes: true })) {
    if (!flow.isDirectory()) continue
    const flowDir = join(CLIENTS_ROOT, flow.name)
    for (const slug of readdirSync(flowDir, { withFileTypes: true })) {
      if (!slug.isDirectory()) continue
      const dir = join(flowDir, slug.name)
      const files = readdirSync(dir).filter(f => f.endsWith('.json'))
      const nid = readJson(join(dir, 'national-id.json'))
      out.push({
        slug: slug.name,
        flow: flow.name,
        fullName: nid?.fullName ?? null,
        dir,
        docFiles: files.map(f => f.replace(/\.json$/, '')).filter(n => !SKIP.has(n)),
      })
    }
  }
  return out
}

const main = async () => {
  const folders = scanMockFolders()
  console.log(`Scanned ${folders.length} mock client folders.`)

  const clients = await prisma.client.findMany({
    select: { id: true, legacyId: true, name: true, _count: { select: { documents: true } } },
  })

  let createdTotal = 0
  for (const c of clients) {
    // Match by full name first, then by slug-from-name.
    const cKey = norm(c.name)
    const match = folders.find(f => norm(f.fullName) === cKey)
              ?? folders.find(f => norm(f.slug) === cKey)
              ?? folders.find(f => cKey && norm(f.fullName).includes(cKey))
              ?? folders.find(f => cKey && cKey.includes(norm(f.slug)))

    if (!match) {
      console.log(`  • ${c.legacyId} ${c.name}: no mock folder match (has ${c._count.documents} docs) — skipped`)
      continue
    }

    let created = 0
    for (const docName of match.docFiles) {
      const docType = DOC_TYPE_MAP[docName] ?? docName
      const exists = await prisma.document.findFirst({ where: { clientId: c.id, docType } })
      if (exists) continue

      const parsed = readJson(join(match.dir, `${docName}.json`))
      if (!parsed) continue

      await prisma.document.create({
        data: {
          clientId:     c.id,
          docType,
          filename:     `${docName}.json`,
          mimeType:     'application/json',
          fileDataUrl:  null,            // mock docs are structured JSON, no original image
          parsedJson:   parsed,
          uploadSource: 'json',
          aiConfidence: parsed.aiConfidence ?? null,
          status:       parsed.status ?? 'verified',
        },
      })
      created++
      createdTotal++
    }
    console.log(`  ✓ ${c.legacyId} ${c.name} ← ${match.flow}/${match.slug}: +${created} docs`)
  }

  console.log(`\nDone. Created ${createdTotal} document row(s).`)
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
