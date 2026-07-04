/**
 * BTC Data Consolidator
 * Merges realtime data into the main historical CSV file
 * Runs twice daily at 7 AM and 7 PM UTC
 */

import path from 'path'
import { logInfo, logError } from './logger'
import { readStoredCSV, writeStoredCSV } from './csv-storage'

const REALTIME_CSV_PATHNAME = 'BTC_Realtime_Data.csv'
const HISTORICAL_CSV_PATHNAME = 'BTC Price History copy.csv'

export interface HistoricalDataRow {
  Start: string
  End: string
  Open: number
  High: number
  Low: number
  Close: number
  Volume: number
  'Market Cap': number
  'Circulating Supply'?: number
}

export interface RealtimeDataRow {
  entry: number
  price: number
  volume_24h: number
  market_cap: number
  price_change_24h: number
  price_change_percentage_24h: number
  created_at: string
  updated_at: string
}

export interface ConsolidationResult {
  success: boolean
  message: string
  stats?: {
    realtimeEntries: number
    newRowsAdded: number
    rowsUpdated: number
    dateRange: string
  }
  error?: string
}

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'

/**
 * Fetch a full day's real OHLCV directly from CoinGecko.
 *
 * Vercel's Hobby plan only allows once-a-day cron jobs, so we can't rely on
 * frequent (5-min) realtime snapshots to build the day's OHLC anymore — this
 * pulls the actual daily candle straight from CoinGecko instead, same approach
 * as scripts/backfill-historical-data.js.
 */
async function fetchDailyOHLCVFromCoinGecko(dateStr: string): Promise<HistoricalDataRow | null> {
  const from = Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000)
  const to = Math.floor(new Date(`${dateStr}T23:59:59Z`).getTime() / 1000)

  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${from}&to=${to}`,
    { headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY } }
  )
  if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${res.statusText}`)

  const { prices, total_volumes, market_caps } = await res.json()
  if (!prices?.length) return null

  const values = prices.map(([, p]: [number, number]) => p)
  const nextDay = new Date(`${dateStr}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return {
    Start: dateStr,
    End: nextDay.toISOString().split('T')[0],
    Open: values[0],
    High: Math.max(...values),
    Low: Math.min(...values),
    Close: values[values.length - 1],
    Volume: total_volumes?.length ? total_volumes[total_volumes.length - 1][1] : 0,
    'Market Cap': market_caps?.length ? market_caps[market_caps.length - 1][1] : 0,
  }
}

/**
 * Main consolidation function — fetches yesterday's real daily candle from
 * CoinGecko and upserts it into the historical CSV.
 */
export async function consolidateRealtimeData(): Promise<ConsolidationResult> {
  await logInfo('Consolidator', 'Starting data consolidation...')

  try {
    const historicalData = await readHistoricalCSV()

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const ohlcv = await fetchDailyOHLCVFromCoinGecko(yesterday)

    if (!ohlcv) {
      return {
        success: false,
        message: 'No CoinGecko data available for the target day',
        error: `Empty market_chart response for ${yesterday}`
      }
    }

    const existingIndex = historicalData.findIndex(row => row.Start === ohlcv.Start)

    let newRowsAdded = 0
    let rowsUpdated = 0

    if (existingIndex !== -1) {
      historicalData[existingIndex] = ohlcv
      rowsUpdated = 1
      await logInfo('Consolidator', `Updated existing row for ${ohlcv.Start}`)
    } else {
      historicalData.push(ohlcv)
      newRowsAdded = 1
      await logInfo('Consolidator', `Added new row for ${ohlcv.Start}`)
    }

    // Sort by date (ensure chronological order)
    historicalData.sort((a, b) => {
      return new Date(a.End).getTime() - new Date(b.End).getTime()
    })

    // Remove duplicates (keep last occurrence)
    const uniqueData = removeDuplicates(historicalData)

    // Write back to historical CSV
    await writeHistoricalCSV(uniqueData)

    await logInfo('Consolidator', 'Data consolidation completed successfully', {
      newRowsAdded,
      rowsUpdated
    })

    return {
      success: true,
      message: 'Data consolidation completed successfully',
      stats: {
        realtimeEntries: 1,
        newRowsAdded,
        rowsUpdated,
        dateRange: ohlcv.Start
      }
    }
  } catch (error) {
    await logError('Consolidator', 'Error during consolidation', error)
    return {
      success: false,
      message: 'Consolidation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Read realtime CSV file
 */
async function readRealtimeCSV(): Promise<RealtimeDataRow[]> {
  const csvPath = path.join(process.cwd(), 'public', 'BTC_Realtime_Data.csv')

  try {
    const content = await readStoredCSV(REALTIME_CSV_PATHNAME, csvPath)
    const lines = content.trim().split('\n')
    
    if (lines.length <= 1) {
      return []
    }

    const data: RealtimeDataRow[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const values = line.split(',')
      
      if (values.length >= 8) {
        data.push({
          entry: parseFloat(values[0]),
          price: parseFloat(values[1]),
          volume_24h: parseFloat(values[2]),
          market_cap: parseFloat(values[3]),
          price_change_24h: parseFloat(values[4]),
          price_change_percentage_24h: parseFloat(values[5]),
          created_at: values[6],
          updated_at: values[7]
        })
      }
    }

    return data
  } catch (error) {
    await logError('Consolidator', 'Error reading realtime CSV', error)
    return []
  }
}

/**
 * Read historical CSV file
 */
async function readHistoricalCSV(): Promise<HistoricalDataRow[]> {
  const csvPath = path.join(process.cwd(), 'public', 'BTC Price History copy.csv')

  try {
    const content = await readStoredCSV(HISTORICAL_CSV_PATHNAME, csvPath)
    const lines = content.trim().split('\n')
    
    if (lines.length <= 1) {
      return []
    }

    const data: HistoricalDataRow[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      // Older rows in this file are tab-delimited, newer rows comma-delimited — handle both
      // (see BTCHistoricalCSVService.readHistoricalCSVData, which already does this).
      const values = line.includes('\t') ? line.split('\t') : line.split(',')

      if (values.length >= 8) {
        data.push({
          Start: values[0],
          End: values[1],
          Open: parseFloat(values[2]),
          High: parseFloat(values[3]),
          Low: parseFloat(values[4]),
          Close: parseFloat(values[5]),
          Volume: parseFloat(values[6]),
          'Market Cap': parseFloat(values[7]),
          'Circulating Supply': values[8] ? parseFloat(values[8]) : undefined
        })
      }
    }

    return data
  } catch (error) {
    await logError('Consolidator', 'Error reading historical CSV', error)
    throw error
  }
}

/**
 * Write historical CSV file
 */
async function writeHistoricalCSV(data: HistoricalDataRow[]): Promise<void> {
  const csvPath = path.join(process.cwd(), 'public', 'BTC Price History copy.csv')
  
  try {
    const header = 'Start,End,Open,High,Low,Close,Volume,Market Cap,Circulating Supply'
    const rows = data.map(row => {
      const supply = row['Circulating Supply'] !== undefined ? row['Circulating Supply'] : ''
      return `${row.Start},${row.End},${row.Open},${row.High},${row.Low},${row.Close},${row.Volume},${row['Market Cap']},${supply}`
    })

    const content = [header, ...rows].join('\n') + '\n'
    await writeStoredCSV(HISTORICAL_CSV_PATHNAME, content, csvPath)

    await logInfo('Consolidator', `Wrote ${data.length} rows to historical CSV`)
  } catch (error) {
    await logError('Consolidator', 'Error writing historical CSV', error)
    throw error
  }
}

/**
 * Remove duplicate rows (keep last occurrence)
 */
function removeDuplicates(data: HistoricalDataRow[]): HistoricalDataRow[] {
  const seen = new Map<string, HistoricalDataRow>()
  
  for (const row of data) {
    seen.set(row.End, row)
  }
  
  return Array.from(seen.values()).sort((a, b) => {
    return new Date(a.End).getTime() - new Date(b.End).getTime()
  })
}

/**
 * Get consolidation status
 */
export async function getConsolidationStatus() {
  try {
    const historicalData = await readHistoricalCSV()
    const realtimeData = await readRealtimeCSV()

    if (historicalData.length === 0) {
      return {
        status: 'error',
        message: 'No historical data found'
      }
    }

    const lastHistoricalDate = historicalData[historicalData.length - 1].End
    const today = new Date().toISOString().split('T')[0]
    const isUpToDate = lastHistoricalDate === today

    return {
      status: isUpToDate ? 'current' : 'needs_update',
      lastHistoricalDate,
      realtimeEntries: realtimeData.length,
      historicalEntries: historicalData.length,
      message: isUpToDate 
        ? 'Historical data is up to date' 
        : `Historical data needs update (last: ${lastHistoricalDate}, today: ${today})`
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

