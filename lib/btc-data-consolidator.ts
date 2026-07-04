/**
 * BTC Data Consolidator
 * Merges realtime data into the main historical CSV file
 * Runs twice daily at 7 AM and 7 PM UTC
 */

import path from 'path'
import { logInfo, logWarn, logError } from './logger'
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

/**
 * Main consolidation function
 */
export async function consolidateRealtimeData(): Promise<ConsolidationResult> {
  await logInfo('Consolidator', 'Starting data consolidation...')
  
  try {
    // Read realtime data
    const realtimeData = await readRealtimeCSV()
    if (realtimeData.length === 0) {
      return {
        success: false,
        message: 'No realtime data available',
        error: 'Empty realtime CSV file'
      }
    }

    // Read historical data
    const historicalData = await readHistoricalCSV()

    // Get data from last 24 hours
    const now = Date.now()
    const oneDayAgo = now - (24 * 60 * 60 * 1000)
    const last24Hours = realtimeData.filter(row => row.entry >= oneDayAgo)

    if (last24Hours.length === 0) {
      return {
        success: false,
        message: 'No data from last 24 hours',
        error: 'No recent data to consolidate'
      }
    }

    await logInfo('Consolidator', `Found ${last24Hours.length} entries from last 24 hours`)

    // Calculate OHLCV for today
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const ohlcv = calculateOHLCV(last24Hours, yesterday, today)

    // Check if today's date already exists in historical data
    const existingIndex = historicalData.findIndex(row => row.End === today)
    
    let newRowsAdded = 0
    let rowsUpdated = 0

    if (existingIndex !== -1) {
      // Update existing row
      historicalData[existingIndex] = ohlcv
      rowsUpdated = 1
      await logInfo('Consolidator', `Updated existing row for ${today}`)
    } else {
      // Add new row
      historicalData.push(ohlcv)
      newRowsAdded = 1
      await logInfo('Consolidator', `Added new row for ${today}`)
    }

    // Sort by date (ensure chronological order)
    historicalData.sort((a, b) => {
      return new Date(a.End).getTime() - new Date(b.End).getTime()
    })

    // Remove duplicates (keep last occurrence)
    const uniqueData = removeDuplicates(historicalData)

    // Write back to historical CSV
    await writeHistoricalCSV(uniqueData)

    // Trim realtime CSV to last 30 days
    await trimRealtimeCSV(realtimeData)

    await logInfo('Consolidator', 'Data consolidation completed successfully', {
      realtimeEntries: last24Hours.length,
      newRowsAdded,
      rowsUpdated
    })

    return {
      success: true,
      message: 'Data consolidation completed successfully',
      stats: {
        realtimeEntries: last24Hours.length,
        newRowsAdded,
        rowsUpdated,
        dateRange: `${yesterday} to ${today}`
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
 * Calculate OHLCV (Open, High, Low, Close, Volume) from realtime data
 */
function calculateOHLCV(
  data: RealtimeDataRow[],
  startDate: string,
  endDate: string
): HistoricalDataRow {
  // Sort by timestamp
  const sorted = [...data].sort((a, b) => a.entry - b.entry)

  const prices = sorted.map(d => d.price)
  const open = sorted[0].price
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const close = sorted[sorted.length - 1].price

  // Calculate average volume (since realtime data has 24h rolling volume)
  const avgVolume = sorted.reduce((sum, d) => sum + d.volume_24h, 0) / sorted.length

  // Use last market cap value
  const marketCap = sorted[sorted.length - 1].market_cap

  return {
    Start: startDate,
    End: endDate,
    Open: open,
    High: high,
    Low: low,
    Close: close,
    Volume: avgVolume,
    'Market Cap': marketCap
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
      const values = line.split(',')
      
      if (values.length >= 9) {
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
 * Trim realtime CSV to last 30 days
 */
async function trimRealtimeCSV(data: RealtimeDataRow[]): Promise<void> {
  const csvPath = path.join(process.cwd(), 'public', 'BTC_Realtime_Data.csv')
  
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const trimmedData = data.filter(row => row.entry >= thirtyDaysAgo)

    const header = 'entry,price,volume_24h,market_cap,price_change_24h,price_change_percentage_24h,created_at,updated_at'
    const rows = trimmedData.map(row => 
      `${row.entry},${row.price},${row.volume_24h},${row.market_cap},${row.price_change_24h},${row.price_change_percentage_24h},${row.created_at},${row.updated_at}`
    )

    const content = [header, ...rows].join('\n') + '\n'
    await writeStoredCSV(REALTIME_CSV_PATHNAME, content, csvPath)

    await logInfo('Consolidator', `Trimmed realtime CSV to ${trimmedData.length} entries`)
  } catch (error) {
    await logWarn('Consolidator', 'Error trimming realtime CSV', error)
    // Don't throw - trimming is not critical
  }
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

