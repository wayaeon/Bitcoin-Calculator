"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, TrendingUp, Database, Clock, BarChart3, Calendar, DollarSign, ZoomOut } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { AreaChart, Area } from 'recharts'
import { convertCurrency, getSupportedCurrencies } from '@/lib/currency-api'
import { formatYAxisValue, formatPrice } from '@/lib/btc-calculator'
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
  const [fullData, setFullData] = useState<BTCPriceData[]>([]) // Store full dataset for calculators
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
  
  // X-axis zoom functionality
  const [left, setLeft] = useState<number>(0)
  const [right, setRight] = useState<number>(0)
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [lastPresetRange, setLastPresetRange] = useState<'1D' | '7D' | '30D' | '90D' | '1Y' | '5Y' | '10Y' | 'ALL'>('1Y')

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

  // Fetch exchange rates from stored file
  const fetchExchangeRates = useCallback(async () => {
    try {
      console.log('Loading exchange rates from stored file...')
      const response = await fetch('/api/currency?base=USD')
      
      if (!response.ok) {
        throw new Error('Failed to fetch currency rates')
      }
      
      const data = await response.json()
      const rateMap: {[key: string]: number} = {}
      
      // Build rate map from stored data
      for (const currency of currencies) {
        if (data.data[currency.code]) {
          rateMap[currency.code] = data.data[currency.code].value
          console.log(`Rate for ${currency.code}: ${data.data[currency.code].value}`)
        } else {
          rateMap[currency.code] = 1 // Fallback for USD
        }
      }
      
      setExchangeRates(rateMap)
      console.log('Exchange rates loaded from file:', rateMap)
    } catch (error) {
      console.error('Error loading exchange rates from file:', error)
      // Set default rates if file read fails
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
      console.log('Using default exchange rates:', defaultRates)
    }
  }, [currencies])

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
      const response = await fetch('/BTC Price History.csv')
      if (!response.ok) {
        throw new Error('Failed to load CSV data')
      }
      
      const csvText = await response.text()
      const lines = csvText.split('\n')
      const headers = lines[0].split(',')
      
      const csvData = lines.slice(1).map(line => {
        const values = line.split(',')
        
        // Handle inconsistent CSV format - some rows have extra columns
        const startDate = values[0]?.trim()
        const endDate = values[1]?.trim()
        const open = parseFloat(values[2]) || 0
        const high = parseFloat(values[3]) || 0
        const low = parseFloat(values[4]) || 0
        const close = parseFloat(values[5]) || 0
        const volume = parseFloat(values[6]) || 0
        const marketCap = parseFloat(values[7]) || 0
        
        // Debug logging for problematic dates
        if (startDate && startDate.includes('2009') || startDate?.includes('2010')) {
          console.log(`Processing row: ${startDate} -> ${endDate}, Close: ${close}`)
        }
        
        return {
          Start: startDate,
          End: endDate,
          Open: open,
          High: high,
          Low: low,
          Close: close,
          Volume: volume,
          'Market Cap': marketCap
        }
      }).filter(row => row.Close > 0 && row.Start)
      
      // Convert to BTCPriceData (CSV is already in reverse chronological order - newest first)
      const priceData = csvData.map(row => {
        // Validate date format
        const dateStr = row.Start
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          console.error(`Invalid date format: ${dateStr}`)
          return null
        }
        
        const timestamp = new Date(dateStr).getTime()
        
        // Validate timestamp
        if (isNaN(timestamp)) {
          console.error(`Invalid timestamp for date: ${dateStr}`)
          return null
        }
        
        console.log(`Parsing date: ${dateStr} -> ${new Date(timestamp).toISOString()}`)
        
        return {
          timestamp,
        price: row.Close,
        volume: row.Volume,
        marketCap: row['Market Cap']
        }
      }).filter(Boolean) // CSV is now in chronological order (oldest first)
      
      return priceData
    } catch (error) {
      console.error('Error loading CSV data:', error)
      throw error
    }
  }, [])

  const filterDataByTimeRange = useCallback((allData: BTCPriceData[], range: string): BTCPriceData[] => {
    if (allData.length === 0) return []
    
    // Data is in chronological order (oldest first), so last item is latest
    const latestTimestamp = allData[allData.length - 1].timestamp
    const oneDay = 24 * 60 * 60 * 1000
    const oneYear = 365 * oneDay
    
    let startTime: number
    
    switch (range) {
      case '1D':
        startTime = latestTimestamp - oneDay
        break
      case '7D':
        startTime = latestTimestamp - 7 * oneDay
        break
      case '30D':
        startTime = latestTimestamp - 30 * oneDay
        break
      case '90D':
        startTime = latestTimestamp - 90 * oneDay
        break
      case '1Y':
        startTime = latestTimestamp - oneYear
        break
      case '5Y':
        startTime = latestTimestamp - 5 * oneYear
        break
      case '10Y':
        startTime = latestTimestamp - 10 * oneYear
        break
      case 'ALL':
        return allData
      default:
        startTime = latestTimestamp - oneYear
    }
    
    // Filter data that's within the time range (oldest to newest)
    const filteredData = allData.filter(item => item.timestamp >= startTime)
    console.log(`Filtering for ${range}: ${allData.length} total records, ${filteredData.length} after filtering, startTime: ${new Date(startTime).toISOString()}, latest: ${new Date(latestTimestamp).toISOString()}`)
    return filteredData
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const allData = await loadCSVData()
      console.log(`Loaded ${allData.length} total data points`)
      console.log(`Data range: ${new Date(allData[0]?.timestamp).toISOString()} to ${new Date(allData[allData.length - 1]?.timestamp).toISOString()}`)
      
      // Store full dataset for calculators
      setFullData(allData)
      
      const filteredData = filterDataByTimeRange(allData, timeRange)
      
      if (filteredData.length === 0) {
        throw new Error(`No data available for ${timeRange} range`)
      }
      
      setData(filteredData)
      console.log(`Set ${filteredData.length} data points for ${timeRange} range`)
      
      // Note: current price and price change will be calculated by the currency conversion useEffect
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [loadCSVData, filterDataByTimeRange, timeRange])

  const checkForLiveUpdates = useCallback(async () => {
    try {
      const response = await fetch('/api/update-btc-csv', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        if (data.shouldUpdate) {
          setUpdateStatus('Updating CSV data...')
          const updateResponse = await fetch('/api/update-btc-csv', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ days: 1 })
          })
          if (updateResponse.ok) {
            setLastLiveUpdate(new Date())
            setUpdateStatus('CSV data updated successfully')
            setLastUpdateTime(new Date().toLocaleTimeString())
            setTimeout(() => setUpdateStatus(''), 3000)
            // Reload data after update
            setTimeout(() => loadData(), 1000)
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }, [loadData])

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
    
    // For zoomed view, show more detailed dates based on zoom range
    if (isZoomed && left !== right) {
      const daysDiff = Math.abs(right - left)
      if (daysDiff <= 7) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (daysDiff <= 30) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else if (daysDiff <= 90) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }
    }
    
    // For normal view, use time range based formatting
    if (timeRange === '1D') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } else if (timeRange === '7D' || timeRange === '30D') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (timeRange === '90D') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } else if (timeRange === '1Y') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    } else if (timeRange === '5Y' || timeRange === '10Y') {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    } else {
      // For ALL time range, show more detailed dates
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
  }, [timeRange, isZoomed, left, right])

  const selectedCurrencyInfo = useMemo(() => 
    currencies.find(c => c.code === selectedCurrency), [currencies, selectedCurrency]
  )

  // X-axis zoom functions
  const zoom = () => {
    if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      return
    }

    const startIndex = Math.min(refAreaLeft, refAreaRight)
    const endIndex = Math.max(refAreaLeft, refAreaRight)
    
    // Ensure we have valid indices within the data range
    if (startIndex >= 0 && endIndex < convertedData.length && startIndex !== endIndex) {
      setLeft(startIndex)
      setRight(endIndex)
      setIsZoomed(true)
      // Store current preset range before zooming to custom
      setLastPresetRange(timeRange)
    }
    
    setRefAreaLeft(null)
    setRefAreaRight(null)
  }

  const zoomOut = () => {
    setLeft(0)
    setRight(0)
    setRefAreaLeft(null)
    setRefAreaRight(null)
    setIsZoomed(false)
    // Return to the last preset range
    setTimeRange(lastPresetRange)
  }

  const handleMouseDown = (e: any) => {
    if (!e || e.activeLabel === undefined) return
    // Find the index of the data point closest to the clicked position
    const index = convertedData.findIndex(item => item.timestamp === e.activeLabel)
    if (index !== -1) {
      setRefAreaLeft(index)
      setRefAreaRight(index) // Initialize right to same position for smoother selection
    }
  }

  const handleMouseMove = (e: any) => {
    if (!e || e.activeLabel === undefined || refAreaLeft === null) return
    // Find the index of the data point closest to the current position
    const index = convertedData.findIndex(item => item.timestamp === e.activeLabel)
    if (index !== -1 && index !== refAreaRight) {
      setRefAreaRight(index)
    }
  }

  const handleMouseUp = () => {
    if (refAreaLeft !== null && refAreaRight !== null && refAreaLeft !== refAreaRight) {
      zoom()
    } else {
      // Reset if no valid selection
      setRefAreaLeft(null)
      setRefAreaRight(null)
    }
  }

  const handleDoubleClick = () => {
    zoomOut()
  }

  // Notify parent component when data changes - pass full dataset for calculators
  useEffect(() => {
    if (onDataUpdate && fullData.length > 0 && Object.keys(exchangeRates).length > 0) {
      // Convert the full dataset (not filtered) for calculators
      const fullConvertedData = convertDataToCurrency(fullData, selectedCurrency)
      onDataUpdate(fullConvertedData, selectedCurrency, selectedCurrencyInfo?.symbol || '$')
    }
  }, [fullData, selectedCurrency, selectedCurrencyInfo, onDataUpdate, exchangeRates, convertDataToCurrency])

  // Convert data when currency changes (only when rates are available)
  useEffect(() => {
    if (data.length > 0 && Object.keys(exchangeRates).length > 0) {
      const converted = convertDataToCurrency(data, selectedCurrency)
      setConvertedData(converted)
      
      // Update current price and price change for the new currency
      if (converted.length > 0) {
        const latest = converted[converted.length - 1]
        const earliest = converted[0]
        
        setCurrentPrice(latest.price)
        setPriceChange(((latest.price - earliest.price) / earliest.price) * 100)
      }
    }
  }, [data, selectedCurrency, convertDataToCurrency, exchangeRates])

  // Fetch exchange rates on mount
  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  // Initial currency conversion when data and rates are available
  useEffect(() => {
    if (data.length > 0 && Object.keys(exchangeRates).length > 0) {
      const converted = convertDataToCurrency(data, selectedCurrency)
      setConvertedData(converted)
      
      // Update current price and price change for the new currency
      if (converted.length > 0) {
        const latest = converted[converted.length - 1]
        const earliest = converted[0]
        
        setCurrentPrice(latest.price)
        setPriceChange(((latest.price - earliest.price) / earliest.price) * 100)
      }
    }
  }, [data, exchangeRates, selectedCurrency, convertDataToCurrency])

  // Update price calculations when zoom state changes
  useEffect(() => {
    if (convertedData.length > 0) {
      // Use filtered data based on current range
      let filteredData = convertedData
      
      // Apply zoom filter if zoomed
      if (isZoomed && left !== right && left >= 0 && right < convertedData.length) {
        filteredData = convertedData.slice(left, right + 1)
      }
      
      const latest = filteredData[filteredData.length - 1]
      const earliest = filteredData[0]
      
      setCurrentPrice(latest.price)
      setPriceChange(((latest.price - earliest.price) / earliest.price) * 100)
    }
  }, [convertedData, isZoomed, left, right])

  // Calculate Y-axis domain and ticks for better chart visibility
  const yAxisConfig = useMemo(() => {
    if (convertedData.length === 0) return { domain: [0, 'auto'], ticks: [] }
    
    let filteredData = convertedData
    
    // Apply zoom filter if zoomed
    if (isZoomed && left !== right && left >= 0 && right < convertedData.length) {
      filteredData = convertedData.slice(left, right + 1)
    }
    
    const prices = filteredData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const range = maxPrice - minPrice
    
    // Start 5% below the minimum price for better visibility
    const start = Math.max(0, minPrice - (range * 0.05))
    
    // Generate ticks based on range and multiples of 2 for granular display
    const generateTicks = (min: number, max: number) => {
      const range = max - min
      let step: number
      
      // Ensure we have a valid range
      if (range <= 0) {
        return [min, max]
      }
      
      // Calculate appropriate step size based on range
      if (range > 100000) {
        // For large ranges (e.g., $100k to $107k), use smaller steps
        step = Math.max(1000, Math.pow(2, Math.floor(Math.log2(range / 8))) * 1000)
      } else if (range > 10000) {
        step = Math.max(100, Math.pow(2, Math.floor(Math.log2(range / 8))) * 100)
      } else if (range > 1000) {
        step = Math.max(10, Math.pow(2, Math.floor(Math.log2(range / 8))) * 10)
      } else if (range > 100) {
        step = Math.max(1, Math.pow(2, Math.floor(Math.log2(range / 8))))
      } else if (range > 10) {
        step = Math.max(0.1, Math.pow(2, Math.floor(Math.log2(range / 8))) * 0.1)
      } else if (range > 1) {
        step = Math.max(0.01, Math.pow(2, Math.floor(Math.log2(range / 8))) * 0.01)
      } else {
        step = Math.max(0.001, Math.pow(2, Math.floor(Math.log2(range / 8))) * 0.001)
      }
      
      // Ensure step is not too large
      if (step > range / 2) {
        step = range / 4
      }
      
      const ticks = []
      let current = Math.ceil(min / step) * step
      
      // Generate ticks with better granularity for smaller ranges
      while (current <= max && ticks.length < 12) {
        ticks.push(current)
        current += step
      }
      
      // If we don't have enough ticks, add more
      if (ticks.length < 3) {
        const simpleStep = range / 4
        ticks.length = 0
        for (let i = 0; i <= 4; i++) {
          ticks.push(min + (simpleStep * i))
        }
      }
      
      return ticks
    }
    
    const ticks = generateTicks(start, maxPrice)
    
    // Debug logging
    console.log('Y-axis config:', { minPrice, maxPrice, range, start, ticks })
    
    // Fallback to automatic ticks if our custom ticks are empty or invalid
    const finalTicks = ticks && ticks.length > 0 ? ticks : undefined
    
    return { domain: [start, 'auto'] as [number, 'auto'], ticks: finalTicks }
  }, [convertedData, isZoomed, left, right])

  // Custom cursor component with horizontal line
  const CustomCursor = ({ x, y, width, height }: any) => {
    if (!x || !y) return null
    
    return (
      <g>
        {/* Vertical line */}
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#f7931a"
          strokeWidth={2}
          strokeDasharray="3 3"
          opacity={0.8}
        />
        {/* Horizontal line */}
        <line
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#f7931a"
          strokeWidth={2}
          strokeDasharray="3 3"
          opacity={0.8}
        />
      </g>
    )
  }

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

  // Create chart data without markers
  const chartData = useMemo(() => {
    if (convertedData.length === 0) return []
    
    let filteredData = convertedData
    
    // Apply zoom filter if zoomed
    if (isZoomed && left !== right && left >= 0 && right < convertedData.length) {
      filteredData = convertedData.slice(left, right + 1)
    }
    
    const result = filteredData.map((item) => {
      return {
        ...item,
        showDot: false
      }
    })
    
    // Debug logging
    if (result.length > 0) {
      console.log('Chart data sample:', result.slice(0, 3))
      console.log('Price range:', Math.min(...result.map(d => d.price)), 'to', Math.max(...result.map(d => d.price)))
    }
    
    return result
  }, [convertedData, isZoomed, left, right])

  return (
    <div className={`w-full h-full py-2 sm:py-4 flex flex-col ${className}`}>
      {/* Chart Section - Flexible Height */}
      <div className="flex-1 min-h-0 relative">
        
        {/* Header Section - Compact and Horizontal */}
        <div className="mb-4">
          
          {/* Compact Header Row - Everything in one line */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            {/* Left: Title and Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">Bitcoin Price Chart</h3>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
              
              {/* Time Range Selector - Compact */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Range:</Label>
                <Select 
                  value={isZoomed ? 'CUSTOM' : timeRange} 
                  onValueChange={(value: any) => {
                    if (value !== 'CUSTOM') {
                      setTimeRange(value)
                      setIsZoomed(false)
                      setLeft(0)
                      setRight(0)
                    }
                  }}
                  disabled={isZoomed}
                >
                  <SelectTrigger className={`h-8 w-24 border-gray-600 transition-colors ${
                    isZoomed 
                      ? 'bg-orange-600/20 border-orange-500 text-orange-300' 
                      : 'bg-gray-800/50 text-white hover:bg-gray-800/70'
                  }`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="1D" className="text-white hover:bg-gray-700">1D</SelectItem>
                    <SelectItem value="7D" className="text-white hover:bg-gray-700">7D</SelectItem>
                    <SelectItem value="30D" className="text-white hover:bg-gray-700">30D</SelectItem>
                    <SelectItem value="90D" className="text-white hover:bg-gray-700">90D</SelectItem>
                    <SelectItem value="1Y" className="text-white hover:bg-gray-700">1Y</SelectItem>
                    <SelectItem value="5Y" className="text-white hover:bg-gray-700">5Y</SelectItem>
                    <SelectItem value="10Y" className="text-white hover:bg-gray-700">10Y</SelectItem>
                    <SelectItem value="ALL" className="text-white hover:bg-gray-700">ALL</SelectItem>
                    {isZoomed && (
                      <SelectItem value="CUSTOM" className="text-orange-300 bg-orange-900/20" disabled>
                        Custom
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Currency Selector - Compact */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-gray-400">Currency:</Label>
                <Select value={selectedCurrency} onValueChange={(value: any) => setSelectedCurrency(value)}>
                  <SelectTrigger className="h-8 w-20 border-gray-600 bg-gray-800/50 text-white hover:bg-gray-800/70 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code} className="text-white hover:bg-gray-700">
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Zoom Reset Button - Compact */}
              {isZoomed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={zoomOut}
                  className="h-8 px-2 border-orange-500 bg-orange-600/20 text-orange-300 hover:bg-orange-600/30 transition-colors"
                  title={`Reset to ${lastPresetRange}`}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Right: Refresh Button */}
            <Button
              size="sm"
              onClick={loadData}
              className="h-8 px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg hover:shadow-orange-500/25 transition-all duration-200"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
          
          {/* Prominent Stats Container */}
          {convertedData.length > 0 && (() => {
            // Use filtered data based on current range
            let filteredData = convertedData
            
            // Apply zoom filter if zoomed
            if (isZoomed && left !== right && left >= 0 && right < convertedData.length) {
              filteredData = convertedData.slice(left, right + 1)
            }
            
            const startingPrice = filteredData[0].price
            const endingPrice = filteredData[filteredData.length - 1].price
            const rangePriceChange = ((endingPrice - startingPrice) / startingPrice) * 100
            
            return (
              <div className="bg-gradient-to-r from-gray-800/80 to-gray-900/80 rounded-xl border border-gray-600/50 px-6 py-4 backdrop-blur-sm shadow-xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">Starting Price</div>
                    <div className="text-lg font-bold text-purple-400">
                      {formatPrice(startingPrice, selectedCurrencyInfo?.symbol)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">Current Price</div>
                    <div className="text-lg font-bold text-orange-400">
                      {formatPrice(endingPrice, selectedCurrencyInfo?.symbol)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">Change</div>
                    <div className={`text-lg font-bold ${rangePriceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {rangePriceChange >= 0 ? '+' : ''}{rangePriceChange.toFixed(2)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-400 mb-1 font-medium">Date Range</div>
                    <div className="text-sm font-medium text-white">
                      {new Date(filteredData[0].timestamp).toLocaleDateString()} - {new Date(filteredData[filteredData.length - 1].timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
        
        {/* Chart Container - Responsive Height - Extends to bottom stats */}
        <div className="w-full h-[calc(100vh-220px)] sm:h-[calc(100vh-270px)] lg:h-[calc(100vh-270px)] bg-gray-800/20 rounded-lg border border-gray-700/30 p-3 sm:p-4 lg:p-6 pb-8 sm:pb-10 lg:pb-12 relative mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-red-400 mb-2">Error loading data</div>
                <div className="text-gray-400 text-sm">{error}</div>
              </div>
            </div>
          ) : convertedData.length > 0 ? (
            <>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={chartData}
                margin={{ top: 5, right: 1, left: -28, bottom: 5 }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                syncId="btc-chart"
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
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  minTickGap={24}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickFormatter={formatYAxisValue}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  domain={yAxisConfig.domain}
                  allowDataOverflow={false}
                />
                                 <ChartTooltip
                  cursor={<CustomCursor />}
                  content={renderTooltipContent}
                />
                {/* Selection cursor - shows during drag */}
                {refAreaLeft !== null && (
                  <ReferenceLine
                    x={convertedData[refAreaLeft]?.timestamp}
                    stroke="#f7931a"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    opacity={0.8}
                  />
                )}
                <Area
                  dataKey="price"
                  type={timeRange === '1D' || timeRange === '7D' || timeRange === '30D' ? 'monotone' : 'natural'}
                  fill="url(#fillBTCPrice)"
                  stroke="#f7931a"
                  strokeWidth={2}
                  name="Price"
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    if (!payload.showDot) return <></>
                    
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={payload.dotColor}
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                        {payload.dotLabel && (
                          <text
                            x={cx}
                            y={cy - 12}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="8"
                            fontWeight="bold"
                          >
                            {payload.dotLabel}
                          </text>
                        )}
                      </g>
                    )
                  }}
                />
                {refAreaLeft !== null && refAreaRight !== null ? (
                  <ReferenceArea
                    x1={convertedData[refAreaLeft]?.timestamp}
                    x2={convertedData[refAreaRight]?.timestamp}
                    stroke="#f7931a"
                    strokeOpacity={0.6}
                    strokeWidth={2}
                    fill="#f7931a"
                    fillOpacity={0.2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Date Range Selection Overlay - Positioned at top, non-interactive */}
            {refAreaLeft !== null && refAreaRight !== null && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-gray-900/80 border border-orange-500/30 rounded-lg px-3 py-2 text-center shadow-lg backdrop-blur-sm">
                  <div className="text-orange-400 font-medium text-sm select-none">
                    Selecting Range
                  </div>
                  {(() => {
                    const startDate = new Date(convertedData[refAreaLeft]?.timestamp || 0)
                    const endDate = new Date(convertedData[refAreaRight]?.timestamp || 0)
                    const daysDiff = Math.abs(refAreaRight - refAreaLeft)
                    return (
                      <>
                        <div className="text-white font-semibold text-xs select-none">
                          {startDate.toLocaleDateString()} → {endDate.toLocaleDateString()}
                        </div>
                        <div className="text-orange-300 text-xs select-none">
                          {daysDiff} day{daysDiff !== 1 ? 's' : ''}
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Database className="h-8 w-8 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-2 sm:mb-4" />
                <div className="text-gray-400 text-sm sm:text-base">No data available</div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Statistics - Responsive Grid - Always Visible */}
        {convertedData.length > 0 && (
          <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 sm:pt-6">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">24h Volume</div>
              <div className="text-xs sm:text-sm font-bold text-white">
                {selectedCurrencyInfo?.symbol}{(convertedData[convertedData.length - 1].volume || 0).toLocaleString(undefined, { 
                  minimumFractionDigits: 1, 
                  maximumFractionDigits: 1 
                })}B
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Market Cap</div>
              <div className="text-xs sm:text-sm font-bold text-white">
                {selectedCurrencyInfo?.symbol}{((convertedData[convertedData.length - 1].marketCap || 0) / 1e12).toFixed(1)}T
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">All-Time High</div>
              <div className="text-xs sm:text-sm font-bold text-white">
                {selectedCurrencyInfo?.symbol}120,000
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Circulating Supply</div>
              <div className="text-xs sm:text-sm font-bold text-white">19.8M BTC</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})