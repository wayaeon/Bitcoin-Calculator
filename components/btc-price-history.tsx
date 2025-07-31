"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, Database, Clock, BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { AreaChart, Area } from 'recharts'
import { convertCurrency, getSupportedCurrencies } from '@/lib/currency-api'
import { BTCChartTooltipEnhanced } from '@/components/btc-chart-tooltip'

interface BTCPriceData {
  timestamp: number
  price: number
  volume?: number
  marketCap?: number
}

interface BTCPriceHistoryProps {
  className?: string
  onDataUpdate?: (data: any[], currency: string, currencySymbol: string) => void
}

export const BTCPriceHistory = React.memo(function BTCPriceHistory({ className, onDataUpdate }: BTCPriceHistoryProps) {
  const [data, setData] = useState<BTCPriceData[]>([])
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '30D' | '90D' | '1Y' | '5Y' | '10Y' | 'ALL'>('1Y')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [convertedData, setConvertedData] = useState<BTCPriceData[]>([])
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({})
  const [showGridlines, setShowGridlines] = useState(true)
  const [chartTheme, setChartTheme] = useState<'default' | 'dark' | 'light'>('default')
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')

  const currencies = useMemo(() => [
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
  ], [])

  // Fetch exchange rates when currency changes
  const fetchExchangeRates = useCallback(async () => {
    try {
      console.log('Fetching exchange rates...')
      const rates = await getSupportedCurrencies()
      const rateMap: {[key: string]: number} = {}
      
      // Get rates for all supported currencies
      for (const currency of rates) {
        if (currency !== 'USD') {
          const converted = await convertCurrency(1, 'USD', currency)
          rateMap[currency] = converted
          console.log(`Rate for ${currency}: ${converted}`)
        } else {
          rateMap[currency] = 1
        }
      }
      
      setExchangeRates(rateMap)
      console.log('Exchange rates loaded:', rateMap)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      // Set default rates if API fails
      const defaultRates = {
        'USD': 1,
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110,
        'CAD': 1.25,
        'AUD': 1.35,
        'CHF': 0.92,
        'CNY': 6.45,
        'INR': 74,
        'BRL': 5.2,
        'KRW': 1150,
        'RUB': 75,
        'MXN': 20,
        'SGD': 1.35,
        'HKD': 7.8,
        'NZD': 1.4,
        'SEK': 8.5,
        'NOK': 8.8,
        'DKK': 6.3,
        'PLN': 3.8
      }
      setExchangeRates(defaultRates)
    }
  }, [])

  // Convert data to selected currency
  const convertDataToCurrency = useCallback((data: BTCPriceData[], targetCurrency: string) => {
    if (targetCurrency === 'USD') return data
    
    const rate = exchangeRates[targetCurrency] || 1
    return data.map(item => ({
      ...item,
      price: item.price * rate,
      volume: item.volume ? item.volume * rate : undefined,
      marketCap: item.marketCap ? item.marketCap * rate : undefined
    }))
  }, [exchangeRates])

  // Load CSV data
  const loadCSVData = useCallback(async (): Promise<BTCPriceData[]> => {
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
      
      // Convert to BTCPriceData and sort by timestamp (oldest first)
      const priceData = csvData.map(row => ({
        timestamp: new Date(row.End).getTime(),
        price: row.Close,
        volume: row.Volume,
        marketCap: row['Market Cap']
      })).sort((a, b) => a.timestamp - b.timestamp) // Sort chronologically
      
      return priceData
    } catch (error) {
      console.error('Error loading CSV data:', error)
      throw error
    }
  }, [])

  const filterDataByTimeRange = useCallback((allData: BTCPriceData[], range: string): BTCPriceData[] => {
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
      case '5Y':
        startTime = now - 5 * oneYear
        break
      case '10Y':
        startTime = now - 10 * oneYear
        break
      case 'ALL':
        return allData
      default:
        startTime = now - oneYear
    }
    
    return allData.filter(item => item.timestamp >= startTime)
  }, [])

  const loadData = useCallback(async () => {
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
  }, [loadCSVData, filterDataByTimeRange, timeRange])

  const checkForLiveUpdates = useCallback(async () => {
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
            setLastUpdateTime(new Date().toLocaleTimeString())
            setTimeout(() => setUpdateStatus(''), 3000)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    checkForLiveUpdates()
    const interval = setInterval(checkForLiveUpdates, 5 * 60 * 1000) // Check every 5 minutes
    return () => clearInterval(interval)
  }, [checkForLiveUpdates])

  const formatXAxisTick = useCallback((tickItem: any) => {
    const date = new Date(tickItem)
    if (timeRange === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (timeRange === '7D' || timeRange === '30D') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (timeRange === '5Y' || timeRange === '10Y') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    }
  }, [timeRange])

  const selectedCurrencyInfo = useMemo(() => 
    currencies.find(c => c.code === selectedCurrency), [currencies, selectedCurrency]
  )

  // Notify parent component when data changes
  useEffect(() => {
    if (onDataUpdate && convertedData.length > 0) {
      onDataUpdate(convertedData, selectedCurrency, selectedCurrencyInfo?.symbol || '$')
    }
  }, [convertedData, selectedCurrency, selectedCurrencyInfo, onDataUpdate])

  // Convert data when currency changes
  useEffect(() => {
    if (data.length > 0) {
      const converted = convertDataToCurrency(data, selectedCurrency)
      setConvertedData(converted)
    }
  }, [data, selectedCurrency, convertDataToCurrency])

  // Fetch exchange rates on mount
  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  // Calculate Y-axis domain for better chart visibility
  const yAxisDomain = useMemo(() => {
    if (convertedData.length === 0) return [0, 'auto']
    
    const prices = convertedData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice
    
    // Start 5% below the minimum price for better visibility
    const start = Math.max(0, minPrice - (range * 0.05))
    
    return [start, 'auto'] as [number, 'auto']
  }, [convertedData])

  // Use the independent tooltip component
  const renderTooltipContent = useCallback(({ active, payload, label }: any) => {
    const selectedCurrencyInfo = currencies.find(c => c.code === selectedCurrency)
    
    return (
      <BTCChartTooltipEnhanced
        active={active}
        payload={payload}
        label={label}
        selectedCurrency={selectedCurrency}
        selectedCurrencySymbol={selectedCurrencyInfo?.symbol || '$'}
        data={data}
        convertedData={convertedData}
        showVolume={true}
        showMarketCap={true}
        showPercentageChange={true}
        customStyling={{
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(55, 65, 81, 1)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      />
    )
  }, [currencies, selectedCurrency, data, convertedData])

  // Create chart data with only starting and current price markers
  const chartData = useMemo(() => {
    if (convertedData.length === 0) return []
    
    const startPrice = convertedData[0]
    const endPrice = convertedData[convertedData.length - 1]
    
    return convertedData.map((item, index) => {
      const isStart = index === 0
      const isEnd = index === convertedData.length - 1
      
      return {
        ...item,
        showDot: isStart || isEnd,
        dotColor: isStart ? '#8b5cf6' : '#22c55e', // Purple for start, green for end
        dotLabel: isEnd ? 'Current' : null // Removed 'Starting' label
      }
    })
  }, [convertedData])

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Top Controls and Stats Section */}
      <div className="mb-6">
        {/* Controls Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="h-9 text-sm border-gray-600 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="1D" className="text-white hover:bg-gray-700">1 Day</SelectItem>
                <SelectItem value="7D" className="text-white hover:bg-gray-700">7 Days</SelectItem>
                <SelectItem value="30D" className="text-white hover:bg-gray-700">30 Days</SelectItem>
                <SelectItem value="90D" className="text-white hover:bg-gray-700">90 Days</SelectItem>
                <SelectItem value="1Y" className="text-white hover:bg-gray-700">1 Year</SelectItem>
                <SelectItem value="5Y" className="text-white hover:bg-gray-700">5 Years</SelectItem>
                <SelectItem value="10Y" className="text-white hover:bg-gray-700">10 Years</SelectItem>
                <SelectItem value="ALL" className="text-white hover:bg-gray-700">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCurrency} onValueChange={(value: any) => setSelectedCurrency(value)}>
              <SelectTrigger className="h-9 text-sm border-gray-600 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code} className="text-white hover:bg-gray-700">
                    {currency.code} - {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            size="sm"
            onClick={loadData}
            className="h-9 text-sm bg-orange-600 hover:bg-orange-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>

        {/* Stats Cards Row */}
        {convertedData.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <div className="text-sm text-gray-400 mb-1">Starting</div>
              <div className="text-xl font-bold text-purple-400">
                {selectedCurrencyInfo?.symbol}{convertedData[0].price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <div className="text-sm text-gray-400 mb-1">Change</div>
              <div className={`text-xl font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
              </div>
            </div>
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
              <div className="text-sm text-gray-400 mb-1">Current</div>
              <div className="text-xl font-bold text-orange-400">
                {selectedCurrencyInfo?.symbol}{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="space-y-4">
        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Price Chart</h3>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-400">Bitcoin (BTC)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {convertedData.length > 0 && (
              <span>
                {new Date(convertedData[0].timestamp).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })} - {new Date(convertedData[convertedData.length - 1].timestamp).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </span>
            )}
          </div>
        </div>
        
        {/* Chart Container */}
        <div className="w-full h-[calc(100vh-500px)] bg-gray-800/20 rounded-lg border border-gray-700/30 p-6">
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
          ) : convertedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                             <AreaChart 
                 data={chartData}
                 margin={{ top: 5, right: 1, left: -28, bottom: 1 }}
               >
                <defs>
                  <linearGradient id="fillBTCPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#8b5cf6"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="50%"
                      stopColor="#f7931a"
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="100%"
                      stopColor="#22c55e"
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 1" stroke="#374151" opacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatXAxisTick}
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickFormatter={(value) => `${selectedCurrencyInfo?.symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  domain={yAxisDomain as [number, 'auto']}
                />
                                 <ChartTooltip
                   cursor={{
                     stroke: '#f7931a',
                     strokeWidth: 1,
                     strokeDasharray: '3 3'
                   }}
                   content={renderTooltipContent}
                 />
                <Area
                  dataKey="price"
                  type="natural"
                  fill="url(#fillBTCPrice)"
                  stroke="#f7931a"
                  strokeWidth={3}
                  name="Price"
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!payload.showDot) return <></>
                    
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.dotColor}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        {payload.dotLabel && (
                          <text
                            x={cx}
                            y={cy - 15}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {payload.dotLabel}
                          </text>
                        )}
                      </g>
                    )
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Database className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <div className="text-gray-400">No data available</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Statistics */}
      {convertedData.length > 0 && (
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-gray-700/30">
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">24h Volume</div>
            <div className="text-sm font-bold text-white">
              {selectedCurrencyInfo?.symbol}{(convertedData[convertedData.length - 1].volume || 0).toLocaleString(undefined, { 
                minimumFractionDigits: 1, 
                maximumFractionDigits: 1 
              })}B
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Market Cap</div>
            <div className="text-sm font-bold text-white">
              {selectedCurrencyInfo?.symbol}{((convertedData[convertedData.length - 1].marketCap || 0) / 1e12).toFixed(1)}T
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">All-Time High</div>
            <div className="text-sm font-bold text-white">
              {selectedCurrencyInfo?.symbol}120,000
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Circulating Supply</div>
            <div className="text-sm font-bold text-white">19.8M BTC</div>
          </div>
        </div>
      )}
    </div>
  )
}) 