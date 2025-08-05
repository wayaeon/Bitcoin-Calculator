"use client"

import React from 'react'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'
import { formatPrice, formatPriceChange } from '@/lib/btc-calculator'

interface BTCChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  selectedCurrency?: string
  selectedCurrencySymbol?: string
  data?: any[]
  convertedData?: any[]
  className?: string
  showVolume?: boolean
  showMarketCap?: boolean
  showPercentageChange?: boolean
  customStyling?: React.CSSProperties
}

interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
}

// Helper function to format market cap with appropriate units
const formatMarketCap = (marketCap: number, currencySymbol: string): string => {
  if (marketCap >= 1e12) {
    return `${currencySymbol}${(marketCap / 1e12).toFixed(2)}T`
  } else if (marketCap >= 1e9) {
    return `${currencySymbol}${(marketCap / 1e9).toFixed(2)}B`
  } else if (marketCap >= 1e6) {
    return `${currencySymbol}${(marketCap / 1e6).toFixed(2)}M`
  } else if (marketCap >= 1e3) {
    return `${currencySymbol}${(marketCap / 1e3).toFixed(2)}K`
  } else {
    return `${currencySymbol}${marketCap.toFixed(2)}`
  }
}

export const BTCChartTooltip = ({
  active,
  payload,
  selectedCurrency = 'USD',
  selectedCurrencySymbol = '$',
  data = [],
  convertedData = [],
  className = ''
}: BTCChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const value = payload[0]?.value
  const numericValue = typeof value === 'number' ? value : 0

  // Calculate percentage change from first data point
  const firstPrice = convertedData.length > 0 ? convertedData[0]?.price : data[0]?.price
  const currentPrice = numericValue
  const priceChange = currentPrice - firstPrice
  const percentageChange = firstPrice ? (priceChange / firstPrice) * 100 : 0

  // Use the label (timestamp) provided by the chart for accurate date
  const currentDate = new Date(label || Date.now())
  
  // Find the corresponding data point for additional info
  const currentDataPoint = convertedData.find(item => item.timestamp === label) || 
                          data.find(item => item.timestamp === label) || 
                          convertedData[0] || data[0]

  return (
    <div className={`bg-gray-900/95 border border-gray-700 text-white backdrop-blur-sm shadow-xl rounded-lg p-4 min-w-64 ${className}`}>
      {/* Header with currency info */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-sm text-gray-300">Bitcoin Price</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {selectedCurrency}
        </span>
      </div>

                           {/* Main price display */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">
            {formatPrice(numericValue, selectedCurrencySymbol)}
          </div>
        </div>

      {/* Price change indicator */}
      <div className="flex items-center gap-2 mb-4">
        {priceChange >= 0 ? (
          <TrendingUp className="h-4 w-4 text-green-400" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-400" />
        )}
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {priceChange >= 0 ? '+' : ''}{formatPriceChange(priceChange)}
          </span>
          <span className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Date information */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Calendar className="h-3 w-3" />
        <span>
          {currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>

      {/* Additional metrics can be added here */}
      {currentDataPoint && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {currentDataPoint.volume !== undefined && (
              <div>
                <span className="text-gray-400">Volume:</span>
                <div className="text-white font-medium">
                  {currentDataPoint.volume === 0 ? 'Unknown' : currentDataPoint.volume.toLocaleString()}
                </div>
              </div>
            )}
                         {currentDataPoint.marketCap && (
               <div>
                 <span className="text-gray-400">Market Cap:</span>
                 <div className="text-white font-medium">
                   {formatMarketCap(currentDataPoint.marketCap, selectedCurrencySymbol)}
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  )
}

// Enhanced tooltip with more customization options
export const BTCChartTooltipEnhanced = ({
  active,
  payload,
  label,
  selectedCurrency = 'USD',
  selectedCurrencySymbol = '$',
  data = [],
  convertedData = [],
  className = '',
  showVolume = true,
  showMarketCap = true,
  showPercentageChange = true,
  customStyling = {}
}: BTCChartTooltipProps) => {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  const value = payload[0]?.value
  const numericValue = typeof value === 'number' ? value : 0

  // Calculate percentage change from first data point
  const firstPrice = convertedData.length > 0 ? convertedData[0]?.price : data[0]?.price
  const currentPrice = numericValue
  const priceChange = currentPrice - firstPrice
  const percentageChange = firstPrice ? (priceChange / firstPrice) * 100 : 0

  // Use the label (timestamp) provided by the chart for accurate date
  const currentDate = new Date(label || Date.now())
  
  // Find the corresponding data point for additional info
  const currentDataPoint = convertedData.find(item => item.timestamp === label) || 
                          data.find(item => item.timestamp === label) || 
                          convertedData[0] || data[0]

  return (
    <div 
      className={`bg-gray-900/95 border border-gray-700 text-white backdrop-blur-sm shadow-xl rounded-lg p-4 min-w-64 ${className}`}
      style={customStyling}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-sm text-gray-300">Bitcoin Price</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">
          {selectedCurrency}
        </span>
      </div>

                           {/* Price */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-white mb-1">
            {formatPrice(numericValue, selectedCurrencySymbol)}
          </div>
        </div>

      {/* Price change */}
      {showPercentageChange && (
        <div className="flex items-center gap-2 mb-4">
          {priceChange >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {priceChange >= 0 ? '+' : ''}{formatPriceChange(priceChange)}
            </span>
            <span className={`text-sm ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(2)}%)
            </span>
          </div>
        </div>
      )}

      {/* Date */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <Calendar className="h-3 w-3" />
        <span>
          {currentDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </span>
      </div>

      {/* Additional metrics */}
      {currentDataPoint && (showVolume || showMarketCap) && (
        <div className="pt-3 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-xs">
                         {showVolume && currentDataPoint.volume !== undefined && (
               <div>
                 <span className="text-gray-400">Volume:</span>
                 <div className="text-white font-medium">
                   {currentDataPoint.volume === 0 ? 'Unknown' : currentDataPoint.volume.toLocaleString()}
                 </div>
               </div>
             )}
                         {showMarketCap && currentDataPoint.marketCap && (
               <div>
                 <span className="text-gray-400">Market Cap:</span>
                 <div className="text-white font-medium">
                   {formatMarketCap(currentDataPoint.marketCap, selectedCurrencySymbol)}
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  )
} 