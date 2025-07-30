"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, Database, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

interface BTCPriceData {
  timestamp: number
  price: number
  volume?: number
  marketCap?: number
}

interface BTCPriceHistoryProps {
  className?: string
}

export function BTCPriceHistory({ className }: BTCPriceHistoryProps) {
  const [data, setData] = useState<BTCPriceData[]>([])
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL'>('1Y')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>('')

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' }
  ]

  const loadCSVData = async (): Promise<BTCPriceData[]> => {
    try {
      const response = await fetch('/BTC Historical Prices.csv')
      if (!response.ok) {
        throw new Error('Failed to load CSV data')
      }
      
      const csvText = await response.text()
      const lines = csvText.split('\n')
      const headers = lines[0].split(',')
      
      const csvData = lines.slice(1).map(line => {
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
      
      return csvData.map(row => ({
        timestamp: new Date(row.End).getTime(),
        price: row.Close,
        volume: row.Volume,
        marketCap: row['Market Cap']
      }))
    } catch (error) {
      console.error('Error loading CSV data:', error)
      throw error
    }
  }

  const filterDataByTimeRange = (allData: BTCPriceData[], range: string): BTCPriceData[] => {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    const oneYear = 365 * oneDay
    
    let startTime: number
    
    switch (range) {
      case '1D':
        startTime = now - oneDay
        break
      case '7D':
        startTime = now - 7 * oneDay
        break
      case '30D':
        startTime = now - 30 * oneDay
        break
      case '90D':
        startTime = now - 90 * oneDay
        break
      case '1Y':
        startTime = now - oneYear
        break
      case 'ALL':
        return allData
      default:
        startTime = now - oneYear
    }
    
    return allData.filter(item => item.timestamp >= startTime)
  }

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const allData = await loadCSVData()
      const filteredData = filterDataByTimeRange(allData, timeRange)
      
      if (filteredData.length === 0) {
        throw new Error(`No data available for ${timeRange} range`)
      }
      
      setData(filteredData)
      
      // Calculate current price and change
      const latest = filteredData[filteredData.length - 1]
      const earliest = filteredData[0]
      
      setCurrentPrice(latest.price)
      setPriceChange(((latest.price - earliest.price) / earliest.price) * 100)
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const checkForLiveUpdates = async () => {
    try {
      const response = await fetch('/api/update-btc-data', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        if (data.shouldUpdate) {
          setUpdateStatus('Updating data...')
          const updateResponse = await fetch('/api/update-btc-data', { method: 'POST' })
          if (updateResponse.ok) {
            setLastLiveUpdate(new Date())
            setUpdateStatus('Data updated successfully')
            setTimeout(() => setUpdateStatus(''), 3000)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeRange, selectedCurrency])

  useEffect(() => {
    checkForLiveUpdates()
    const interval = setInterval(checkForLiveUpdates, 5 * 60 * 1000) // Check every 5 minutes
    return () => clearInterval(interval)
  }, [])

  const formatXAxisTick = (tickItem: any) => {
    const date = new Date(tickItem)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: timeRange === '1Y' || timeRange === 'ALL' ? 'numeric' : undefined
    })
  }

  const formatTooltip = (value: number, name: string) => {
    const selectedCurrencyInfo = currencies.find(c => c.code === selectedCurrency)
    return [`${selectedCurrencyInfo?.symbol}${value.toLocaleString()}`, name]
  }

  const selectedCurrencyInfo = currencies.find(c => c.code === selectedCurrency)

  // Chart configuration for ShadCN
  const chartConfig = {
    price: {
      label: "BTC Price",
      color: "#f7931a",
    },
  }

  return (
    <Card className={`border-2 border-orange-500/30 bg-gray-900/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Bitcoin Price History
            </CardTitle>
            <CardDescription className="text-orange-100">
              Historical price data and live updates
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastLiveUpdate && (
              <Badge variant="secondary" className="bg-green-900/80 text-green-300 border-green-500/30">
                <Clock className="h-3 w-3 mr-1" />
                Updated {lastLiveUpdate.toLocaleTimeString()}
              </Badge>
            )}
            {updateStatus && (
              <Badge variant="secondary" className="bg-blue-900/80 text-blue-300 border-blue-500/30">
                {updateStatus}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Time Range:</span>
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-24 border-orange-500/30 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="7D">7D</SelectItem>
                <SelectItem value="30D">30D</SelectItem>
                <SelectItem value="90D">90D</SelectItem>
                <SelectItem value="1Y">1Y</SelectItem>
                <SelectItem value="ALL">ALL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">Currency:</span>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="w-32 border-orange-500/30 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
                {currencies.map(currency => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={loadData} 
            disabled={isLoading}
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Price Display */}
        {currentPrice > 0 && (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-500/30 rounded-lg">
            <div>
              <div className="text-sm text-green-400">Current Price</div>
              <div className="text-2xl font-bold text-green-300">
                {selectedCurrencyInfo?.symbol}{currentPrice.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Change ({timeRange})</div>
              <div className={`text-lg font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-400 mb-2">Error loading data</div>
                <div className="text-gray-400 text-sm">{error}</div>
              </div>
            </div>
          ) : data.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-full">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatXAxisTick}
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => `${selectedCurrencyInfo?.symbol}${value.toLocaleString()}`}
                />
                <ChartTooltip 
                  content={({ active, payload, label }) => (
                    <ChartTooltipContent
                      active={active}
                      payload={payload}
                      label={label}
                      labelFormatter={(label) => new Date(label).toLocaleString()}
                      formatter={formatTooltip}
                      className="bg-gray-900 border-gray-700 text-white"
                    />
                  )}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#f7931a" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#f7931a' }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <div className="text-gray-400">No data available</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 