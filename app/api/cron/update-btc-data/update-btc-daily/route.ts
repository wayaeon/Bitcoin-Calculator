/**
 * API Endpoint: /api/cron/update-btc-daily
 * Consolidates realtime data into historical CSV
 * Called by Vercel Cron: 0 7,19 * * * (7 AM and 7 PM UTC)
 */

import { NextRequest, NextResponse } from 'next/server'
import { consolidateRealtimeData } from '@/lib/btc-data-consolidator'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Daily consolidation triggered')
    
    const result = await consolidateRealtimeData()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        stats: result.stats,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[API] Daily consolidation error:', error)
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

