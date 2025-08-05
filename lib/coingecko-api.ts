// CoinGecko API Integration for Bitcoin Historical Data
import fs from 'fs'
import path from 'path'

interface CoinGeckoHistoricalData {
  prices: [number, number][]
  market_caps: [number, number][]
  total_volumes: [number, number][]
}

interface ProcessedHistoricalData {
  Start: string
  End: string
  Open: number
  High: number
  Low: number
  Close: number
  Volume: number
  'Market Cap': number
}

export class CoinGeckoAPI {
  private baseUrl = 'https://api.coingecko.com/api/v3'
  private csvPath = path.join(process.cwd(), 'public', 'BTC Price History.csv')

  async fetchBitcoinHistoricalData(days: number = 365): Promise<CoinGeckoHistoricalData> {
    try {
      const url = `${this.baseUrl}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=daily`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      return data as CoinGeckoHistoricalData
    } catch (error) {
      console.error('Error fetching CoinGecko data:', error)
      throw error
    }
  }

  processHistoricalData(data: CoinGeckoHistoricalData): ProcessedHistoricalData[] {
    const processed: ProcessedHistoricalData[] = []
    
    // Group data by day and calculate OHLC
    const dailyData = new Map<string, { prices: number[], volumes: number[], marketCaps: number[] }>()
    
    data.prices.forEach(([timestamp, price], index) => {
      const date = new Date(timestamp).toISOString().split('T')[0]
      const volume = data.total_volumes[index]?.[1] || 0
      const marketCap = data.market_caps[index]?.[1] || 0
      
      if (!dailyData.has(date)) {
        dailyData.set(date, { prices: [], volumes: [], marketCaps: [] })
      }
      
      const dayData = dailyData.get(date)!
      dayData.prices.push(price)
      dayData.volumes.push(volume)
      dayData.marketCaps.push(marketCap)
    })
    
    // Convert to CSV format
    dailyData.forEach((dayData, date) => {
      const prices = dayData.prices
      const volumes = dayData.volumes
      const marketCaps = dayData.marketCaps
      
      const open = prices[0] || 0
      const close = prices[prices.length - 1] || 0
      const high = Math.max(...prices)
      const low = Math.min(...prices)
      const volume = volumes.reduce((sum, vol) => sum + vol, 0)
      const marketCap = marketCaps.reduce((sum, cap) => sum + cap, 0) / marketCaps.length
      
      // Calculate end date (next day)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      const endDateStr = endDate.toISOString().split('T')[0]
      
      processed.push({
        Start: date,
        End: endDateStr,
        Open: open,
        High: high,
        Low: low,
        Close: close,
        Volume: volume,
        'Market Cap': marketCap
      })
    })
    
    // Sort by date (oldest first)
    return processed.sort((a, b) => new Date(a.Start).getTime() - new Date(b.Start).getTime())
  }

  async updateCSVFile(days: number = 1): Promise<void> {
    try {
      console.log('Fetching latest Bitcoin data from CoinGecko...')
      
      // Fetch only the latest day's data
      const historicalData = await this.fetchBitcoinHistoricalData(days)
      
      // Process the data
      const processedData = this.processHistoricalData(historicalData)
      
      if (processedData.length === 0) {
        console.log('No new data to add')
        return
      }
      
      // Read existing CSV data
      let existingData: ProcessedHistoricalData[] = []
      if (fs.existsSync(this.csvPath)) {
        const csvContent = fs.readFileSync(this.csvPath, 'utf8')
        const lines = csvContent.split('\n')
        
        existingData = lines.slice(1).map(line => {
          const values = line.split(',')
          return {
            Start: values[0],
            End: values[1],
            Open: parseFloat(values[2]) || 0,
            High: parseFloat(values[3]) || 0,
            Low: parseFloat(values[4]) || 0,
            Close: parseFloat(values[5]) || 0,
            Volume: parseFloat(values[6]) || 0,
            'Market Cap': parseFloat(values[7]) || 0
          }
        }).filter(row => row.Close > 0)
      }
      
      // Get the latest date from existing data
      const latestExistingDate = existingData.length > 0 
        ? new Date(existingData[0].Start) // Since newest is at top
        : new Date(0)
      
      // Filter new data to only include dates after the latest existing date
      const newData = processedData.filter(row => {
        const rowDate = new Date(row.Start)
        return rowDate > latestExistingDate
      })
      
      if (newData.length === 0) {
        console.log('No new data to add - CSV is already up to date')
        return
      }
      
      // Add new data at the top (newest first)
      const combinedData = [...newData, ...existingData]
      
      // Create CSV content
      const csvHeader = 'Start,End,Open,High,Low,Close,Volume,Market Cap\n'
      const csvRows = combinedData.map(row => 
        `${row.Start},${row.End},${row.Open.toFixed(5)},${row.High.toFixed(5)},${row.Low.toFixed(5)},${row.Close.toFixed(5)},${row.Volume.toFixed(2)},${row['Market Cap'].toFixed(2)}`
      ).join('\n')
      
      const csvContent = csvHeader + csvRows
      
      // Write to CSV file
      fs.writeFileSync(this.csvPath, csvContent, 'utf8')
      
      console.log(`Successfully updated CSV file with ${newData.length} new day(s) of data`)
      console.log(`Total data points: ${combinedData.length}`)
      console.log(`File saved to: ${this.csvPath}`)
      
    } catch (error) {
      console.error('Error updating CSV file:', error)
      throw error
    }
  }

  async getLastUpdateTime(): Promise<Date | null> {
    try {
      if (!fs.existsSync(this.csvPath)) {
        return null
      }
      
      const stats = fs.statSync(this.csvPath)
      return stats.mtime
    } catch (error) {
      console.error('Error getting last update time:', error)
      return null
    }
  }

  async shouldUpdateData(maxAgeHours: number = 24): Promise<boolean> {
    const lastUpdate = await this.getLastUpdateTime()
    
    if (!lastUpdate) {
      return true // File doesn't exist, should update
    }
    
    const now = new Date()
    const ageInHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
    
    return ageInHours >= maxAgeHours
  }
}

// Export singleton instance
export const coingeckoAPI = new CoinGeckoAPI() 