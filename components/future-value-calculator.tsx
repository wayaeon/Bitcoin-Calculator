"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { TrendingUp, X, DollarSign, Calendar, Target, BarChart3, Zap } from 'lucide-react'

interface FutureValueCalculatorProps {
  isOpen: boolean
  onClose: () => void
  selectedCurrency: string
  selectedCurrencySymbol: string
}

interface CalculationResult {
  totalInvestment: number
  totalBitcoins: number
  futureValue: number
  totalReturn: number
  annualizedReturn: number
  cagr: number
  breakdown: {
    oneTimeInvestment?: number
    oneTimeBitcoins?: number
    dcaInvestment?: number
    dcaBitcoins?: number
  }
}

export const FutureValueCalculator = ({ 
  isOpen, 
  onClose, 
  selectedCurrency, 
  selectedCurrencySymbol 
}: FutureValueCalculatorProps) => {
  const [investmentType, setInvestmentType] = useState<'one-time' | 'dca' | 'both'>('one-time')
  const [inputs, setInputs] = useState({
    oneTimeAmount: 10000,
    dcaAmount: 1000,
    dcaFrequency: 'monthly' as 'daily' | 'monthly' | 'quarterly' | 'yearly',
    startYear: 2024,
    endYear: 2040, // Changed default to 2040
    currentBTCPrice: 117877, // Current BTC price
    cagr: 58 // Default 58% CAGR
  })
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [isDisclaimerExpanded, setIsDisclaimerExpanded] = useState(false)

  // Calculate years between start and end
  const years = inputs.endYear - inputs.startYear

  // Calculate future BTC price based on CAGR
  const calculateFutureBTCPrice = () => {
    return inputs.currentBTCPrice * Math.pow(1 + inputs.cagr / 100, years)
  }

  // Calculate future value based on investment type
  const calculateFutureValue = () => {
    const futureBTCPrice = calculateFutureBTCPrice()
    const currentPrice = inputs.currentBTCPrice
    
    let totalInvestment = 0
    let totalBitcoins = 0
    let breakdown = {}

    if (investmentType === 'one-time' || investmentType === 'both') {
      const oneTimeBitcoins = inputs.oneTimeAmount / currentPrice
      const oneTimeFutureValue = oneTimeBitcoins * futureBTCPrice
      totalInvestment += inputs.oneTimeAmount
      totalBitcoins += oneTimeBitcoins
      breakdown = { ...breakdown, oneTimeInvestment: inputs.oneTimeAmount, oneTimeBitcoins }
    }

    if (investmentType === 'dca' || investmentType === 'both') {
      let dcaInvestment = 0
      let dcaBitcoins = 0
      
      // Calculate DCA based on frequency
      const frequencyMap = {
        daily: 365,
        monthly: 12,
        quarterly: 4,
        yearly: 1
      }
      
      const periodsPerYear = frequencyMap[inputs.dcaFrequency]
      const totalPeriods = years * periodsPerYear
      
      for (let period = 0; period < totalPeriods; period++) {
        const year = period / periodsPerYear
        const currentYearPrice = currentPrice * Math.pow(1 + inputs.cagr / 100, year)
        const bitcoinsBought = inputs.dcaAmount / currentYearPrice
        
        dcaInvestment += inputs.dcaAmount
        dcaBitcoins += bitcoinsBought
      }
      
      totalInvestment += dcaInvestment
      totalBitcoins += dcaBitcoins
      breakdown = { ...breakdown, dcaInvestment, dcaBitcoins }
    }

    const futureValue = totalBitcoins * futureBTCPrice
    const totalReturn = ((futureValue / totalInvestment - 1) * 100)
    const annualizedReturn = Math.pow(futureValue / totalInvestment, 1 / years) - 1

    return {
      totalInvestment,
      totalBitcoins,
      futureValue,
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
      cagr: inputs.cagr,
      breakdown
    }
  }

  useEffect(() => {
    if (inputs.oneTimeAmount > 0 || inputs.dcaAmount > 0) {
      const result = calculateFutureValue()
      setResult(result)
    } else {
      setResult(null)
    }
  }, [inputs, investmentType])

  if (!isOpen) return null

  const futureBTCPrice = calculateFutureBTCPrice()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-lg sm:max-w-2xl border border-blue-500/20 bg-gray-900/95 backdrop-blur-sm shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              Future Value Calculator
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
          <CardDescription className="text-blue-100 text-xs sm:text-sm">
            Calculate potential future value with customizable CAGR and timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 pt-3 sm:pt-5">
          {/* Disclaimer - Toggleable */}
          <div className="bg-gradient-to-r from-amber-900/80 to-orange-900/80 border-amber-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsDisclaimerExpanded(!isDisclaimerExpanded)}
              className="w-full p-3 sm:p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-amber-400 font-semibold">⚠️ Important Disclaimer</span>
                <span className="text-xs text-amber-300">(Click to expand)</span>
              </div>
              <div className="text-amber-400">
                {isDisclaimerExpanded ? '−' : '+'}
              </div>
            </button>
            {isDisclaimerExpanded && (
              <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="text-xs text-amber-300 space-y-2">
                  <p>
                    This calculator operates on the explicit assumption that by 2040, Bitcoin (BTC) will have become the dominant global reserve and exchange currency. It's built on the premise that, under a Bitcoin standard, humanity will be structurally incentivized—by BTC's thermodynamic and mathematical integrity—to maximize holistic efficiency and channel innovation toward genuinely productive, uplifting outcomes.
                  </p>
                  <p>
                    The exponential convergence of AI, robotics, quantum computing, nuclear fusion, and other civilization-scale technologies will unleash unprecedented economic growth. When tethered to a truly finite asset like Bitcoin, this growth means purchasing power could climb indefinitely.
                  </p>
                  <p>
                    When you take the only truly indestructible, incorruptible, finite, and decentralized store of value—limited to 21 million coins—and divide it by 8.2 billion humans who want 100% of their life output to be valued and secure… and when that store of wealth structurally rewards existentially aligned, energy-efficient productivity?
                  </p>
                  <p className="font-semibold">
                    $100,000,000 per BTC purchasing power comes clearly into view.
                  </p>
                  <p>
                    This also assumes FIAT currency goes extinct within the next 25 years, manipulated markets die out, and asset classes like gold and other tangible resource-based stores of value collapse due to a shift in human priorities and phenomena like asteroid mining.
                  </p>
                  <p className="font-semibold text-amber-200">
                    Note: This scenario is highly speculative and represents a specific vision for the future. Use this calculator as a thought experiment, not financial advice.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Investment Type Selection */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-gray-300">Investment Strategy</Label>
            <Select value={investmentType} onValueChange={(value: any) => setInvestmentType(value)}>
              <SelectTrigger className="border-gray-600 bg-gray-800 text-white h-9 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="one-time" className="text-white hover:bg-gray-700">One-Time Investment</SelectItem>
                <SelectItem value="dca" className="text-white hover:bg-gray-700">Dollar Cost Averaging (DCA)</SelectItem>
                <SelectItem value="both" className="text-white hover:bg-gray-700">Both Strategies</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* CAGR Slider */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              Annual Growth Rate (CAGR): {inputs.cagr}%
            </Label>
            <Slider
              value={[inputs.cagr]}
              onValueChange={(value) => setInputs(prev => ({ ...prev, cagr: value[0] }))}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>1%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Investment Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* One-Time Investment */}
            {(investmentType === 'one-time' || investmentType === 'both') && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  One-Time Investment
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                    {selectedCurrencySymbol}
                  </span>
                  <input
                    type="number"
                    placeholder="10000"
                    className="w-full pl-6 sm:pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    value={inputs.oneTimeAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      setInputs(prev => ({ ...prev, oneTimeAmount: value }))
                    }}
                  />
                </div>
              </div>
            )}

            {/* DCA Investment */}
            {(investmentType === 'dca' || investmentType === 'both') && (
              <div className="space-y-2 sm:space-y-3">
                <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                  DCA Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                    {selectedCurrencySymbol}
                  </span>
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full pl-6 sm:pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    value={inputs.dcaAmount}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      setInputs(prev => ({ ...prev, dcaAmount: value }))
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DCA Frequency */}
          {(investmentType === 'dca' || investmentType === 'both') && (
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300">DCA Frequency</Label>
              <Select value={inputs.dcaFrequency} onValueChange={(value: any) => setInputs(prev => ({ ...prev, dcaFrequency: value }))}>
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="daily" className="text-white hover:bg-gray-700">Daily</SelectItem>
                  <SelectItem value="monthly" className="text-white hover:bg-gray-700">Monthly</SelectItem>
                  <SelectItem value="quarterly" className="text-white hover:bg-gray-700">Quarterly</SelectItem>
                  <SelectItem value="yearly" className="text-white hover:bg-gray-700">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                Start Year
              </Label>
              <input
                type="number"
                placeholder="2024"
                min="2024"
                max="2039"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={inputs.startYear}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 2024
                  setInputs(prev => ({ ...prev, startYear: value }))
                }}
              />
            </div>
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium text-gray-300 flex items-center gap-1 sm:gap-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                End Year
              </Label>
              <input
                type="number"
                placeholder="2040"
                min="2025"
                max="2050"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                value={inputs.endYear}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 2040
                  setInputs(prev => ({ ...prev, endYear: value }))
                }}
              />
            </div>
          </div>

          {/* BTC Purchasing Power Projection */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border-purple-500/30 rounded-lg">
            <div className="text-xs sm:text-sm text-purple-400 mb-1 sm:mb-2">BTC Purchasing Power Projection ({inputs.endYear})</div>
            <div className="text-lg sm:text-xl font-bold text-purple-300">
              {selectedCurrencySymbol}{futureBTCPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-purple-400 mt-1 sm:mt-2">
              From {selectedCurrencySymbol}{inputs.currentBTCPrice.toLocaleString()} in {inputs.startYear} (relative to today)
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-900/80 to-cyan-900/80 border-blue-500/30 rounded-lg">
                <div className="text-xs sm:text-sm text-blue-400 mb-1 sm:mb-2">Future Purchasing Power ({inputs.endYear})</div>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-300">
                  {selectedCurrencySymbol}{result.futureValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-blue-400 mt-1 sm:mt-2">
                  Total Return: {result.totalReturn.toFixed(2)}% | Annualized: {result.annualizedReturn.toFixed(2)}% (relative to today)
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Investment</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {selectedCurrencySymbol}{result.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Bitcoins</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {result.totalBitcoins.toFixed(8)}
                  </div>
                </div>
                <div className="p-2 sm:p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Investment Period</div>
                  <div className="text-sm sm:text-lg font-bold text-white">
                    {years} years
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              {investmentType === 'both' && result.breakdown && (
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-xs sm:text-sm font-medium text-gray-300">Investment Breakdown</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                      <div className="text-xs text-purple-400 mb-1">One-Time Investment</div>
                      <div className="text-xs sm:text-sm font-bold text-purple-300">
                        {selectedCurrencySymbol}{result.breakdown.oneTimeInvestment?.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-400">
                        {result.breakdown.oneTimeBitcoins?.toFixed(8)} BTC
                      </div>
                    </div>
                    <div className="p-2 sm:p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                      <div className="text-xs text-green-400 mb-1">DCA Investment</div>
                      <div className="text-xs sm:text-sm font-bold text-green-300">
                        {selectedCurrencySymbol}{result.breakdown.dcaInvestment?.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-400">
                        {result.breakdown.dcaBitcoins?.toFixed(8)} BTC
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
                  oneTimeAmount: 10000,
                  dcaAmount: 1000,
                  dcaFrequency: 'monthly',
                  startYear: 2024,
                  endYear: 2040,
                  currentBTCPrice: 117877,
                  cagr: 58
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