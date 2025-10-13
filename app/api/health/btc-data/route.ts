/**
 * API Endpoint: /api/health/btc-data
 * Health check for BTC data pipeline
 * Returns status of data collection and consolidation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getConsolidationStatus } from '@/lib/btc-data-consolidator'
import { getCachedData } from '@/lib/btc-realtime-collector'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Get consolidation status
    const consolidationStatus = await getConsolidationStatus()
    
    // Get cached realtime data
    const cachedData = getCachedData()
    
    // Check if files exist
    const realtimePath = path.join(process.cwd(), 'public', 'BTC_Realtime_Data.csv')
    const historicalPath = path.join(process.cwd(), 'public', 'BTC Price History copy.csv')
    
    let realtimeFileExists = false
    let historicalFileExists = false
    let realtimeFileSize = 0
    let historicalFileSize = 0
    
    try {
      const realtimeStat = await fs.stat(realtimePath)
      realtimeFileExists = true
      realtimeFileSize = realtimeStat.size
    } catch (error) {
      // File doesn't exist
    }
    
    try {
      const historicalStat = await fs.stat(historicalPath)
      historicalFileExists = true
      historicalFileSize = historicalStat.size
    } catch (error) {
      // File doesn't exist
    }

    // Calculate overall health
    const isHealthy = 
      realtimeFileExists && 
      historicalFileExists && 
      consolidationStatus.status !== 'error'

    return NextResponse.json({
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
      consolidation: consolidationStatus,
      realtimeData: {
        cached: cachedData !== null,
        lastPrice: cachedData?.price,
        lastUpdate: cachedData?.updated_at,
        fileExists: realtimeFileExists,
        fileSize: realtimeFileSize
      },
      historicalData: {
        fileExists: historicalFileExists,
        fileSize: historicalFileSize
      }
    })
  } catch (error) {
    console.error('[API] Health check error:', error)
    return NextResponse.json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

