"use client"

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { CalculatorOutputs, CalculatorInputs, formatCurrency, formatBTC, formatPercentage } from '@/lib/btc-calculator'

interface BTCChartProps {
  outputs: CalculatorOutputs
  inputs: CalculatorInputs
}

export function BTCChart({ outputs, inputs }: BTCChartProps) {
  // Prepare data for the chart
  const chartData = outputs.yearlyBreakdown.map(year => ({
    year: year.year,
    btcValue: year.btcValue,
    btcPrice: year.btcPrice,
    globalWealth: year.globalWealth,
    cumulativeInvestment: year.cumulativeInvestment,
    btcHoldings: year.btcHoldings,
  }))

  // Chart configuration for ShadCN
  const chartConfig = {
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
  }

  // Custom tooltip formatter
  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'BTC Value' || name === 'BTC Price' || name === 'Global Wealth' || name === 'Cumulative Investment') {
      return formatCurrency(value)
    } else if (name === 'BTC Holdings') {
      return formatBTC(value)
    }
    return value
  }

  return (
    <div className="space-y-6">
      {/* BTC Value vs Investment Chart */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">Investment vs BTC Value</h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'Value ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <ChartTooltip 
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload}
                  label={label}
                  labelFormatter={(label) => `Year ${label}`}
                  formatter={formatTooltipValue}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              )}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area 
              type="monotone" 
              dataKey="btcValue" 
              stackId="1" 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.6}
              name="BTC Value"
            />
            <Area 
              type="monotone" 
              dataKey="cumulativeInvestment" 
              stackId="1" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.6}
              name="Investment"
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* BTC Price Trajectory */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">BTC Price Trajectory</h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
            />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'BTC Price ($)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <ChartTooltip 
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload}
                  label={label}
                  labelFormatter={(label) => `Year ${label}`}
                  formatter={formatTooltipValue}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              )}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line 
              type="monotone" 
              dataKey="btcPrice" 
              stroke="#f59e0b" 
              strokeWidth={3}
              dot={false}
              name="BTC Price"
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* BTC Holdings Growth */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">BTC Holdings Growth</h3>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="year" 
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'Year', position: 'insideBottom', offset: -10, fill: '#9CA3AF' }}
            />
            <YAxis 
              tickFormatter={(value) => formatBTC(value)}
              stroke="#9CA3AF"
              fontSize={12}
              label={{ value: 'BTC Holdings', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
            />
            <ChartTooltip 
              content={({ active, payload, label }) => (
                <ChartTooltipContent
                  active={active}
                  payload={payload}
                  label={label}
                  labelFormatter={(label) => `Year ${label}`}
                  formatter={formatTooltipValue}
                  className="bg-gray-900 border-gray-700 text-white"
                />
              )}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line 
              type="monotone" 
              dataKey="btcHoldings" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              dot={false}
              name="BTC Holdings"
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-300">Investment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Investment:</span>
              <span className="font-medium text-white">{formatCurrency(outputs.totalInvestment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Final BTC Value:</span>
              <span className="font-medium text-white">{formatCurrency(outputs.futureBTCValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Return:</span>
              <span className="font-medium text-green-400">{formatCurrency(outputs.totalReturn)}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-300">Global Context</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Global Wealth (Year 30):</span>
              <span className="font-medium text-white">{formatCurrency(outputs.globalWealthAtYear30)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Your Share:</span>
              <span className="font-medium text-white">{formatPercentage(outputs.percentageOfGlobalWealth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">BTC Holdings:</span>
              <span className="font-medium text-white">{formatBTC(outputs.totalBTCHoldings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 