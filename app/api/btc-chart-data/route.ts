import { NextRequest, NextResponse } from 'next/server'
import { BTCRealtimeCSVService, BTCHistoricalCSVService } from '@/lib/btc-realtime-csv-service'
import { promises as fs } from 'fs'
import path from 'path'

const API_KEY = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
const BASE = 'https://api.coingecko.com/api/v3'

// Server-side in-memory cache — avoids hitting CoinGecko on every chart load
const cache = new Map<string, { data: any[]; ts: number }>()
const TTL: Record<string, number> = {
  '1D':  5  * 60 * 1000,    // 5 min
  '7D':  30 * 60 * 1000,    // 30 min
  '30D': 6  * 60 * 60 * 1000,
  '60D': 6  * 60 * 60 * 1000,
  '90D': 6  * 60 * 60 * 1000,
  '6mo': 6  * 60 * 60 * 1000,
  '1Y':  12 * 60 * 60 * 1000,
  '5Y':  24 * 60 * 60 * 1000,
  '10Y': 24 * 60 * 60 * 1000,
  'ALL': 24 * 60 * 60 * 1000,
}

async function cg(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-cg-demo-api-key': API_KEY },
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${path}`)
  return res.json()
}

// CoinGecko ohlc endpoint → [{timestamp, open, high, low, close}]
async function fetchOHLC(days: number) {
  const data: [number, number, number, number, number][] =
    await cg(`/coins/bitcoin/ohlc?vs_currency=usd&days=${days}`)
  return data.map(([ts, o, h, l, c]) => ({
    timestamp: ts,
    open: o, high: h, low: l, close: c,
    price: c, // price = close for chart dataKey compatibility
    volume: undefined,
    marketCap: undefined,
    dataSource: 'coingecko_ohlc',
  }))
}

// CoinGecko market_chart → [{timestamp, price, volume, marketCap}]
// For days=1 CoinGecko automatically returns 5-min granularity (no interval param needed)
async function fetchMarketChart(days: number) {
  const data = await cg(`/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`)
  const priceMap = new Map<number, number>()
  const volMap = new Map<number, number>()
  const capMap = new Map<number, number>()

  ;(data.prices as [number, number][]).forEach(([ts, p]) => priceMap.set(ts, p))
  ;(data.total_volumes as [number, number][]).forEach(([ts, v]) => volMap.set(ts, v))
  ;(data.market_caps as [number, number][]).forEach(([ts, m]) => capMap.set(ts, m))

  return [...priceMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ts, price]) => ({
      timestamp: ts,
      price,
      open: price, high: price, low: price, close: price,
      volume: volMap.get(ts),
      marketCap: capMap.get(ts),
      dataSource: 'coingecko_live',
    }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '1Y'

    // Check cache (skip if ?bust=1)
    const bust = searchParams.get('bust') === '1'
    const cached = cache.get(timeRange)
    if (!bust && cached && Date.now() - cached.ts < (TTL[timeRange] ?? 60 * 60 * 1000)) {
      return NextResponse.json({ success: true, data: cached.data, timeRange, cached: true })
    }

    let chartData: any[] = []

    // Custom date range — used by zoom selections
    // CoinGecko auto-selects granularity: <1d=5min, 1-90d=hourly, >90d=daily
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    if (fromParam && toParam) {
      const data = await cg(`/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromParam}&to=${toParam}`)
      const priceMap = new Map<number, number>()
      const volMap = new Map<number, number>()
      const capMap = new Map<number, number>()
      ;(data.prices as [number, number][]).forEach(([ts, p]) => priceMap.set(ts, p))
      ;(data.total_volumes as [number, number][]).forEach(([ts, v]) => volMap.set(ts, v))
      ;(data.market_caps as [number, number][]).forEach(([ts, m]) => capMap.set(ts, m))
      chartData = [...priceMap.entries()].sort((a, b) => a[0] - b[0]).map(([ts, price]) => ({
        timestamp: ts, price,
        open: price, high: price, low: price, close: price,
        volume: volMap.get(ts), marketCap: capMap.get(ts),
        dataSource: 'coingecko_range',
      }))
      return NextResponse.json({ success: true, data: chartData, timeRange: 'custom', count: chartData.length, timestamp: new Date().toISOString() })
    }

    if (timeRange === '1D') {
      // 5-minute ticks from CoinGecko — most granular, always fresh
      try {
        chartData = await fetchMarketChart(1)
      } catch {
        // Fallback to realtime CSV if CoinGecko is down
        const svc = new BTCRealtimeCSVService()
        const end = new Date()
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
        const raw = await svc.getPricesInRange(start, end)
        chartData = raw.slice(-1000).map(item => ({
          ...item, open: item.price, high: item.price, low: item.price, close: item.price,
          dataSource: 'csv_realtime_fallback',
        }))
      }
    } else if (timeRange === '7D') {
      // Hourly from market_chart (~168 points)
      chartData = await fetchMarketChart(7)
    } else {
      // 30D, 90D, 6mo, 1Y, 5Y, 10Y, ALL → historical CSV (daily OHLC)
      // 1Y / 5Y / 10Y / ALL — use historical CSV (full daily OHLC since 2009)
      const endDate = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '30D': startDate.setDate(endDate.getDate() - 30); break
        case '60D': startDate.setDate(endDate.getDate() - 60); break
        case '90D': startDate.setDate(endDate.getDate() - 90); break
        case '6mo': startDate.setMonth(endDate.getMonth() - 6); break
        case '1Y':  startDate.setFullYear(endDate.getFullYear() - 1); break
        case '5Y':  startDate.setFullYear(endDate.getFullYear() - 5); break
        case '10Y': startDate.setFullYear(endDate.getFullYear() - 10); break
        case 'ALL': startDate.setFullYear(2009); break
        default:    startDate.setFullYear(endDate.getFullYear() - 1)
      }

      const svc = new BTCHistoricalCSVService()
      const raw = await svc.getPricesInRange(startDate, endDate)

      // Downsample only for very long ranges to keep payload reasonable
      let rows = raw
      if (timeRange === 'ALL' && raw.length > 1000) {
        const step = Math.ceil((raw.length - 100) / 900)
        rows = [...raw.slice(0, -100).filter((_, i) => i % step === 0), ...raw.slice(-100)]
      } else if (raw.length > 2000) {
        const step = Math.ceil((raw.length - 100) / 1900)
        rows = [...raw.slice(0, -100).filter((_, i) => i % step === 0), ...raw.slice(-100)]
      }

      chartData = rows.map(item => ({
        timestamp: item.timestamp,
        price: item.close ?? item.price,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close ?? item.price,
        volume: item.volume,
        marketCap: item.marketCap,
        circulatingSupply: item.circulatingSupply,
        dataSource: 'csv_historical',
      }))
    }

    chartData.sort((a, b) => a.timestamp - b.timestamp)

    // Store in cache
    cache.set(timeRange, { data: chartData, ts: Date.now() })

    // Get file mod time for last-updated display
    let fileModified: string | null = null
    try {
      const csvPath = path.join(process.cwd(), 'public', 'BTC Price History copy.csv')
      fileModified = (await fs.stat(csvPath)).mtime.toISOString()
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      data: chartData,
      timeRange,
      count: chartData.length,
      timestamp: new Date().toISOString(),
      lastUpdated: { fileModified },
    })

  } catch (error) {
    console.error('❌ btc-chart-data error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch BTC chart data', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
