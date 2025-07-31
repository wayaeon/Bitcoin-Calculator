"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, X, DollarSign, Calendar, Target, BarChart3 } from 'lucide-react'

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
    endYear: 2050,
    currentBTCPrice: 117877, // Current BTC price
    targetBTCPrice: 100000000 // $100M target by 2050
  })
  const [result, setResult] = useState<CalculationResult | null>(null)

  // Calculate years between start and end
  const years = inputs.endYear - inputs.startYear

  // Calculate annual growth rate needed to reach $100M by 2050
  const calculateGrowthRate = () => {
    const currentPrice = inputs.currentBTCPrice
    const targetPrice = inputs.targetBTCPrice
    const yearsToTarget = 2050 - inputs.startYear
    return Math.pow(targetPrice / currentPrice, 1 / yearsToTarget) - 1
  }

  // Calculate future value based on investment type
  const calculateFutureValue = () => {
    const growthRate = calculateGrowthRate()
    const currentPrice = inputs.currentBTCPrice
    const targetPrice = inputs.targetBTCPrice
    
    let totalInvestment = 0
    let totalBitcoins = 0
    let breakdown = {}

    if (investmentType === 'one-time' || investmentType === 'both') {
      const oneTimeBitcoins = inputs.oneTimeAmount / currentPrice
      const oneTimeFutureValue = oneTimeBitcoins * targetPrice
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
        const currentYearPrice = currentPrice * Math.pow(1 + growthRate, year)
        const bitcoinsBought = inputs.dcaAmount / currentYearPrice
        
        dcaInvestment += inputs.dcaAmount
        dcaBitcoins += bitcoinsBought
      }
      
      totalInvestment += dcaInvestment
      totalBitcoins += dcaBitcoins
      breakdown = { ...breakdown, dcaInvestment, dcaBitcoins }
    }

    const futureValue = totalBitcoins * targetPrice
    const totalReturn = ((futureValue / totalInvestment - 1) * 100)
    const annualizedReturn = Math.pow(futureValue / totalInvestment, 1 / years) - 1

    return {
      totalInvestment,
      totalBitcoins,
      futureValue,
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border border-blue-500/20 bg-gray-900/95 backdrop-blur-sm shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Future Value Calculator
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-blue-100 text-sm">
            Calculate potential future value assuming Bitcoin reaches $100M by 2050
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-5">
          {/* Investment Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300">Investment Strategy</Label>
            <Select value={investmentType} onValueChange={(value: any) => setInvestmentType(value)}>
              <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="one-time" className="text-white hover:bg-gray-700">One-Time Investment</SelectItem>
                <SelectItem value="dca" className="text-white hover:bg-gray-700">Dollar Cost Averaging (DCA)</SelectItem>
                <SelectItem value="both" className="text-white hover:bg-gray-700">Both Strategies</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Investment Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* One-Time Investment */}
            {(investmentType === 'one-time' || investmentType === 'both') && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  One-Time Investment
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {selectedCurrencySymbol}
                  </span>
                  <input
                    type="number"
                    placeholder="10000"
                    className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  DCA Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    {selectedCurrencySymbol}
                  </span>
                  <input
                    type="number"
                    placeholder="1000"
                    className="w-full pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-300">DCA Frequency</Label>
              <Select value={inputs.dcaFrequency} onValueChange={(value: any) => setInputs(prev => ({ ...prev, dcaFrequency: value }))}>
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Year
              </Label>
              <input
                type="number"
                placeholder="2024"
                min="2024"
                max="2049"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={inputs.startYear}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 2024
                  setInputs(prev => ({ ...prev, startYear: value }))
                }}
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Target className="h-4 w-4" />
                End Year
              </Label>
              <input
                type="number"
                placeholder="2050"
                min="2025"
                max="2050"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={inputs.endYear}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 2050
                  setInputs(prev => ({ ...prev, endYear: value }))
                }}
              />
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-900/80 to-cyan-900/80 border-blue-500/30 rounded-lg">
                <div className="text-sm text-blue-400 mb-2">Future Value (2050)</div>
                <div className="text-3xl font-bold text-blue-300">
                  {selectedCurrencySymbol}{result.futureValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-blue-400 mt-2">
                  Total Return: {result.totalReturn.toFixed(2)}% | Annualized: {result.annualizedReturn.toFixed(2)}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Investment</div>
                  <div className="text-lg font-bold text-white">
                    {selectedCurrencySymbol}{result.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Bitcoins</div>
                  <div className="text-lg font-bold text-white">
                    {result.totalBitcoins.toFixed(8)}
                  </div>
                </div>
                <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Investment Period</div>
                  <div className="text-lg font-bold text-white">
                    {years} years
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              {investmentType === 'both' && result.breakdown && (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-300">Investment Breakdown</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg">
                      <div className="text-xs text-purple-400 mb-1">One-Time Investment</div>
                      <div className="text-sm font-bold text-purple-300">
                        {selectedCurrencySymbol}{result.breakdown.oneTimeInvestment?.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-400">
                        {result.breakdown.oneTimeBitcoins?.toFixed(8)} BTC
                      </div>
                    </div>
                    <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                      <div className="text-xs text-green-400 mb-1">DCA Investment</div>
                      <div className="text-sm font-bold text-green-300">
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
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
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
                  endYear: 2050,
                  currentBTCPrice: 117877,
                  targetBTCPrice: 100000000
                })
                setResult(null)
              }}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 