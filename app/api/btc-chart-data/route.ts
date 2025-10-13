import { NextRequest, NextResponse } from 'next/server'
import { BTCRealtimeCSVService, BTCHistoricalCSVService } from '@/lib/btc-realtime-csv-service'
import { getConsolidationStatus } from '@/lib/btc-data-consolidator'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1Y'
    const currency = searchParams.get('currency') || 'USD'
    
    // Calculate date range based on timeRange
    const endDate = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case '1D':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7D':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30D':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90D':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '6mo':
        startDate.setMonth(endDate.getMonth() - 6)
        break
      case '1Y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      case '5Y':
        startDate.setFullYear(endDate.getFullYear() - 5)
        break
      case '10Y':
        startDate.setFullYear(endDate.getFullYear() - 10)
        break
      case 'ALL':
        startDate = new Date('2009-01-01') // Bitcoin started in 2009
        break
      default:
        startDate.setFullYear(endDate.getFullYear() - 1)
    }
    
    console.log(`📊 Fetching BTC data from ${startDate.toISOString()} to ${endDate.toISOString()}`)
    
    let chartData = []
    
    // Use realtime CSV only for 1D (since it doesn't have enough data for 7D/30D)
    if (timeRange === '1D') {
      console.log('📈 Using realtime CSV for 1D range')
      const realtimeService = new BTCRealtimeCSVService()
      const realtimeData = await realtimeService.getPricesInRange(startDate, endDate)
      console.log(`⚡ Found ${realtimeData.length} realtime data points`)
      
      // Limit to max 1000 points for performance
      const limitedRealtimeData = realtimeData.slice(-1000)
      
      chartData = limitedRealtimeData.map(item => ({
        timestamp: item.timestamp,
        price: item.price,
        volume: item.volume,
        marketCap: item.marketCap,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        dataSource: 'csv_realtime'
      }))
    } else {
      // Use historical CSV for all other ranges (7D, 30D, 90D, 1Y, 5Y, 10Y, ALL)
      console.log('📈 Using historical CSV for range:', timeRange)
      const historicalService = new BTCHistoricalCSVService()
      const historicalData = await historicalService.getPricesInRange(startDate, endDate)
      
      console.log(`📈 Loaded ${historicalData.length} data points from historical CSV`)
      
      // For very long ranges, sample the data to prevent timeouts
      let limitedHistoricalData = historicalData
      if (timeRange === 'ALL' && historicalData.length > 1000) {
        // Sample every nth record for ALL time range, but always include the last 100 records
        const step = Math.ceil((historicalData.length - 100) / 900) // Reserve 100 for recent data
        const sampledData = historicalData.slice(0, -100).filter((_, index) => index % step === 0)
        const recentData = historicalData.slice(-100) // Always include last 100 records
        limitedHistoricalData = [...sampledData, ...recentData]
        console.log(`📊 Sampled ${limitedHistoricalData.length} points from ${historicalData.length} total (${sampledData.length} sampled + ${recentData.length} recent)`)
      } else if (historicalData.length > 2000) {
        // For other long ranges, sample evenly across the entire range, but always include recent data
        const step = Math.ceil((historicalData.length - 100) / 1900) // Reserve 100 for recent data
        const sampledData = historicalData.slice(0, -100).filter((_, index) => index % step === 0)
        const recentData = historicalData.slice(-100) // Always include last 100 records
        limitedHistoricalData = [...sampledData, ...recentData]
        console.log(`📊 Sampled ${limitedHistoricalData.length} points from ${historicalData.length} total (${sampledData.length} sampled + ${recentData.length} recent)`)
      }
      
      chartData = limitedHistoricalData.map(item => ({
        timestamp: item.timestamp,
        price: item.price,
        volume: item.volume,
        marketCap: item.marketCap,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        dataSource: 'csv_historical'
      }))
    }
    
    // Sort by timestamp
    chartData.sort((a, b) => a.timestamp - b.timestamp)
    
    console.log(`✅ Final chart data: ${chartData.length} data points`)
    
    // Get consolidation status for last updated info
    const consolidationStatus = await getConsolidationStatus()
    
    // Get file modification time
    let lastFileUpdate: string | null = null
    try {
      const csvPath = path.join(process.cwd(), 'public', 'BTC Price History copy.csv')
      const stats = await fs.stat(csvPath)
      lastFileUpdate = stats.mtime.toISOString()
    } catch (error) {
      // Ignore errors
    }
    
    return NextResponse.json({ 
      success: true,
      data: chartData,
      timeRange,
      currency,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      count: chartData.length,
      timestamp: new Date().toISOString(),
      lastUpdated: {
        consolidationStatus: consolidationStatus.status,
        lastHistoricalDate: consolidationStatus.lastHistoricalDate,
        fileModified: lastFileUpdate
      }
    })
    
  } catch (error) {
    console.error('❌ Error fetching BTC chart data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch BTC chart data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 