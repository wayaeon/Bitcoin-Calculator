#!/usr/bin/env node
/**
 * One-time seed: uploads the existing local CSVs into Vercel Blob under the
 * exact pathnames lib/csv-storage.ts reads from, so production doesn't start
 * from an empty dataset once BLOB_READ_WRITE_TOKEN is live.
 *
 * Usage:
 *   1. vercel env pull .env.production.local   (or paste BLOB_READ_WRITE_TOKEN manually)
 *   2. node --env-file=.env.production.local scripts/seed-blob-storage.mjs
 */
import { put } from '@vercel/blob'
import { readFile } from 'fs/promises'
import path from 'path'

const files = [
  { pathname: 'BTC Price History copy.csv', local: 'public/BTC Price History copy.csv' },
  { pathname: 'BTC_Realtime_Data.csv', local: 'public/BTC_Realtime_Data.csv' },
]

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('❌ BLOB_READ_WRITE_TOKEN not set. Run `vercel env pull .env.production.local` first,')
  console.error('   then: node --env-file=.env.production.local scripts/seed-blob-storage.mjs')
  process.exit(1)
}

for (const { pathname, local } of files) {
  try {
    const content = await readFile(path.join(process.cwd(), local), 'utf-8')
    const blob = await put(pathname, content, { access: 'private', contentType: 'text/csv', allowOverwrite: true })
    console.log(`✅ Seeded ${pathname} (${content.length.toLocaleString()} bytes) → ${blob.url}`)
  } catch (err) {
    console.error(`❌ Failed to seed ${pathname}:`, err.message)
  }
}
