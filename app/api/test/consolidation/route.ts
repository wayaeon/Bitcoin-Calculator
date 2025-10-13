/**
 * API Endpoint: /api/test/consolidation
 * Test endpoint for manually triggering and testing data consolidation
 * Only for development and testing purposes
 */

import { NextRequest, NextResponse } from 'next/server'
import { consolidateRealtimeData, getConsolidationStatus } from '@/lib/btc-data-consolidator'
import { collectAndSaveRealtimeData } from '@/lib/btc-realtime-collector'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'status'

  try {
    switch (action) {
      case 'status':
        // Get current status
        const status = await getConsolidationStatus()
        return NextResponse.json({
          action: 'status',
          result: status,
          timestamp: new Date().toISOString()
        })

      case 'collect':
        // Manually trigger realtime data collection
        const collectResult = await collectAndSaveRealtimeData()
        return NextResponse.json({
          action: 'collect',
          result: collectResult,
          timestamp: new Date().toISOString()
        })

      case 'consolidate':
        // Manually trigger consolidation
        const consolidateResult = await consolidateRealtimeData()
        return NextResponse.json({
          action: 'consolidate',
          result: consolidateResult,
          timestamp: new Date().toISOString()
        })

      case 'full':
        // Run full pipeline: collect then consolidate
        const fullCollect = await collectAndSaveRealtimeData()
        if (!fullCollect.success) {
          return NextResponse.json({
            action: 'full',
            step: 'collect',
            error: fullCollect.error,
            timestamp: new Date().toISOString()
          }, { status: 500 })
        }

        const fullConsolidate = await consolidateRealtimeData()
        return NextResponse.json({
          action: 'full',
          collectResult: fullCollect,
          consolidateResult: fullConsolidate,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['status', 'collect', 'consolidate', 'full'],
          usage: '/api/test/consolidation?action=status',
          timestamp: new Date().toISOString()
        }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Test consolidation error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST method as well
export async function POST(request: NextRequest) {
  return GET(request)
}

