"use client"

import React from 'react'
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react'

interface BTCChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: any
  selectedCurrency?: string
  selectedCurrencySymbol?: string
  data?: any[]
  convertedData?: any[]
  className?: string
}

interface Currency {
  code: string
  name: string
  symbol: string
  rate: number
}

export const BTCChartTooltip = ({
  active,
  payload,
  label,
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

  // Find the corresponding data point for the current value to get the correct date
  const currentDataPoint = convertedData.find(item => Math.abs(item.price - numericValue) < 0.01) || 
                          data.find(item => Math.abs(item.price - numericValue) < 0.01) || 
                          convertedData[0] || data[0]
  const currentDate = new Date(currentDataPoint?.timestamp || Date.now())

  return (
    <div className={`bg-gray-900/95 border border-gray-700 text-white backdrop-blur-sm shadow-xl rounded-lg p-4 ${className}`}>
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
          {selectedCurrencySymbol}{numericValue.toLocaleString(undefined, { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 5 
          })}
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
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
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
            {currentDataPoint.volume && (
              <div>
                <span className="text-gray-400">Volume:</span>
                <div className="text-white font-medium">
                  {currentDataPoint.volume.toLocaleString()}
                </div>
              </div>
            )}
            {currentDataPoint.marketCap && (
              <div>
                <span className="text-gray-400">Market Cap:</span>
                <div className="text-white font-medium">
                  {selectedCurrencySymbol}{(currentDataPoint.marketCap / 1e12).toFixed(2)}T
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
}: BTCChartTooltipProps & {
  showVolume?: boolean
  showMarketCap?: boolean
  showPercentageChange?: boolean
  customStyling?: React.CSSProperties
}) => {
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

  // Find the corresponding data point
  const currentDataPoint = convertedData.find(item => Math.abs(item.price - numericValue) < 0.01) || 
                          data.find(item => Math.abs(item.price - numericValue) < 0.01) || 
                          convertedData[0] || data[0]
  const currentDate = new Date(currentDataPoint?.timestamp || Date.now())

  return (
    <div 
      className={`bg-gray-900/95 border border-gray-700 text-white backdrop-blur-sm shadow-xl rounded-lg p-4 ${className}`}
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
          {selectedCurrencySymbol}{numericValue.toLocaleString(undefined, { 
            minimumFractionDigits: 0, 
            maximumFractionDigits: 5 
          })}
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
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}
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
            {showVolume && currentDataPoint.volume && (
              <div>
                <span className="text-gray-400">Volume:</span>
                <div className="text-white font-medium">
                  {currentDataPoint.volume.toLocaleString()}
                </div>
              </div>
            )}
            {showMarketCap && currentDataPoint.marketCap && (
              <div>
                <span className="text-gray-400">Market Cap:</span>
                <div className="text-white font-medium">
                  {selectedCurrencySymbol}{(currentDataPoint.marketCap / 1e12).toFixed(2)}T
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 