import { NextRequest, NextResponse } from 'next/server'
import { BTCRealtimeCSVService, BTCHistoricalCSVService } from '@/lib/btc-realtime-csv-service'

export async function GET(request: NextRequest) {
  try {
    const realtimeService = new BTCRealtimeCSVService()
    const historicalService = new BTCHistoricalCSVService()
    
    // Get stats from both services
    const realtimeStats = await realtimeService.getDataStats()
    const historicalStats = await historicalService.getDataStats()
    
    // Get latest prices
    const latestRealtime = await realtimeService.getLatestPrice()
    const latestHistorical = historicalStats.dateRange.end ? 
      await historicalService.getPricesInRange(
        new Date(historicalStats.dateRange.end), 
        new Date(historicalStats.dateRange.end)
      ) : []
    
    const status = {
      success: true,
      timestamp: new Date().toISOString(),
      realtime: {
        totalRecords: realtimeStats.totalRecords,
        latestPrice: realtimeStats.latestPrice,
        latestTimestamp: realtimeStats.latestTimestamp,
        dataRange: realtimeStats.dataRange,
        isHealthy: realtimeStats.totalRecords > 0,
        latestData: latestRealtime ? {
          price: parseFloat(latestRealtime.price),
          volume: latestRealtime.volume_24h ? parseFloat(latestRealtime.volume_24h) : null,
          marketCap: latestRealtime.market_cap ? parseFloat(latestRealtime.market_cap) : null,
          timestamp: latestRealtime.created_at
        } : null
      },
      historical: {
        totalRecords: historicalStats.totalRecords,
        dateRange: historicalStats.dateRange,
        priceRange: historicalStats.priceRange,
        isHealthy: historicalStats.totalRecords > 0,
        latestData: latestHistorical.length > 0 ? {
          price: latestHistorical[0].price,
          volume: latestHistorical[0].volume,
          marketCap: latestHistorical[0].marketCap,
          timestamp: new Date(latestHistorical[0].timestamp).toISOString()
        } : null
      },
      summary: {
        totalDataPoints: realtimeStats.totalRecords + historicalStats.totalRecords,
        hasRealtimeData: realtimeStats.totalRecords > 0,
        hasHistoricalData: historicalStats.totalRecords > 0,
        isFullyOperational: realtimeStats.totalRecords > 0 && historicalStats.totalRecords > 0
      }
    }
    
    return NextResponse.json(status)
    
  } catch (error) {
    console.error('❌ Error fetching CSV status:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch CSV status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 