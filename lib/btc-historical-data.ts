// Bitcoin Historical Data Integration
// This file handles loading and processing Bitcoin historical data from CSV

export interface BTCHistoricalData {
  timestamp: string
  start: string
  end: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  market_cap?: number
  circulatingSupply?: number
}

export interface ProcessedBTCData {
  date: string
  price: number
  volume: number
  marketCap?: number
  change: number
  changePercent: number
}

// Cache for historical data
let cachedData: BTCHistoricalData[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Load historical data from CSV file
export async function loadBTCHistoricalData(): Promise<BTCHistoricalData[]> {
  try {
    // Check cache first
    const now = Date.now()
    if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Using cached historical data')
      return cachedData
    }

    console.log('Loading Bitcoin historical data from CSV file...')
    
    // Load from the consolidated CSV file
    const response = await fetch('/BTC Price History copy.csv')
    
    if (!response.ok) {
      throw new Error(`Failed to load historical data: ${response.status}`)
    }
    
    const csvText = await response.text()
    const data = parseCSV(csvText)
    
    // Update cache
    cachedData = data
    cacheTimestamp = now
    
    console.log(`Loaded ${data.length} historical records from CSV`)
    
    return data
    
  } catch (error) {
    console.error('Error loading historical data:', error)
    
    // If we have stale cached data, use it
    if (cachedData) {
      console.log('Using stale cached data as fallback')
      return cachedData
    }
    
    console.log('Falling back to mock data...')
    return getMockHistoricalData()
  }
}

// Parse CSV data
function parseCSV(csvText: string): BTCHistoricalData[] {
  const lines = csvText.trim().split('\n')
  
  if (lines.length <= 1) {
    throw new Error('CSV file is empty or invalid')
  }

  const data: BTCHistoricalData[] = []
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Handle both tab and comma delimiters
    const values = line.includes('\t') ? line.split('\t') : line.split(',')
    
    if (values.length >= 8) {
      data.push({
        start: values[0],
        end: values[1],
        timestamp: values[1], // Use End date as timestamp
        open: parseFloat(values[2]),
        high: parseFloat(values[3]),
        low: parseFloat(values[4]),
        close: parseFloat(values[5]),
        volume: parseFloat(values[6]),
        market_cap: parseFloat(values[7]),
        circulatingSupply: values[8] ? parseFloat(values[8]) : undefined
      })
    }
  }

  return data
}

// Mock data for fallback
function getMockHistoricalData(): BTCHistoricalData[] {
  const mockData: BTCHistoricalData[] = []
  
  // Generate comprehensive mock data from 2020 to 2024
  const startDate = new Date('2020-01-01')
  const endDate = new Date('2024-12-31')
  const currentDate = new Date(startDate)
  
  const basePrice = 8000 // Starting price in 2020
  
  while (currentDate <= endDate) {
    // Simulate realistic Bitcoin price movements
    const daysSinceStart = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    // Add trend, cycles, and noise
    const trend = daysSinceStart * 15 // Upward trend
    const cycle = Math.sin(daysSinceStart * 0.01) * 10000 // Cyclical pattern
    const noise = (Math.random() - 0.5) * 5000 // Random noise
    
    const price = Math.max(basePrice + trend + cycle + noise, 3000) // Minimum price
    
    const open = price - (Math.random() * 1000 - 500)
    const high = price + Math.random() * 2000
    const low = price - Math.random() * 2000
    const close = price
    
    const volume = 15000000000 + Math.random() * 10000000000
    const marketCap = close * 19000000
    
    const dateStr = currentDate.toISOString().split('T')[0]
    const prevDateStr = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    mockData.push({
      start: prevDateStr,
      end: dateStr,
      timestamp: dateStr,
      open,
      high,
      low,
      close,
      volume,
      market_cap: marketCap,
      circulatingSupply: 19000000
    })
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return mockData
}

// Process historical data for chart display
export function processHistoricalData(data: BTCHistoricalData[]): ProcessedBTCData[] {
  return data.map((item, index) => {
    const previousClose = index > 0 ? data[index - 1].close : item.open
    const change = item.close - previousClose
    const changePercent = (change / previousClose) * 100
    
    return {
      date: item.timestamp,
      price: item.close,
      volume: item.volume,
      marketCap: item.market_cap,
      change,
      changePercent
    }
  })
}

// Get data for specific time range
export function filterDataByTimeRange(
  data: ProcessedBTCData[], 
  startDate: string, 
  endDate: string
): ProcessedBTCData[] {
  return data.filter(item => {
    const itemDate = new Date(item.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return itemDate >= start && itemDate <= end
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Calculate statistics from historical data
export function calculateHistoricalStats(data: ProcessedBTCData[]) {
  if (data.length === 0) return null
  
  const prices = data.map(d => d.price)
  const volumes = data.map(d => d.volume)
  
  const currentPrice = data[data.length - 1].price
  const startPrice = data[0].price
  const totalChange = currentPrice - startPrice
  const totalChangePercent = (totalChange / startPrice) * 100
  
  const maxPrice = Math.max(...prices)
  const minPrice = Math.min(...prices)
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  
  return {
    currentPrice,
    startPrice,
    totalChange,
    totalChangePercent,
    maxPrice,
    minPrice,
    avgVolume,
    dataPoints: data.length
  }
}

// Integration with existing calculator
export function enhanceCalculatorWithHistoricalData(
  historicalData: ProcessedBTCData[],
  currentPrice: number
) {
  // Use historical data to improve calculator accuracy
  const stats = calculateHistoricalStats(historicalData)
  
  if (!stats) return null
  
  // Calculate historical volatility
  const returns = historicalData.slice(1).map((item, index) => {
    const previousPrice = historicalData[index].price
    return (item.price - previousPrice) / previousPrice
  })
  
  const volatility = Math.sqrt(
    returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length
  )
  
  return {
    historicalVolatility: volatility,
    historicalStats: stats,
    dataQuality: historicalData.length > 100 ? 'high' : 'low'
  }
}

// Clear cache (useful for forcing refresh)
export function clearHistoricalDataCache(): void {
  cachedData = null
  cacheTimestamp = 0
  console.log('Historical data cache cleared')
}

// Get last update timestamp
export function getLastUpdateTimestamp(): string | null {
  if (!cachedData || cacheTimestamp === 0) {
    return null
  }
  return new Date(cacheTimestamp).toISOString()
}

// Check if data is cached
export function isDataCached(): boolean {
  const now = Date.now()
  return cachedData !== null && (now - cacheTimestamp) < CACHE_DURATION
} 