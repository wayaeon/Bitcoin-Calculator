import { NextRequest, NextResponse } from 'next/server'
import { BTCRealtimeCSVService, BTCHistoricalCSVService } from '@/lib/btc-realtime-csv-service'

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
        // Sample every nth record for ALL time range
        const step = Math.ceil(historicalData.length / 1000)
        limitedHistoricalData = historicalData.filter((_, index) => index % step === 0)
        console.log(`📊 Sampled ${limitedHistoricalData.length} points from ${historicalData.length} total`)
      } else if (historicalData.length > 2000) {
        // For other long ranges, sample evenly across the entire range
        const step = Math.ceil(historicalData.length / 2000)
        limitedHistoricalData = historicalData.filter((_, index) => index % step === 0)
        console.log(`📊 Sampled ${limitedHistoricalData.length} points from ${historicalData.length} total`)
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
    
    return NextResponse.json({ 
      success: true,
      data: chartData,
      timeRange,
      currency,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      count: chartData.length,
      timestamp: new Date().toISOString()
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