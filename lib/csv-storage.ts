/**
 * CSV persistence shim.
 *
 * Vercel's serverless functions have a read-only filesystem at runtime, so writes to
 * public/*.csv silently fail in production (EROFS). Locally there's no Blob token, so
 * we keep reading/writing the real files on disk — zero change to dev workflow.
 *
 * In production (BLOB_READ_WRITE_TOKEN present), the same pathname is stored in
 * Vercel Blob instead, which is the actual fix for prices not persisting on Vercel.
 */
import { promises as fs } from 'fs'
import { put, head } from '@vercel/blob'

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

export async function readStoredCSV(pathname: string, localPath: string): Promise<string> {
  if (useBlob) {
    try {
      const info = await head(pathname)
      const res = await fetch(info.url, { cache: 'no-store' })
      return res.ok ? await res.text() : ''
    } catch {
      return '' // not created yet
    }
  }
  try {
    return await fs.readFile(localPath, 'utf-8')
  } catch {
    return ''
  }
}

export async function writeStoredCSV(pathname: string, content: string, localPath: string): Promise<void> {
  if (useBlob) {
    await put(pathname, content, { access: 'public', contentType: 'text/csv', allowOverwrite: true })
    return
  }
  await fs.writeFile(localPath, content, 'utf-8')
}

export async function getStoredCSVUpdatedAt(pathname: string, localPath: string): Promise<string | null> {
  if (useBlob) {
    try {
      const info = await head(pathname)
      return info.uploadedAt instanceof Date ? info.uploadedAt.toISOString() : String(info.uploadedAt)
    } catch {
      return null
    }
  }
  try {
    const stats = await fs.stat(localPath)
    return stats.mtime.toISOString()
  } catch {
    return null
  }
}
