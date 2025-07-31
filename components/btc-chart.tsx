"use client"

import React, { useMemo, useCallback, Suspense } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { CalculatorOutputs, CalculatorInputs, formatCurrency, formatBTC, formatPercentage } from '@/lib/btc-calculator'
import { Coins, Globe, TrendingUp, DollarSign, BarChart3 } from 'lucide-react'

interface BTCChartProps {
  outputs: CalculatorOutputs
  inputs: CalculatorInputs
}

// Lazy load chart components to reduce initial bundle size
const LazyChartContainer = React.lazy(() => Promise.resolve({ default: ChartContainer }))
const LazyChartTooltip = React.lazy(() => Promise.resolve({ default: ChartTooltip }))
const LazyChartTooltipContent = React.lazy(() => Promise.resolve({ default: ChartTooltipContent }))
const LazyChartLegend = React.lazy(() => Promise.resolve({ default: ChartLegend }))
const LazyChartLegendContent = React.lazy(() => Promise.resolve({ default: ChartLegendContent }))

export const BTCChart = React.memo(function BTCChart({ outputs, inputs }: BTCChartProps) {
  // Safety check for outputs
  if (!outputs || !outputs.yearlyBreakdown || outputs.yearlyBreakdown.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-gray-800/50 rounded-lg">
        <div className="text-gray-400">No data available</div>
      </div>
    )
  }

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => 
    outputs.yearlyBreakdown.map(year => ({
      year: year.year,
      btcValue: year.btcValue,
      btcPrice: year.btcPrice,
      globalWealth: year.globalWealth,
      cumulativeInvestment: year.cumulativeInvestment,
      btcHoldings: year.btcHoldings,
    })), [outputs.yearlyBreakdown]
  )

  // Memoize chart configuration
  const chartConfig = useMemo(() => ({
    btcValue: {
      label: "BTC Value",
      color: "#10b981",
    },
    cumulativeInvestment: {
      label: "Investment",
      color: "#3b82f6",
    },
    btcPrice: {
      label: "BTC Price",
      color: "#f59e0b",
    },
    btcHoldings: {
      label: "BTC Holdings",
      color: "#8b5cf6",
    },
  }), [])

  // Memoize tooltip formatter to prevent recreation on every render
  const formatTooltipValue = useCallback((value: any, name: any) => {
    if (name === 'BTC Value' || name === 'BTC Price' || name === 'Global Wealth' || name === 'Cumulative Investment') {
      return formatCurrency(value)
    } else if (name === 'BTC Holdings') {
      return formatBTC(value)
    }
    return value
  }, [])

  // Enhanced tooltip content with better styling
  const renderTooltipContent = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null
    
    const year = label
    const data = payload[0].payload
    
    return (
      <div className="w-64 px-4 py-3 rounded-md bg-gray-900 border border-gray-700 shadow-xl text-white font-sans">
        {/* Header */}
        <div className="flex justify-between mb-2">
          <span className="text-sm font-semibold text-gray-300">Year {year}</span>
          <span className="text-xs text-gray-400">Investment Analysis</span>
        </div>

        {/* BTC Value */}
        <div className="mb-2">
          <div className="text-lg font-bold text-green-400">
            {formatCurrency(data.btcValue)}
          </div>
          <div className="text-xs text-gray-400">Total BTC Value</div>
        </div>

        {/* Investment vs Value */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <div className="text-sm text-blue-400">{formatCurrency(data.cumulativeInvestment)}</div>
            <div className="text-xs text-gray-400">Invested</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-green-400">{formatCurrency(data.btcValue - data.cumulativeInvestment)}</div>
            <div className="text-xs text-gray-400">Profit</div>
          </div>
          <div>
            <div className="text-sm text-purple-400">{formatBTC(data.btcHoldings)}</div>
            <div className="text-xs text-gray-400">Holdings</div>
          </div>
        </div>

        {/* BTC Price */}
        <div className="border-t border-gray-700 pt-2">
          <div className="text-sm text-yellow-400">{formatCurrency(data.btcPrice)}</div>
          <div className="text-xs text-gray-400">BTC Price</div>
        </div>
      </div>
    )
  }, [])

  // Loading fallback for charts
  const ChartLoadingFallback = () => (
    <div className="h-[300px] flex items-center justify-center bg-gray-800/50 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Investment vs BTC Value Chart */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            Investment vs BTC Value
          </h3>
          <div className="text-sm text-gray-400">
            Stacked area visualization
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 relative">
          <div className="absolute top-4 right-4 w-2 h-2 bg-green-500 rounded-full"></div>
          <Suspense fallback={<ChartLoadingFallback />}>
            <LazyChartContainer config={chartConfig} className="h-[280px]">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  label={{ value: 'Value ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                />
                <LazyChartTooltip content={renderTooltipContent} />
                <LazyChartLegend content={<LazyChartLegendContent />} />
                <Area 
                  type="monotone" 
                  dataKey="btcValue" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.7}
                  name="BTC Value"
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeInvestment" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.7}
                  name="Investment"
                />
              </AreaChart>
            </LazyChartContainer>
          </Suspense>
        </div>
      </div>

      {/* BTC Price Trajectory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            BTC Price Trajectory
          </h3>
          <div className="text-sm text-gray-400">
            Price growth over time
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 relative">
          <div className="absolute top-4 right-4 w-2 h-2 bg-yellow-500 rounded-full"></div>
          <Suspense fallback={<ChartLoadingFallback />}>
            <LazyChartContainer config={chartConfig} className="h-[280px]">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  label={{ value: 'BTC Price ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                />
                <LazyChartTooltip content={renderTooltipContent} />
                <LazyChartLegend content={<LazyChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="btcPrice" 
                  stroke="#f59e0b" 
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 8, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  name="BTC Price"
                />
              </LineChart>
            </LazyChartContainer>
          </Suspense>
        </div>
      </div>

      {/* BTC Holdings Growth - Full Width */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            BTC Holdings Growth
          </h3>
          <div className="text-sm text-gray-400">
            Accumulation over time
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 relative">
          <div className="absolute top-4 right-4 w-2 h-2 bg-purple-500 rounded-full"></div>
          <Suspense fallback={<ChartLoadingFallback />}>
            <LazyChartContainer config={chartConfig} className="h-[320px]">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="year" 
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF', fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatBTC(value)}
                  stroke="#9CA3AF"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  label={{ value: 'BTC Holdings', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                />
                <LazyChartTooltip content={renderTooltipContent} />
                <LazyChartLegend content={<LazyChartLegendContent />} />
                <Line 
                  type="monotone" 
                  dataKey="btcHoldings" 
                  stroke="#8b5cf6" 
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 8, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  name="BTC Holdings"
                />
              </LineChart>
            </LazyChartContainer>
          </Suspense>
        </div>
      </div>

      {/* Enhanced Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl border border-green-500/30 p-6 relative">
          <div className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full"></div>
          <h4 className="font-bold text-lg text-green-300 mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Investment Summary
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Investment:</span>
              <span className="font-bold text-white">{formatCurrency(outputs.totalInvestment)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Final BTC Value:</span>
              <span className="font-bold text-white">{formatCurrency(outputs.futureValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total Return:</span>
              <span className="font-bold text-green-400">{formatCurrency(outputs.totalReturn)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/50 to-violet-900/50 rounded-xl border border-purple-500/30 p-6 relative">
          <div className="absolute top-4 right-4 w-3 h-3 bg-purple-500 rounded-full"></div>
          <h4 className="font-bold text-lg text-purple-300 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Context
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Global Wealth (Year {inputs.endYear}):</span>
              <span className="font-bold text-white">{formatCurrency(outputs.globalWealthAtYear30)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Your Share:</span>
              <span className="font-bold text-white">{formatPercentage(outputs.percentageOfGlobalWealth)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">BTC Holdings:</span>
              <span className="font-bold text-white">{formatBTC(outputs.futureBTCHoldings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}) 