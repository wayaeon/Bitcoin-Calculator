"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, X, DollarSign, Calendar, Clock, Target } from 'lucide-react'

interface BTCPriceData {
  timestamp: number
  price: number
  volume?: number
  marketCap?: number
}

interface RegretCalculatorProps {
  isOpen: boolean
  onClose: () => void
  selectedCurrency: string
  selectedCurrencySymbol: string
  convertedData: BTCPriceData[]
}

interface PresetDate {
  label: string
  yearsAgo: number
  description: string
}

interface CalculationResult {
  investmentPrice: number
  currentPrice: number
  btcAmount: number
  currentValue: number
  absoluteGain: number
  gainPercentage: number
  investmentDate: string
  daysHeld: number
}

export const RegretCalculator = ({ 
  isOpen, 
  onClose, 
  selectedCurrency, 
  selectedCurrencySymbol,
  convertedData
}: RegretCalculatorProps) => {
  const [investmentType, setInvestmentType] = useState<'preset' | 'custom' | 'yearly'>('preset')
  const [inputs, setInputs] = useState({
    investmentAmount: 10000,
    investmentDate: '',
    selectedYear: 2020,
    selectedPreset: '1 Year Ago'
  })
  const [result, setResult] = useState<CalculationResult | null>(null)

  // Updated preset date options that go back to 2009
  const presetDates: PresetDate[] = [
    { label: '1 Year Ago', yearsAgo: 1, description: 'Invested 1 year ago' },
    { label: '2 Years Ago', yearsAgo: 2, description: 'Invested 2 years ago' },
    { label: '3 Years Ago', yearsAgo: 3, description: 'Invested 3 years ago' },
    { label: '5 Years Ago', yearsAgo: 5, description: 'Invested 5 years ago' },
    { label: '10 Years Ago', yearsAgo: 10, description: 'Invested 10 years ago' },
    { label: 'Bitcoin Early Days (2013)', yearsAgo: 12, description: 'Early Bitcoin adoption' },
    { label: 'Bitcoin Genesis (2010)', yearsAgo: 15, description: 'Very early Bitcoin' },
    { label: 'Bitcoin Launch (2009)', yearsAgo: 16, description: 'Bitcoin genesis block era' }
  ]

  // Get available years from data
  const getAvailableYears = () => {
    if (convertedData.length === 0) return []
    
    const years = new Set<number>()
    convertedData.forEach(data => {
      const year = new Date(data.timestamp).getFullYear()
      years.add(year)
    })
    
    return Array.from(years).sort((a, b) => b - a) // Sort descending
  }

  // Calculate average price for a specific year
  const getAveragePriceForYear = (year: number) => {
    const yearData = convertedData.filter(data => {
      const dataYear = new Date(data.timestamp).getFullYear()
      return dataYear === year
    })
    
    if (yearData.length === 0) return null
    
    const totalPrice = yearData.reduce((sum, data) => sum + data.price, 0)
    return totalPrice / yearData.length
  }

  // Get investment date based on type
  const getInvestmentDate = () => {
    const today = new Date()
    
    if (investmentType === 'preset') {
      const selectedPreset = presetDates.find(p => p.label === inputs.selectedPreset)
      if (selectedPreset) {
        // Calculate exact date by subtracting years from today
        const date = new Date(today.getFullYear() - selectedPreset.yearsAgo, today.getMonth(), today.getDate())
        return date
      }
    } else if (investmentType === 'custom') {
      if (inputs.investmentDate) {
        return new Date(inputs.investmentDate)
      }
    } else if (investmentType === 'yearly') {
      return new Date(inputs.selectedYear, 6, 1) // July 1st of selected year
    }
    
    return null
  }

  // Calculate regret based on investment type
  const calculateRegret = () => {
    if (convertedData.length === 0 || inputs.investmentAmount <= 0) return null
    
    const investmentDate = getInvestmentDate()
    if (!investmentDate) return null
    
    const currentDate = new Date()
    const currentPrice = convertedData[convertedData.length - 1].price
    
    let investmentPrice: number
    let actualInvestmentDate: Date
    
    if (investmentType === 'yearly') {
      const avgPrice = getAveragePriceForYear(inputs.selectedYear)
      if (!avgPrice) return null
      investmentPrice = avgPrice
      actualInvestmentDate = new Date(inputs.selectedYear, 6, 1) // July 1st of selected year
    } else {
      // Find closest price data to investment date
      const investmentTimestamp = investmentDate.getTime()
      
      // First, try to find exact date match using YYYY-MM-DD format
      const exactMatch = convertedData.find(data => {
        const dataDate = new Date(data.timestamp)
        const dataDateStr = dataDate.toISOString().split('T')[0] // YYYY-MM-DD format
        const investmentDateStr = investmentDate.toISOString().split('T')[0] // YYYY-MM-DD format
        return dataDateStr === investmentDateStr
      })
      
      if (exactMatch) {
        investmentPrice = exactMatch.price
        actualInvestmentDate = new Date(exactMatch.timestamp)
      } else {
        // If no exact match, find closest date
        const closestData = convertedData.reduce((prev, curr) => {
          return Math.abs(curr.timestamp - investmentTimestamp) < Math.abs(prev.timestamp - investmentTimestamp) ? curr : prev
        })
        investmentPrice = closestData.price
        actualInvestmentDate = new Date(closestData.timestamp)
      }
    }
    
    // Calculate results
    const btcAmount = inputs.investmentAmount / investmentPrice
    const currentValue = btcAmount * currentPrice
    const absoluteGain = currentValue - inputs.investmentAmount
    const gainPercentage = ((currentValue - inputs.investmentAmount) / inputs.investmentAmount) * 100
    const daysHeld = Math.floor((currentDate.getTime() - actualInvestmentDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      investmentPrice,
      currentPrice,
      btcAmount,
      currentValue,
      absoluteGain,
      gainPercentage,
      investmentDate: actualInvestmentDate.toLocaleDateString(),
      daysHeld
    }
  }

  // Get min and max dates for custom date input
  const getDateRange = () => {
    if (convertedData.length === 0) return { min: '', max: '' }
    
    const minDate = new Date(convertedData[0].timestamp).toISOString().split('T')[0]
    const maxDate = new Date(convertedData[convertedData.length - 1].timestamp).toISOString().split('T')[0]
    
    return { min: minDate, max: maxDate }
  }

  useEffect(() => {
    const result = calculateRegret()
    setResult(result)
  }, [inputs, investmentType, convertedData])

  if (!isOpen) return null

  const dateRange = getDateRange()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-lg sm:max-w-2xl border border-red-500/20 bg-gray-900/95 backdrop-blur-sm shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-red-600/90 to-pink-600/90 text-white pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Regret Calculator
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10 h-8 w-8 sm:h-9 sm:w-9"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <CardDescription className="text-red-100 text-xs sm:text-sm">
            Calculate potential gains from historical Bitcoin investments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 pt-3 sm:pt-5">
          {/* Investment Type Selection */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-gray-300">Investment Type</Label>
            <Select value={investmentType} onValueChange={(value: any) => setInvestmentType(value)}>
              <SelectTrigger className="border-gray-600 bg-gray-800 text-white h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="preset" className="text-white hover:bg-gray-700">Preset Dates</SelectItem>
                <SelectItem value="custom" className="text-white hover:bg-gray-700">Custom Date</SelectItem>
                <SelectItem value="yearly" className="text-white hover:bg-gray-700">Yearly Average</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investment Amount */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
              Investment Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                {selectedCurrencySymbol}
              </span>
              <input
                type="number"
                placeholder="10000"
                className="w-full pl-6 sm:pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                value={inputs.investmentAmount}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  setInputs(prev => ({ ...prev, investmentAmount: value }))
                }}
              />
            </div>
          </div>

          {/* Date Selection Based on Type */}
          {investmentType === 'preset' && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                Investment Period
              </Label>
              <Select value={inputs.selectedPreset} onValueChange={(value: any) => setInputs(prev => ({ ...prev, selectedPreset: value }))}>
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {presetDates.map((preset) => (
                    <SelectItem key={preset.label} value={preset.label} className="text-white hover:bg-gray-700">
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {investmentType === 'custom' && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                Investment Date
              </Label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                min={dateRange.min}
                max={dateRange.max}
                value={inputs.investmentDate}
                onChange={(e) => {
                  setInputs(prev => ({ ...prev, investmentDate: e.target.value }))
                }}
              />
              {convertedData.length > 0 && (
                <div className="text-xs text-gray-400">
                  Available: {new Date(convertedData[0].timestamp).toLocaleDateString()} - {new Date(convertedData[convertedData.length - 1].timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {investmentType === 'yearly' && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                Investment Year
              </Label>
              <Select value={inputs.selectedYear.toString()} onValueChange={(value: any) => setInputs(prev => ({ ...prev, selectedYear: parseInt(value) }))}>
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {getAvailableYears().map((year) => (
                    <SelectItem key={year} value={year.toString()} className="text-white hover:bg-gray-700">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-red-900/80 to-pink-900/80 border-red-500/30 rounded-lg">
                <div className="text-xs sm:text-sm text-red-400 mb-1 sm:mb-2">Current Value</div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-300">
                  {selectedCurrencySymbol}{result.currentValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-red-400 mt-1 sm:mt-2">
                  {result.gainPercentage >= 0 ? 'Gain' : 'Loss'}: {result.gainPercentage >= 0 ? '+' : ''}{result.gainPercentage.toFixed(2)}% 
                  ({result.gainPercentage >= 0 ? '+' : ''}{selectedCurrencySymbol}{result.absoluteGain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Investment Price</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {selectedCurrencySymbol}{result.investmentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Bitcoins Acquired</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {result.btcAmount.toFixed(8)}
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Days Held</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {result.daysHeld.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-3 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">Investment Details</div>
                <div className="text-xs sm:text-sm text-white">
                  Invested {selectedCurrencySymbol}{inputs.investmentAmount.toLocaleString()} on {result.investmentDate}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Bitcoin Price on {result.investmentDate}: {selectedCurrencySymbol}{result.investmentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-gray-400">
                  Current Bitcoin Price: {selectedCurrencySymbol}{result.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-2">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 h-9 sm:h-10 text-xs sm:text-sm"
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setInputs({
                  investmentAmount: 10000,
                  investmentDate: '',
                  selectedYear: 2020,
                  selectedPreset: '1 Year Ago'
                })
                setResult(null)
              }}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 h-9 sm:h-10 text-xs sm:text-sm"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 