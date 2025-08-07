import { readFileSync } from 'fs'
import { join } from 'path'

interface RealtimeBTCData {
  id: number
  price: string
  volume_24h: string | null
  market_cap: string | null
  price_change_24h: string | null
  price_change_percentage_24h: string | null
  created_at: string
  updated_at: string
}

interface ChartDataPoint {
  timestamp: number
  price: number
  volume?: number
  marketCap?: number
  open: number
  high: number
  low: number
  close: number
  dataSource: string
}

interface HistoricalBTCData {
  start: string
  end: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  marketCap: number
  circulatingSupply: number
}

export class BTCRealtimeCSVService {
  private csvPath = join(process.cwd(), 'public', 'BTC_Realtime_Data.csv')

  private readCSVData(): RealtimeBTCData[] {
    try {
      const csvContent = readFileSync(this.csvPath, 'utf-8')
      
      if (!csvContent.trim()) {
        console.warn('⚠️ Realtime CSV file is empty')
        return []
      }

      const lines = csvContent.split('\n').filter(line => line.trim())
      
      if (lines.length <= 1) {
        console.warn('⚠️ Realtime CSV file has no data rows')
        return []
      }
      
      return lines.slice(1).map((line, index) => {
        const values = line.split(',')
        
        // Validate we have enough columns
        if (values.length < 8) {
          console.warn(`⚠️ Invalid CSV row ${index + 1}: insufficient columns`)
          return null
        }
        
        return {
          id: parseInt(values[0]) || Date.now() + index, // Fallback ID if parsing fails
          price: values[1] || '0',
          volume_24h: values[2] || null,
          market_cap: values[3] || null,
          price_change_24h: values[4] || null,
          price_change_percentage_24h: values[5] || null,
          created_at: values[6] || new Date().toISOString(),
          updated_at: values[7] || new Date().toISOString()
        }
      }).filter(Boolean) as RealtimeBTCData[]
    } catch (error) {
      console.error('❌ Error reading realtime CSV:', error)
      return []
    }
  }

  async getLatestPrice(): Promise<RealtimeBTCData | null> {
    const data = this.readCSVData()
    return data.length > 0 ? data[data.length - 1] : null
  }

  async getPricesInRange(startDate: Date, endDate: Date): Promise<ChartDataPoint[]> {
    const data = this.readCSVData()
    
    if (data.length === 0) {
      console.warn('⚠️ No realtime data available for range query')
      return []
    }
    
    return data
      .filter(item => {
        const itemDate = new Date(item.created_at)
        return itemDate >= startDate && itemDate <= endDate
      })
      .map(item => ({
        timestamp: new Date(item.created_at).getTime(),
        price: parseFloat(item.price) || 0,
        volume: item.volume_24h ? parseFloat(item.volume_24h) : undefined,
        marketCap: item.market_cap ? parseFloat(item.market_cap) : undefined,
        open: parseFloat(item.price) || 0,
        high: parseFloat(item.price) || 0,
        low: parseFloat(item.price) || 0,
        close: parseFloat(item.price) || 0,
        dataSource: 'csv_realtime'
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  async getRecentPrices(limit: number = 100): Promise<RealtimeBTCData[]> {
    const data = this.readCSVData()
    return data.slice(-limit)
  }

  async getPriceHistory(hours: number = 24): Promise<ChartDataPoint[]> {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - (hours * 60 * 60 * 1000))
    
    return this.getPricesInRange(startDate, endDate)
  }

  async getDataStats(): Promise<{
    totalRecords: number
    latestPrice: number | null
    latestTimestamp: string | null
    dataRange: { start: string | null; end: string | null }
  }> {
    const data = this.readCSVData()
    
    if (data.length === 0) {
      return {
        totalRecords: 0,
        latestPrice: null,
        latestTimestamp: null,
        dataRange: { start: null, end: null }
      }
    }
    
    const latest = data[data.length - 1]
    const earliest = data[0]
    
    return {
      totalRecords: data.length,
      latestPrice: parseFloat(latest.price) || null,
      latestTimestamp: latest.created_at,
      dataRange: {
        start: earliest.created_at,
        end: latest.created_at
      }
    }
  }
}

export class BTCHistoricalCSVService {
  private csvPath = join(process.cwd(), 'public', 'BTC Price History copy.csv')

  private readHistoricalCSVData(): HistoricalBTCData[] {
    try {
      const csvContent = readFileSync(this.csvPath, 'utf-8')
      
      if (!csvContent.trim()) {
        console.warn('⚠️ Historical CSV file is empty')
        return []
      }

      const lines = csvContent.split('\n').filter(line => line.trim())
      
      if (lines.length <= 1) {
        console.warn('⚠️ Historical CSV file has no data rows')
        return []
      }
      
      console.log(`📊 Processing ${lines.length - 1} historical data rows`)
      
      const data: HistoricalBTCData[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const values = line.split(',')
        
        // Handle inconsistent column counts - some rows have 8 columns, others have 9
        if (values.length < 8) {
          console.warn(`⚠️ Skipping invalid historical CSV row ${i + 1}: insufficient columns (${values.length})`)
          continue
        }
        
        try {
          const record = {
            start: values[0] || '',
            end: values[1] || '',
            open: parseFloat(values[2]) || 0,
            high: parseFloat(values[3]) || 0,
            low: parseFloat(values[4]) || 0,
            close: parseFloat(values[5]) || 0,
            volume: parseFloat(values[6]) || 0,
            marketCap: parseFloat(values[7]) || 0,
            circulatingSupply: values.length >= 9 ? parseFloat(values[8]) || 0 : 0
          }
          
          // Validate the record has valid data
          if (record.start && record.close > 0) {
            data.push(record)
          } else {
            console.warn(`⚠️ Skipping invalid historical CSV row ${i + 1}: invalid data`)
          }
        } catch (error) {
          console.warn(`⚠️ Error parsing historical CSV row ${i + 1}:`, error)
          continue
        }
      }
      
      console.log(`✅ Successfully parsed ${data.length} historical records`)
      return data
    } catch (error) {
      console.error('❌ Error reading historical CSV:', error)
      return []
    }
  }

  async getPricesInRange(startDate: Date, endDate: Date): Promise<ChartDataPoint[]> {
    const data = this.readHistoricalCSVData()
    
    if (data.length === 0) {
      console.warn('⚠️ No historical data available for range query')
      return []
    }
    
    return data
      .filter(item => {
        const itemDate = new Date(item.start)
        return itemDate >= startDate && itemDate <= endDate
      })
      .map(item => ({
        timestamp: new Date(item.start).getTime(),
        price: item.close,
        volume: item.volume,
        marketCap: item.marketCap,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        dataSource: 'csv_historical'
      }))
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  async getDataStats(): Promise<{
    totalRecords: number
    dateRange: { start: string | null; end: string | null }
    priceRange: { min: number | null; max: number | null }
  }> {
    const data = this.readHistoricalCSVData()
    
    if (data.length === 0) {
      return {
        totalRecords: 0,
        dateRange: { start: null, end: null },
        priceRange: { min: null, max: null }
      }
    }
    
    const prices = data.map(item => item.close).filter(price => price > 0)
    const dates = data.map(item => item.start).filter(date => date)
    
    return {
      totalRecords: data.length,
      dateRange: {
        start: dates.length > 0 ? dates[0] : null,
        end: dates.length > 0 ? dates[dates.length - 1] : null
      },
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : null,
        max: prices.length > 0 ? Math.max(...prices) : null
      }
    }
  }
} 