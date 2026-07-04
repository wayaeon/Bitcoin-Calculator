/**
 * API Endpoint: /api/cron/update-btc-realtime
 * Collects current Bitcoin price data every 5 minutes
 * Called by Vercel Cron: every 5 minutes (see vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { collectAndSaveRealtimeData } from '@/lib/btc-realtime-collector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Realtime collection triggered')
    
    const result = await collectAndSaveRealtimeData()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Realtime BTC data collected successfully',
        source: result.source,
        data: result.data,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to collect realtime data',
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[API] Realtime collection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST method as well for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

