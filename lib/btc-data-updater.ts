// BTC Data Updater - Updates CSV data with live CoinGecko API data twice daily

interface LiveBTCData {
  price: number
  volume_24h: number
  market_cap: number
  price_change_24h: number
  price_change_percentage_24h: number
  last_updated: string
}

interface CSVRow {
  Start: string
  End: string
  Open: number
  High: number
  Low: number
  Close: number
  Volume: number
  'Market Cap': number
}

// Cache for API responses to reduce calls
let apiCache: {
  data: LiveBTCData | null
  timestamp: number
} = { data: null, timestamp: 0 }

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Fetch live BTC data from CoinGecko API with caching
export async function fetchLiveBTCData(): Promise<LiveBTCData> {
  try {
    // Check if we have cached data that's still valid
    const now = Date.now()
    if (apiCache.data && (now - apiCache.timestamp) < CACHE_DURATION) {
      console.log('Using cached BTC data')
      return apiCache.data
    }

    // Check if we're making too many calls (limit to once per 5 minutes)
    const timeSinceLastCall = now - apiCache.timestamp
    if (timeSinceLastCall < CACHE_DURATION) {
      console.log('Rate limiting: Using cached data to avoid API limits')
      if (apiCache.data) {
        return apiCache.data
      }
    }

    console.log('Fetching fresh BTC data from CoinGecko...')
    
    // Get API key from environment variable
    const apiKey = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
    
    // Use the detailed endpoint for better data
    const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false', {
      headers: {
        'x-cg-demo-api-key': apiKey
      }
    })

    if (!response.ok) {
      // If API fails, return cached data if available
      if (apiCache.data) {
        console.warn('API failed, using cached data')
        return apiCache.data
      }
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.market_data) {
      // If no data received, return cached data if available
      if (apiCache.data) {
        console.warn('No Bitcoin market data received, using cached data')
        return apiCache.data
      }
      throw new Error('No Bitcoin market data received from API')
    }

    // Debug: Log the actual API response structure
    console.log('CoinGecko API response market_data:', JSON.stringify(data.market_data, null, 2))

    const liveData: LiveBTCData = {
      price: data.market_data.current_price.usd,
      volume_24h: data.market_data.total_volume.usd || 0,
      market_cap: data.market_data.market_cap.usd || 0,
      price_change_24h: data.market_data.price_change_24h || 0,
      price_change_percentage_24h: data.market_data.price_change_percentage_24h || 0,
      last_updated: new Date().toISOString()
    }

    console.log('Processed live data:', liveData)

    // Update cache
    apiCache = {
      data: liveData,
      timestamp: now
    }

    console.log('Successfully fetched and cached BTC data')
    return liveData
  } catch (error) {
    console.error('Error fetching live BTC data:', error)
    
    // Return cached data if available, otherwise throw
    if (apiCache.data) {
      console.warn('Using cached data due to API error')
      return apiCache.data
    }
    
    throw error
  }
}

// Update the latest row in CSV data with live data
export function updateCSVWithLiveData(csvData: CSVRow[], liveData: LiveBTCData): CSVRow[] {
  if (csvData.length === 0) {
    return csvData
  }

  // Get the latest row
  const latestRow = csvData[csvData.length - 1]
  const today = new Date().toISOString().split('T')[0]

  // Create updated row with live data
  const updatedRow: CSVRow = {
    Start: latestRow.Start,
    End: today,
    Open: latestRow.Open,
    High: Math.max(latestRow.High, liveData.price),
    Low: Math.min(latestRow.Low, liveData.price),
    Close: liveData.price,
    Volume: liveData.volume_24h,
    'Market Cap': liveData.market_cap
  }

  // Replace the latest row with updated data
  const updatedCSVData = [...csvData]
  updatedCSVData[updatedCSVData.length - 1] = updatedRow

  return updatedCSVData
}

// Convert CSV data to string format
export function csvDataToString(csvData: CSVRow[]): string {
  const headers = ['Start', 'End', 'Open', 'High', 'Low', 'Close', 'Volume', 'Market Cap']
  const headerRow = headers.join(',')
  
  const dataRows = csvData.map(row => 
    `${row.Start},${row.End},${row.Open},${row.High},${row.Low},${row.Close},${row.Volume},${row['Market Cap']}`
  )
  
  return [headerRow, ...dataRows].join('\n')
}

// Check if it's time to update (7:00 AM or 7:00 PM)
export function shouldUpdateData(): boolean {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  
  // Update at 7:00 AM or 7:00 PM (within 5 minutes of the hour)
  return (hour === 7 || hour === 19) && minute < 5
}

// Get the last update time from localStorage
export function getLastUpdateTime(): Date | null {
  const lastUpdate = localStorage.getItem('btc_last_update')
  return lastUpdate ? new Date(lastUpdate) : null
}

// Set the last update time in localStorage
export function setLastUpdateTime(): void {
  localStorage.setItem('btc_last_update', new Date().toISOString())
}

// Check if we should update based on time and last update
export function shouldPerformUpdate(): boolean {
  const lastUpdate = getLastUpdateTime()
  const now = new Date()
  
  // If no last update, perform update
  if (!lastUpdate) {
    return shouldUpdateData()
  }
  
  // Check if it's been more than 12 hours since last update
  const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
  
  if (hoursSinceLastUpdate >= 12) {
    return shouldUpdateData()
  }
  
  return false
} 