"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Check, ChevronDown } from 'lucide-react'
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
import { formatPrice } from '@/lib/btc-calculator'
import { BTCChartTooltipEnhanced } from '@/components/btc-chart-tooltip'
import { useBTCPrice } from '@/hooks/use-btc-price'

interface BTCPriceData {
  timestamp: number
  price: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  marketCap?: number
  circulatingSupply?: number
  dataSource?: string
}

interface BTCPriceHistoryProps {
  className?: string
  onDataUpdate?: (data: any[], currency: string, currencySymbol: string) => void
}

// ponytail: constants outside component — never reconstructed on render
const CURRENCIES = [
  { code: 'USD', symbol: '$',    name: 'US Dollar',          flag: '🇺🇸' },
  { code: 'EUR', symbol: '€',    name: 'Euro',               flag: '🇪🇺' },
  { code: 'GBP', symbol: '£',    name: 'British Pound',      flag: '🇬🇧' },
  { code: 'JPY', symbol: '¥',    name: 'Japanese Yen',       flag: '🇯🇵' },
  { code: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',    flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$',   name: 'Australian Dollar',  flag: '🇦🇺' },
  { code: 'CHF', symbol: 'CHF',  name: 'Swiss Franc',        flag: '🇨🇭' },
  { code: 'CNY', symbol: '¥',    name: 'Chinese Yuan',       flag: '🇨🇳' },
  { code: 'INR', symbol: '₹',    name: 'Indian Rupee',       flag: '🇮🇳' },
  { code: 'BRL', symbol: 'R$',   name: 'Brazilian Real',     flag: '🇧🇷' },
  { code: 'KRW', symbol: '₩',    name: 'South Korean Won',   flag: '🇰🇷' },
  { code: 'RUB', symbol: '₽',    name: 'Russian Ruble',      flag: '🇷🇺' },
  { code: 'MXN', symbol: '$',    name: 'Mexican Peso',       flag: '🇲🇽' },
  { code: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',   flag: '🇸🇬' },
  { code: 'HKD', symbol: 'HK$',  name: 'Hong Kong Dollar',   flag: '🇭🇰' },
  { code: 'NZD', symbol: 'NZ$',  name: 'New Zealand Dollar', flag: '🇳🇿' },
  { code: 'SEK', symbol: 'kr',   name: 'Swedish Krona',      flag: '🇸🇪' },
  { code: 'NOK', symbol: 'kr',   name: 'Norwegian Krone',    flag: '🇳🇴' },
  { code: 'DKK', symbol: 'kr',   name: 'Danish Krone',       flag: '🇩🇰' },
  { code: 'PLN', symbol: 'zł',   name: 'Polish Złoty',       flag: '🇵🇱' },
]

export const BTCPriceHistory = React.memo(function BTCPriceHistory({ className, onDataUpdate }: BTCPriceHistoryProps) {
  const [data, setData] = useState<BTCPriceData[]>([])
  const [fullData, setFullData] = useState<BTCPriceData[]>([]) // Store full dataset for calculators
  const [timeRange, setTimeRange] = useState<'1D' | '7D' | '30D' | '60D' | '90D' | '6mo' | '1Y' | '5Y' | '10Y' | 'ALL'>('1Y')
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ponytail: derived — no state, no extra render cycle
  const [lastLiveUpdate, setLastLiveUpdate] = useState<Date | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string>('')
  const [convertedData, setConvertedData] = useState<BTCPriceData[]>([])
  const [exchangeRates, setExchangeRates] = useState<{[key: string]: number}>({})
  const [showGridlines, setShowGridlines] = useState(true)
  const [chartTheme, setChartTheme] = useState<'default' | 'dark' | 'light'>('default')
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  
  // Refs to prevent infinite loops
  const lastUpdateRef = useRef<number>(0)
  const isUpdatingRef = useRef<boolean>(false)
  
  // Real-time BTC price hook
  const { priceData: realTimePriceData } = useBTCPrice()
  
  // X-axis zoom functionality
  const [left, setLeft] = useState<number>(0)
  const [right, setRight] = useState<number>(0)
  // Store timestamps (not convertedData indices) so ReferenceArea aligns with chartData
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null)
  const [isSelectingRange, setIsSelectingRange] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [lastPresetRange, setLastPresetRange] = useState<'1D' | '7D' | '30D' | '60D' | '90D' | '6mo' | '1Y' | '5Y' | '10Y' | 'ALL'>('1Y')
  // Each entry = state before that zoom was applied; pop to step back one level
  // data = high-res fetch for that level (null = slice of convertedData)
  const [zoomStack, setZoomStack] = useState<Array<{ left: number; right: number; data: BTCPriceData[] | null }>>([]);
  const [currentZoomData, setCurrentZoomData] = useState<BTCPriceData[] | null>(null)
  const [isZoomLoading, setIsZoomLoading] = useState(false)
  const [rangeChangeAsDollar, setRangeChangeAsDollar] = useState(false)

  const selectedCurrencyInfo = useMemo(() =>
    CURRENCIES.find(c => c.code === selectedCurrency), [selectedCurrency]
  )

  // The live price feed always returns USD — convert it before displaying/positioning
  // anywhere the selected currency isn't USD (stats card, chart reference line, LIVE badge).
  const liveConvertedPrice = useMemo(() => {
    if (!realTimePriceData) return null
    const rate = exchangeRates[selectedCurrency] || 1
    return realTimePriceData.price * rate
  }, [realTimePriceData, exchangeRates, selectedCurrency])

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
      for (const currency of CURRENCIES) {
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

  // Load data from API instead of CSV
  const loadDataFromAPI = useCallback(async (range: string): Promise<BTCPriceData[]> => {
    try {
      console.log(`📊 Loading data from API for range: ${range}`)
      const response = await fetch(`/api/btc-chart-data?timeRange=${range}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load data from API: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'API returned error')
      }
      
      console.log(`✅ API returned ${result.data.length} data points for ${range}`)
      
      // Convert API data to BTCPriceData format — preserve OHLC for tooltip
      const priceData = result.data.map((item: any) => ({
        timestamp: item.timestamp,
        price: item.price,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
        marketCap: item.marketCap,
        dataSource: item.dataSource,
      }))
      
      return priceData
    } catch (error) {
      console.error('Error loading data from API:', error)
      throw error
    }
  }, [])





  // Single data loading effect - only runs when timeRange changes.
  // `cancelled` guards against out-of-order responses: if the user switches ranges again
  // before this fetch resolves, its (now-stale) result must not overwrite the newer one.
  useEffect(() => {
    let cancelled = false

    const loadDataForRange = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log(`🔄 Loading data for time range: ${timeRange}`)
        const apiData = await loadDataFromAPI(timeRange)
        if (cancelled) return

        if (apiData.length === 0) {
          throw new Error(`No data available for ${timeRange} range`)
        }

        console.log(`✅ Loaded ${apiData.length} data points for ${timeRange}`)
        console.log(`📅 Data range: ${new Date(apiData[0]?.timestamp).toISOString()} to ${new Date(apiData[apiData.length - 1]?.timestamp).toISOString()}`)

        setData(apiData)

        // For ALL time range, also load full dataset for calculators
        if (timeRange === 'ALL') {
          setFullData(apiData)
        } else {
          try {
            const fullData = await loadDataFromAPI('ALL')
            if (!cancelled) setFullData(fullData)
          } catch (error) {
            console.warn('Failed to load full dataset for calculators:', error)
          }
        }

      } catch (error) {
        if (cancelled) return
        console.error('Error loading data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadDataForRange()
    return () => { cancelled = true }
  }, [timeRange]) // ONLY depend on timeRange

  // Live updates - re-fetch the CURRENTLY selected range every 5 minutes.
  // Refs (not state) keep the interval reading fresh values without needing to be
  // torn down/recreated every time timeRange or data changes — the previous version
  // captured timeRange in a closure at mount time and never saw later range switches,
  // silently re-overwriting the view with the original range's data every 5 minutes.
  const timeRangeRef = useRef(timeRange)
  const dataRef = useRef(data)
  useEffect(() => { timeRangeRef.current = timeRange }, [timeRange])
  useEffect(() => { dataRef.current = data }, [data])

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const currentData = dataRef.current
        if (currentData.length > 0) {
          const latestTimestamp = currentData[currentData.length - 1].timestamp
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)

          if (latestTimestamp > fiveMinutesAgo) {
            setUpdateStatus('Data is current')
            setLastUpdateTime(new Date().toLocaleTimeString())
            setTimeout(() => setUpdateStatus(''), 3000)
            return
          }
        }

        setUpdateStatus('Checking for updates...')

        const apiData = await loadDataFromAPI(timeRangeRef.current)
        setData(apiData)

        setLastLiveUpdate(new Date())
        setUpdateStatus('Data updated successfully')
        setLastUpdateTime(new Date().toLocaleTimeString())
        setTimeout(() => setUpdateStatus(''), 3000)

      } catch (error) {
        console.error('Error checking for updates:', error)
        setUpdateStatus('Update failed')
        setTimeout(() => setUpdateStatus(''), 3000)
      }
    }

    const interval = setInterval(checkUpdates, 5 * 60 * 1000) // Check every 5 minutes
    return () => clearInterval(interval)
  }, []) // Empty dependency array is safe now — refs above stay current

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

  // Notify parent component when data changes - pass full dataset for calculators
  useEffect(() => {
    if (onDataUpdate && fullData.length > 0 && Object.keys(exchangeRates).length > 0) {
      // Convert the full dataset (not filtered) for calculators
      const fullConvertedData = convertDataToCurrency(fullData, selectedCurrency)
      onDataUpdate(fullConvertedData, selectedCurrency, selectedCurrencyInfo?.symbol || '$')
    }
  }, [fullData, selectedCurrency, selectedCurrencyInfo, onDataUpdate, exchangeRates, convertDataToCurrency])

  // Single effect for currency conversion (was duplicated)
  useEffect(() => {
    if (data.length > 0 && Object.keys(exchangeRates).length > 0) {
      setConvertedData(convertDataToCurrency(data, selectedCurrency))
    }
  }, [data, selectedCurrency, exchangeRates, convertDataToCurrency])

  // Fetch exchange rates on mount
  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  // Escape = one level back, Alt+Escape = all the way out
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !isZoomed) return
      e.altKey ? zoomOutAll() : zoomOut()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isZoomed, zoomStack.length])

  // Use the independent tooltip component
  const renderTooltipContent = useCallback(({ active, payload, label }: any) => {
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
  }, [selectedCurrency, selectedCurrencyInfo, data, convertedData])

  // Create chart data without markers
  // ponytail: O(1) timestamp lookup replaces O(n) findIndex on every mousemove
  const timestampToIndex = useMemo(() => {
    const map = new Map<number, number>()
    convertedData.forEach((item, i) => map.set(item.timestamp, i))
    return map
  }, [convertedData])

  const chartData = useMemo(() => {
    if (convertedData.length === 0) return []

    let filteredData: BTCPriceData[]

    if (isZoomed && currentZoomData) {
      // High-res data fetched for this zoom level
      filteredData = currentZoomData
    } else if (isZoomed && left !== right && left >= 0 && right < convertedData.length) {
      // Fallback: slice of base data (low-res)
      filteredData = convertedData.slice(left, right + 1)
    } else {
      filteredData = convertedData
    }

    const MAX_POINTS = 500
    if (filteredData.length > MAX_POINTS) {
      const step = Math.ceil(filteredData.length / MAX_POINTS)
      filteredData = filteredData.filter((_, i) => i % step === 0 || i === filteredData.length - 1)
    }

    return filteredData.map(item => ({ ...item, showDot: false }))
  }, [convertedData, isZoomed, left, right, currentZoomData])

  // Derived — no state, no extra render cycle
  const currentPrice = useMemo(() =>
    chartData.length ? chartData[chartData.length - 1].price : 0
  , [chartData])

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0
    const first = chartData[0].price
    const last = chartData[chartData.length - 1].price
    return ((last - first) / first) * 100
  }, [chartData])

  const yAxisConfig = useMemo(() => {
    if (chartData.length === 0) return { domain: [0, 'auto' as const], ticks: [] }
    let minPrice = Infinity, maxPrice = -Infinity
    for (const d of chartData) {
      if (d.price < minPrice) minPrice = d.price
      if (d.price > maxPrice) maxPrice = d.price
    }
    const range = maxPrice - minPrice
    const start = Math.max(0, minPrice - (range * 0.05))
    const generateTicks = (min: number, max: number) => {
      const r = max - min
      if (r <= 0) return [min, max]
      let step: number
      if (r > 100000) step = Math.max(1000, Math.pow(2, Math.floor(Math.log2(r / 8))) * 1000)
      else if (r > 10000) step = Math.max(100, Math.pow(2, Math.floor(Math.log2(r / 8))) * 100)
      else if (r > 1000) step = Math.max(10, Math.pow(2, Math.floor(Math.log2(r / 8))) * 10)
      else if (r > 100) step = Math.max(1, Math.pow(2, Math.floor(Math.log2(r / 8))))
      else if (r > 10) step = Math.max(0.1, Math.pow(2, Math.floor(Math.log2(r / 8))) * 0.1)
      else if (r > 1) step = Math.max(0.01, Math.pow(2, Math.floor(Math.log2(r / 8))) * 0.01)
      else step = Math.max(0.001, Math.pow(2, Math.floor(Math.log2(r / 8))) * 0.001)
      if (step > r / 2) step = r / 4
      const ticks = []
      let current = Math.ceil(min / step) * step
      while (current <= max && ticks.length < 12) { ticks.push(current); current += step }
      if (ticks.length < 3) {
        const s = r / 4; ticks.length = 0
        for (let i = 0; i <= 4; i++) ticks.push(min + s * i)
      }
      return ticks
    }
    const ticks = generateTicks(start, maxPrice)
    return { domain: [start, 'auto'] as [number, 'auto'], ticks: ticks.length > 0 ? ticks : undefined }
  }, [chartData])

  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return undefined

    // Sample directly from chartData — tick values always match actual data points
    const every = (step: number) =>
      chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1).map(d => d.timestamp)

    // One tick per calendar day (first data point of each new day)
    const perDay = () => {
      const seen = new Set<string>()
      const ticks: number[] = []
      for (const d of chartData) {
        const day = new Date(d.timestamp).toLocaleDateString('en-CA')
        if (!seen.has(day)) { seen.add(day); ticks.push(d.timestamp) }
      }
      return ticks
    }

    // N evenly distributed ticks from the data array
    const evenly = (n: number) => {
      if (chartData.length <= n) return chartData.map(d => d.timestamp)
      const step = Math.floor((chartData.length - 1) / (n - 1))
      return Array.from({ length: n }, (_, i) => chartData[Math.min(i * step, chartData.length - 1)].timestamp)
    }

    if (isZoomed && currentZoomData?.length) {
      const ms = currentZoomData[currentZoomData.length - 1].timestamp - currentZoomData[0].timestamp
      const hours = ms / 3_600_000
      if (hours <= 24)  return evenly(12)
      if (hours <= 72)  return evenly(12)
      if (hours <= 168) return evenly(14)
      if (hours <= 720) return perDay()
      return evenly(8)
    }

    if (timeRange === '1D')  return every(12)   // 288 pts / 12 ≈ 24 ticks (one per ~hour)
    if (timeRange === '7D')  return every(7)    // 168 pts / 7 = 24 ticks (one per ~6h)
    if (timeRange === '30D') return every(2)    // ~30 pts / 2 = 15 ticks (one per 2 days)
    if (timeRange === '60D') return perDay()    // one per day (~60 ticks)
    if (timeRange === '90D') return perDay()    // one per day (~90 ticks)
    return evenly(8)                            // 6mo, 1Y, 5Y, 10Y, ALL
  }, [timeRange, chartData, isZoomed, currentZoomData])

  // First tick of each calendar day — used to show date label instead of time
  const dayStartTicks = useMemo(() => {
    if (!xAxisTicks) return new Set<number>()
    const set = new Set<number>()
    let lastDay = ''
    for (const ts of xAxisTicks) {
      const day = new Date(ts).toLocaleDateString('en-CA')
      if (day !== lastDay) { set.add(ts); lastDay = day }
    }
    return set
  }, [xAxisTicks])

  // Which ticks are the first of their month — used for 30D/60D month name labels
  const monthStartTicks = useMemo(() => {
    if (!xAxisTicks || (timeRange !== '30D' && timeRange !== '60D')) return new Set<number>()
    const set = new Set<number>()
    let lastMonth = -1
    for (const ts of xAxisTicks) {
      const m = new Date(ts).getMonth()
      if (m !== lastMonth) { set.add(ts); lastMonth = m }
    }
    return set
  }, [xAxisTicks, timeRange])

  const formatXAxisTick = useCallback((tickItem: any) => {
    const date = new Date(tickItem)
    
    // Custom zoom: format based on window duration
    if (isZoomed && currentZoomData?.length) {
      const ms = currentZoomData[currentZoomData.length - 1].timestamp - currentZoomData[0].timestamp
      const hours = ms / 3_600_000
      if (hours <= 24)
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      if (hours <= 168)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
               date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    
    if (timeRange === '1D')
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    // Sub-daily ranges: first tick of each day = date label, others = time
    if (timeRange === '7D' || timeRange === '30D') {
      if (dayStartTicks.has(tickItem))
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    if (timeRange === '90D')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (timeRange === '1Y')
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (timeRange === '5Y' || timeRange === '10Y')
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }, [timeRange, isZoomed, left, right, currentZoomData, monthStartTicks, dayStartTicks])

  // X-axis zoom functions
  const zoom = async () => {
    if (refAreaLeft === null || refAreaRight === null || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null); setRefAreaRight(null); return
    }
    const startTs = Math.min(refAreaLeft, refAreaRight)
    const endTs = Math.max(refAreaLeft, refAreaRight)
    const startIdx = timestampToIndex.get(startTs) ?? 0
    const endIdx = timestampToIndex.get(endTs) ?? convertedData.length - 1
    if (startIdx === endIdx || (startIdx === left && endIdx === right)) {
      setRefAreaLeft(null); setRefAreaRight(null); return
    }

    if (!isZoomed) setLastPresetRange(timeRange)
    setRefAreaLeft(null); setRefAreaRight(null)

    // Push current state (including current high-res data) onto stack
    setZoomStack(prev => [...prev, { left, right, data: currentZoomData }])
    setLeft(startIdx); setRight(endIdx)
    setIsZoomed(true)

    // Fetch high-res data for this exact window
    setIsZoomLoading(true)
    try {
      const fromSec = Math.floor(startTs / 1000)
      const toSec = Math.floor(endTs / 1000)
      const res = await fetch(`/api/btc-chart-data?from=${fromSec}&to=${toSec}`)
      const json = await res.json()
      if (json.success && json.data?.length) {
        setCurrentZoomData(json.data)
      }
    } catch { /* fall back to sliced data */ }
    finally { setIsZoomLoading(false) }
  }

  // Step back one zoom level, restoring that level's high-res data
  const zoomOut = () => {
    setZoomStack(prev => {
      const restored = prev[prev.length - 1] ?? { left: 0, right: 0, data: null }
      const next = prev.slice(0, -1)
      setLeft(restored.left); setRight(restored.right)
      setCurrentZoomData(restored.data)
      setIsZoomed(next.length > 0)
      if (next.length === 0) setTimeRange(lastPresetRange)
      return next
    })
    setRefAreaLeft(null); setRefAreaRight(null)
  }

  // Jump all the way back to the original range
  const zoomOutAll = () => {
    setZoomStack([])
    setLeft(0); setRight(0)
    setCurrentZoomData(null)
    setIsZoomed(false)
    setTimeRange(lastPresetRange)
    setRefAreaLeft(null); setRefAreaRight(null)
  }

  const handleMouseDown = (e: any) => {
    if (!e?.activeLabel) return
    setIsSelectingRange(true)
    setRefAreaLeft(e.activeLabel)
    setRefAreaRight(e.activeLabel)
  }

  const handleMouseMove = (e: any) => {
    if (!e) return
    if (refAreaLeft !== null && e.activeLabel != null && e.activeLabel !== refAreaRight) {
      setRefAreaRight(e.activeLabel)
    }
  }

  const handleMouseUp = () => {
    setIsSelectingRange(false)
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

  return (
    <div className={`w-full h-full py-1 flex flex-col ${className}`}>
      {/* Chart Section - Flexible Height. flex-col so the chart box (flex-1) shrinks to guarantee header/stats/bottom-row always fit on screen. */}
      <div className="flex-1 min-h-0 relative flex flex-col">

        {/* Header Section - Compact and Horizontal */}
        <div className="mb-4 shrink-0">

          {/* Row 1: Title + Currency + Actions */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">Bitcoin Price Chart</h3>
              <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Currency Selector — searchable combobox (Popover + cmdk) instead of a plain Select,
                  so users can type a currency/country name instead of scanning the whole list. */}
              <Popover open={isCurrencyPickerOpen} onOpenChange={setIsCurrencyPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-[5.75rem] sm:w-24 px-2 flex items-center justify-between gap-1 rounded-md border border-gray-600 bg-gray-800/50 text-white hover:bg-gray-800/70 transition-colors shrink-0 text-sm"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="text-base leading-none">{selectedCurrencyInfo?.flag}</span>
                      <span className="font-mono font-semibold">{selectedCurrencyInfo?.code}</span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-0 bg-gray-900 border-gray-700">
                  <Command className="bg-transparent" filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput
                      placeholder="Search currency or country..."
                      className="text-white placeholder:text-gray-500"
                    />
                    <CommandList className="max-h-72 scroll-smooth overscroll-contain">
                      <CommandEmpty className="text-gray-400">No currency found.</CommandEmpty>
                      <CommandGroup>
                        {CURRENCIES.map((currency) => (
                          <CommandItem
                            key={currency.code}
                            value={`${currency.name} ${currency.code}`}
                            onSelect={() => {
                              setSelectedCurrency(currency.code)
                              setIsCurrencyPickerOpen(false)
                            }}
                            className="flex items-center justify-between gap-2 py-1.5 text-white data-[selected=true]:bg-gray-700 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="text-base leading-none shrink-0">{currency.flag}</span>
                              <span className="font-mono font-semibold text-sm shrink-0">{currency.code}</span>
                              <span className="text-gray-400 text-xs truncate">{currency.name}</span>
                            </span>
                            {currency.code === selectedCurrency && (
                              <Check className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Zoom reset */}
              {isZoomed && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={zoomOut}
                    className="h-8 px-2 sm:px-3 gap-1 border-orange-500 bg-orange-600/20 text-orange-300 hover:bg-orange-600/40 transition-colors font-medium"
                    title="Step back one zoom level (Esc)"
                  >
                    <ZoomOut className="h-3 w-3" />
                    <span className="hidden sm:inline">Reset</span>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500/30 text-orange-200 text-[10px] font-bold">
                      {zoomStack.length}
                    </span>
                  </Button>
                  {zoomStack.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={zoomOutAll}
                      className="h-8 px-2 text-orange-400/70 hover:text-orange-300 hover:bg-orange-600/20 transition-colors text-xs"
                      title="Reset to start (Alt+Esc)"
                    >
                      ×{zoomStack.length}
                    </Button>
                  )}
                </div>
              )}
              <Button
                size="sm"
                onClick={async () => {
                  setIsLoading(true)
                  setError(null)
                  try {
                    console.log(`🔄 Manual refresh for time range: ${timeRange}`)
                    const apiData = await loadDataFromAPI(timeRange)
                    if (apiData.length === 0) throw new Error(`No data available for ${timeRange} range`)
                    console.log(`✅ Refreshed ${apiData.length} data points for ${timeRange}`)
                    setData(apiData)
                    if (timeRange === 'ALL') {
                      setFullData(apiData)
                    } else {
                      try {
                        const fullData = await loadDataFromAPI('ALL')
                        setFullData(fullData)
                      } catch (error) {
                        console.warn('Failed to load full dataset for calculators:', error)
                      }
                    }
                    setUpdateStatus('Data refreshed successfully')
                    setLastUpdateTime(new Date().toLocaleTimeString())
                    setTimeout(() => setUpdateStatus(''), 3000)
                  } catch (error) {
                    console.error('Error refreshing data:', error)
                    setError(error instanceof Error ? error.message : 'Failed to refresh data')
                    setUpdateStatus('Refresh failed')
                    setTimeout(() => setUpdateStatus(''), 3000)
                  } finally {
                    setIsLoading(false)
                  }
                }}
                className="h-8 px-2 sm:px-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg hover:shadow-orange-500/25 transition-all duration-200"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline text-xs ml-1">Refresh</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Time Range Pills — horizontal scroll on mobile, edge-faded to hint scrollability */}
          <div
            className="flex items-center gap-1 overflow-x-auto scrollbar-none mb-3 pb-0.5 -mx-4 px-4 sm:mx-0 sm:px-0"
            style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)', maskImage: 'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)' }}
          >
            {(['1D','7D','30D','60D','90D','6mo','1Y','5Y','10Y','ALL'] as const).map(r => (
              <button
                key={r}
                onClick={() => { if (!isZoomed) { setTimeRange(r); setLeft(0); setRight(0) } }}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  !isZoomed && timeRange === r
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {r}
              </button>
            ))}
            {isZoomed && (
              <span className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-orange-600/20 border border-orange-500/50 text-orange-300">
                Custom
              </span>
            )}
          </div>
          
          {/* Stats Card */}
          {convertedData.length > 0 && (() => {
            let filteredData = convertedData
            if (isZoomed && currentZoomData?.length) filteredData = currentZoomData
            else if (isZoomed && left !== right && left >= 0 && right < convertedData.length)
              filteredData = convertedData.slice(left, right + 1)

            const startingPrice = filteredData[0].price
            // Use live price (already converted to selected currency) for "current" when available, otherwise chart end
            const livePrice = liveConvertedPrice
            const displayPrice = livePrice ?? filteredData[filteredData.length - 1].price
            const rangeChange = ((displayPrice - startingPrice) / startingPrice) * 100
            const positive = rangeChange >= 0
            const sym = selectedCurrencyInfo?.symbol ?? '$'
            const startDate = new Date(filteredData[0].timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const endDate = new Date(filteredData[filteredData.length - 1].timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

            const rangeDays = Math.round((filteredData[filteredData.length - 1].timestamp - filteredData[0].timestamp) / 86_400_000)
            const rangeAbsolute = displayPrice - startingPrice

            return (
              <>
                {/* Mobile: compact 2-panel (Current Price + Range Change) */}
                <div className="flex sm:hidden items-stretch rounded-xl overflow-hidden border border-white/[0.06] shadow-xl">
                  <div className="flex-1 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent px-4 py-3 border-r border-white/[0.05]">
                    <div className="text-[9px] uppercase tracking-widest text-orange-400/60 mb-1 font-semibold">Current Price</div>
                    <div className="text-base font-bold text-white tabular-nums">{formatPrice(displayPrice, sym)}</div>
                    {livePrice
                      ? <div className="flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /><span className="text-[9px] text-green-400/70 font-medium">Live</span></div>
                      : <div className="text-[9px] text-gray-500 mt-0.5">{endDate}</div>
                    }
                  </div>
                  <div className={`flex-1 px-4 py-3 bg-gradient-to-br ${positive ? 'from-green-500/10 via-emerald-500/5' : 'from-red-500/10 via-rose-500/5'} to-transparent`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[9px] uppercase tracking-widest text-gray-400/60 font-semibold">Change</div>
                      <button
                        onClick={() => setRangeChangeAsDollar(v => !v)}
                        className={`text-[8px] font-bold px-1 py-0.5 rounded border transition-colors ${rangeChangeAsDollar ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : 'border-gray-600/50 text-gray-400 bg-gray-800/50'}`}
                      >
                        {rangeChangeAsDollar ? sym : '%'}
                      </button>
                    </div>
                    <div className={`text-base font-bold tabular-nums ${positive ? 'text-green-400' : 'text-red-400'}`}>
                      {rangeChangeAsDollar
                        ? `${positive ? '+' : ''}${formatPrice(rangeAbsolute, sym)}`
                        : `${positive ? '+' : ''}${rangeChange.toFixed(2)}%`
                      }
                    </div>
                    <div className="text-[9px] text-gray-500 mt-0.5">over {rangeDays}d</div>
                  </div>
                </div>

                {/* Desktop: full 4-panel */}
                <div className="hidden sm:flex items-stretch rounded-xl overflow-hidden border border-white/[0.06] shadow-2xl">

                  {/* 1 — Period Start */}
                  <div className="flex-1 px-5 py-4 border-r border-white/[0.05] bg-gray-900/50">
                    <div className="text-[10px] uppercase tracking-widest text-purple-400/50 mb-2 font-semibold">Period Start</div>
                    <div className="text-xl font-bold text-purple-300 tabular-nums">{formatPrice(startingPrice, sym)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{startDate}</div>
                  </div>

                  {/* 2 — Current Price */}
                  <div className="flex-1 bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent px-5 py-4 border-r border-white/[0.05]">
                    <div className="text-[10px] uppercase tracking-widest text-orange-400/60 mb-2 font-semibold">Current Price</div>
                    <div className="text-xl font-bold text-white tabular-nums">{formatPrice(displayPrice, sym)}</div>
                    {livePrice
                      ? <div className="flex items-center gap-1 mt-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /><span className="text-[10px] text-green-400/70 font-medium">Live</span></div>
                      : <div className="text-[10px] text-gray-500 mt-1">{endDate}</div>
                    }
                  </div>

                  {/* 3 — Range Change (togglable % / $) */}
                  <div className={`flex-1 px-5 py-4 border-r border-white/[0.05] bg-gradient-to-br ${positive ? 'from-green-500/10 via-emerald-500/5' : 'from-red-500/10 via-rose-500/5'} to-transparent`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-widest text-gray-400/60 font-semibold">Range Change</div>
                      <button
                        onClick={() => setRangeChangeAsDollar(v => !v)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${rangeChangeAsDollar ? 'border-orange-500/50 text-orange-400 bg-orange-500/10' : 'border-gray-600/50 text-gray-400 bg-gray-800/50 hover:border-gray-500'}`}
                      >
                        {rangeChangeAsDollar ? sym : '%'}
                      </button>
                    </div>
                    <div className={`text-xl font-bold tabular-nums ${positive ? 'text-green-400' : 'text-red-400'}`}>
                      {rangeChangeAsDollar
                        ? `${positive ? '+' : ''}${formatPrice(rangeAbsolute, sym)}`
                        : `${positive ? '+' : ''}${rangeChange.toFixed(2)}%`
                      }
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">over {rangeDays}d</div>
                  </div>

                  {/* 4 — Date Range */}
                  <div className="flex-1 px-5 py-4 bg-gray-900/50">
                    <div className="text-[10px] uppercase tracking-widest text-gray-400/50 mb-2 font-semibold">Date Range</div>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      {startDate}
                      <span className="text-gray-600 mx-0.5">→</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                      {endDate}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">{rangeDays} days total</div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
        
        {/* Chart Container - Maximized Height */}
        <div className="w-full flex-1 min-h-[240px] sm:min-h-[280px] bg-gray-800/20 rounded-lg border border-gray-700/30 p-3 sm:p-4 lg:p-6 pb-1 sm:pb-1 lg:pb-2 relative mb-2">
          {isZoomLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 rounded-lg backdrop-blur-sm">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
            </div>
          )}
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
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
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
                  ticks={xAxisTicks}
                  tickFormatter={formatXAxisTick}
                  stroke="#9CA3AF"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  minTickGap={16}
                />
                <YAxis
                  hide
                  domain={yAxisConfig.domain as any}
                  allowDataOverflow={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={renderTooltipContent}
                  isAnimationActive={false}
                />
                {/* Hover cursor - shows on mouse move */}
                {/* Selection cursor - shows during drag */}
                {refAreaLeft !== null && (
                  <ReferenceLine
                    x={refAreaLeft}
                    stroke="#f7931a"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    opacity={0.8}
                  />
                )}
                {/* Real-time Price Reference Line — positioned using the currency-converted price so it lines up with the (also converted) Y scale */}
                {liveConvertedPrice != null && (
                  <ReferenceLine
                    y={liveConvertedPrice}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: `Live: ${formatPrice(liveConvertedPrice, selectedCurrencyInfo?.symbol)}`,
                      position: 'right',
                      fill: '#10b981',
                      fontSize: 12,
                      fontWeight: 'bold',
                      offset: 10
                    }}
                  />
                )}
                <Area
                  dataKey="price"
                  isAnimationActive={false}
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
                  // Recharts renders this only for the currently-hovered point, already snapped to the
                  // curve's actual pixel position — unlike activeCoordinate.y, which tracks the raw mouse Y.
                  activeDot={(props: any) => {
                    const { cx, cy } = props
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <line x1={cx} x2={cx} y1={0} y2="100%" stroke="#f7931a" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />
                        <line x1={0} x2="100%" y1={cy} y2={cy} stroke="#f7931a" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />
                        <circle cx={cx} cy={cy} r={5} fill="#f7931a" stroke="#ffffff" strokeWidth={2} />
                      </g>
                    )
                  }}
                />
                {refAreaLeft !== null && refAreaRight !== null ? (
                  <ReferenceArea
                    x1={refAreaLeft}
                    x2={refAreaRight}
                    stroke="#f7931a"
                    strokeOpacity={0.6}
                    strokeWidth={2}
                    fill="#f7931a"
                    fillOpacity={0.2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>

            {/* Live Price Pulsing Indicator */}
            {realTimePriceData && convertedData.length > 0 && (
              <div className="hidden sm:block absolute top-4 right-4 bg-gray-900/90 border border-green-500/50 rounded-lg px-4 py-2 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </div>
                  <div className="text-xs text-green-400 font-semibold">
                    LIVE
                  </div>
                  <div className="text-sm text-white font-bold">
                    {formatPrice(liveConvertedPrice ?? realTimePriceData.price, selectedCurrencyInfo?.symbol)}
                  </div>
                  <div className={`text-xs font-semibold ${
                    (realTimePriceData.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(realTimePriceData.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}
                    {(realTimePriceData.price_change_percentage_24h ?? 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
            
            {/* Range Selection Instructions — hidden on mobile (touch drag doesn't trigger zoom) */}
            {!isZoomed && refAreaLeft === null && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none hidden sm:block">
                <div className="bg-gray-900/80 border border-gray-600/30 rounded-lg px-3 py-2 text-center shadow-lg backdrop-blur-sm">
                  <div className="text-gray-400 text-xs select-none">
                    Click and drag to select a range
                  </div>
                </div>
              </div>
            )}
            
            {/* Date Range Selection Overlay - Positioned at top, non-interactive */}
            {refAreaLeft !== null && refAreaRight !== null && (
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
                <div className="bg-gray-900/80 border border-orange-500/30 rounded-lg px-3 py-2 text-center shadow-lg backdrop-blur-sm">
                  <div className="text-orange-400 font-medium text-sm select-none">
                    Selecting Range
                  </div>
                  {(() => {
                    const startTs = Math.min(refAreaLeft!, refAreaRight!)
                    const endTs = Math.max(refAreaLeft!, refAreaRight!)
                    const startDate = new Date(startTs)
                    const endDate = new Date(endTs)
                    const daysDiff = Math.round((endTs - startTs) / 86400000)
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

        {/* Bottom Statistics - Minimal Spacing */}
        {convertedData.length > 0 && (
          <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 pb-2 bg-gray-900/30 rounded-lg border border-gray-700/20 px-4 sm:px-6">
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