/**
 * API Endpoint: /api/cron/update-currency-rates
 * Refreshes fiat exchange rates (relative to USD) used by the currency selector.
 * Called by Vercel Cron: once daily (see vercel.json)
 */

import { NextResponse } from 'next/server'
import { updateCurrencyRates } from '@/lib/currency-rate-updater'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function handler() {
  try {
    const result = await updateCurrencyRates()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[API] Currency rate update error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() { return handler() }
export async function POST() { return handler() }
