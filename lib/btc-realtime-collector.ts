/**
 * BTC Realtime Data Collector
 * Fetches current Bitcoin price data from CoinGecko API and stores it in CSV format
 * Implements retry logic, rate limiting, and error handling
 */

import { promises as fs } from 'fs'
import path from 'path'
import { logInfo, logWarn, logError } from './logger'

export interface BTCRealtimeData {
  timestamp: number
  price: number
  volume_24h: number
  market_cap: number
  price_change_24h: number
  price_change_percentage_24h: number
  created_at: string
  updated_at: string
}

export interface CollectorResult {
  success: boolean
  data?: BTCRealtimeData
  error?: string
  source: 'api' | 'cache' | 'fallback'
}

// Cache for API responses
let apiCache: {
  data: BTCRealtimeData | null
  timestamp: number
} = { data: null, timestamp: 0 }

// Cache duration: 4 minutes (since we're calling every 5 minutes)
const CACHE_DURATION = 4 * 60 * 1000

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second

/**
 * Fetch live BTC data from CoinGecko API with retry logic
 */
export async function fetchBTCRealtimeData(): Promise<CollectorResult> {
  try {
    // Check cache first
    const now = Date.now()
    if (apiCache.data && (now - apiCache.timestamp) < CACHE_DURATION) {
      await logInfo('Collector', 'Using cached data')
      return {
        success: true,
        data: apiCache.data,
        source: 'cache'
      }
    }

    // Fetch from API with retries
    const data = await fetchWithRetry()
    
    // Update cache
    apiCache = {
      data,
      timestamp: now
    }

    await logInfo('Collector', 'Successfully fetched fresh data from API', { price: data.price })
    return {
      success: true,
      data,
      source: 'api'
    }
  } catch (error) {
    await logError('Collector', 'Error fetching BTC data', error)
    
    // Try to use cached data as fallback
    if (apiCache.data) {
      await logWarn('Collector', 'Using stale cached data as fallback')
      return {
        success: true,
        data: apiCache.data,
        source: 'fallback'
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'api'
    }
  }
}

/**
 * Fetch data from CoinGecko with exponential backoff retry logic
 */
async function fetchWithRetry(retryCount = 0): Promise<BTCRealtimeData> {
  try {
    const apiKey = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
    
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
      {
        headers: {
          'x-cg-demo-api-key': apiKey
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    )

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    
    if (!json.market_data) {
      throw new Error('No market data in CoinGecko response')
    }

    const now = new Date().toISOString()
    const data: BTCRealtimeData = {
      timestamp: Date.now(),
      price: json.market_data.current_price.usd,
      volume_24h: json.market_data.total_volume.usd || 0,
      market_cap: json.market_data.market_cap.usd || 0,
      price_change_24h: json.market_data.price_change_24h || 0,
      price_change_percentage_24h: json.market_data.price_change_percentage_24h || 0,
      created_at: now,
      updated_at: now
    }

    // Validate data
    if (!(await validateData(data))) {
      throw new Error('Invalid data received from API')
    }

    return data
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
      await logWarn('Collector', `Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`)
      await sleep(delay)
      return fetchWithRetry(retryCount + 1)
    }
    await logError('Collector', 'Max retries exceeded', error)
    throw error
  }
}

/**
 * Validate BTC data
 */
async function validateData(data: BTCRealtimeData): Promise<boolean> {
  // Price should be positive and reasonable (between $100 and $10M)
  if (!data.price || data.price < 100 || data.price > 10000000) {
    await logError('Collector', 'Invalid price', { price: data.price })
    return false
  }

  // Volume should be positive
  if (data.volume_24h < 0) {
    await logError('Collector', 'Invalid volume', { volume: data.volume_24h })
    return false
  }

  // Market cap should be positive
  if (data.market_cap < 0) {
    await logError('Collector', 'Invalid market cap', { marketCap: data.market_cap })
    return false
  }

  return true
}

/**
 * Save realtime data to CSV file
 */
export async function saveRealtimeDataToCSV(data: BTCRealtimeData): Promise<void> {
  const csvPath = path.join(process.cwd(), 'public', 'BTC_Realtime_Data.csv')
  
  try {
    // Read existing CSV
    let csvContent = ''
    try {
      csvContent = await fs.readFile(csvPath, 'utf-8')
    } catch (error) {
      // File doesn't exist, create with header
      csvContent = 'entry,price,volume_24h,market_cap,price_change_24h,price_change_percentage_24h,created_at,updated_at\n'
    }

    // Parse existing data
    const lines = csvContent.trim().split('\n')
    const header = lines[0]
    const dataLines = lines.slice(1)

    // Add new data row
    const newRow = `${data.timestamp},${data.price},${data.volume_24h},${data.market_cap},${data.price_change_24h},${data.price_change_percentage_24h},${data.created_at},${data.updated_at}`
    dataLines.push(newRow)

    // Keep only last 30 days of data (30 days * 288 entries per day = 8640 entries)
    const maxEntries = 8640
    const trimmedLines = dataLines.slice(-maxEntries)

    // Write back to file
    const newContent = [header, ...trimmedLines].join('\n') + '\n'
    await fs.writeFile(csvPath, newContent, 'utf-8')
    
    await logInfo('Collector', `Saved data to CSV (${trimmedLines.length} entries)`)
  } catch (error) {
    await logError('Collector', 'Error saving to CSV', error)
    throw error
  }
}

/**
 * Main collection function - fetch and save
 */
export async function collectAndSaveRealtimeData(): Promise<CollectorResult> {
  await logInfo('Collector', 'Starting data collection...')
  
  const result = await fetchBTCRealtimeData()
  
  if (result.success && result.data) {
    try {
      await saveRealtimeDataToCSV(result.data)
      await logInfo('Collector', 'Data collection completed successfully')
    } catch (error) {
      await logError('Collector', 'Failed to save data', error)
      return {
        success: false,
        error: `Failed to save data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: result.source
      }
    }
  }
  
  return result
}

/**
 * Get cached data without making API call
 */
export function getCachedData(): BTCRealtimeData | null {
  return apiCache.data
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

