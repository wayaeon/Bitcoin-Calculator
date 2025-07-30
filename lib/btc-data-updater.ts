// BTC Data Updater - Updates CSV data with live CoinGecko API data twice daily

interface LiveBTCData {
  price: number
  volume_24h: number
  market_cap: number
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

// Fetch live BTC data from CoinGecko API
export async function fetchLiveBTCData(): Promise<LiveBTCData> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true', {
      headers: {
        'x-cg-demo-api-key': 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.bitcoin) {
      throw new Error('No Bitcoin data received from API')
    }

    return {
      price: data.bitcoin.usd,
      volume_24h: data.bitcoin.usd_24h_vol || 0,
      market_cap: data.bitcoin.usd_market_cap || 0,
      last_updated: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error fetching live BTC data:', error)
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