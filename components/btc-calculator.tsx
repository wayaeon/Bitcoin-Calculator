"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Bitcoin, 
  Target,
  Zap,
  BarChart3,
  Coins,
  Globe,
  Rocket,
  ChevronUp,
  ChevronDown,
  Menu,
  Settings,
  Share2
} from 'lucide-react'
import { 
  BTC_CALCULATOR_CONSTANTS,
  CalculatorInputs,
  CalculatorOutputs,
  calculateBTCFutureValue,
  formatCurrency,
  formatBTC,
  formatPercentage,
  getCurrentBTCPrice
} from '@/lib/btc-calculator'
import { useBTCPrice } from '@/hooks/use-btc-price'
import { BTCChart } from './btc-chart'
import { BTCOutputCards } from './btc-output-cards'
import { BTCPriceHistory } from './btc-price-history'
import { FutureValueCalculator } from './future-value-calculator'
import { RegretCalculator } from './regret-calculator'

export function BTCCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    investmentType: 'one-time',
    investmentAmount: 1000,
    dcaFrequency: 'monthly',
    dcaAmount: 10,
    startYear: 2024,
    endYear: 2040,
    globalWealthCAGR: 4,
    btcCAGR: 15
  })
  const [outputs, setOutputs] = useState<CalculatorOutputs | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Real-time BTC price hook
  const { priceData, isLoading: priceLoading, error: priceError } = useBTCPrice()
  
  // Calculator popup states
  const [isFutureValueOpen, setIsFutureValueOpen] = useState(false)
  const [isRegretOpen, setIsRegretOpen] = useState(false)
  const [isCalculatorExpanded, setIsCalculatorExpanded] = useState(false)
  
  // State to store price history data
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [selectedCurrencySymbol, setSelectedCurrencySymbol] = useState('$')

  const handleCalculate = async () => {
    try {
      setIsLoading(true)
      const currentPrice = priceData?.price || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
      const result = calculateBTCFutureValue(inputs)
      setOutputs(result)
    } catch (error) {
      console.error('Calculation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Simple Static Background instead of Galaxy */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,165,0,0.1),transparent_50%)]"></div>
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[radial-gradient(circle,rgba(59,130,246,0.1),transparent_70%)]"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(139,92,246,0.1),transparent_70%)]"></div>
        </div>
      </div>
      
      {/* Redesigned Header Section - More Responsive */}
      <div className="relative z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800/50 shadow-lg">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            {/* Left Side - Logo and Title */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Bitcoin className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    The Bitcoin Calculator
                  </h1>
                  <p className="text-xs text-gray-400 font-medium hidden sm:block">
                    Missed Opportunity and Future Value
                  </p>
                </div>
              </div>
            </div>

            {/* Center - Live Price Display - Responsive */}
            <div className="hidden md:flex items-center gap-4 lg:gap-6">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Current BTC Price</div>
                <div className="text-sm lg:text-lg font-bold text-green-400">
                  {priceLoading ? (
                    <div className="animate-pulse">Loading...</div>
                  ) : priceError ? (
                    <div className="text-red-400">Error</div>
                  ) : priceData ? (
                    `$${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  ) : (
                    `$${BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE.toLocaleString()}`
                  )}
                </div>
              </div>
              <div className="w-px h-6 lg:h-8 bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">24h Change</div>
                <div className={`text-xs lg:text-sm font-semibold ${
                  (priceData?.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {priceLoading ? (
                    <div className="animate-pulse">...</div>
                  ) : priceError ? (
                    <div className="text-red-400">Error</div>
                  ) : priceData ? (
                    `${(priceData.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}${(priceData.price_change_percentage_24h ?? 0).toFixed(2)}%`
                  ) : (
                    '+2.34%'
                  )}
                </div>
              </div>
              <div className="w-px h-6 lg:h-8 bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                <div className="text-xs lg:text-sm font-semibold text-white">
                  {priceLoading ? (
                    <div className="animate-pulse">...</div>
                  ) : priceError ? (
                    <div className="text-red-400">Error</div>
                  ) : priceData ? (
                    `$${(priceData.market_cap / 1e12).toFixed(1)}T`
                  ) : (
                    '$2.3T'
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Price Display */}
            <div className="md:hidden flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400">BTC Price</div>
                <div className="text-sm font-bold text-green-400">
                  {priceLoading ? (
                    <div className="animate-pulse">Loading...</div>
                  ) : priceError ? (
                    <div className="text-red-400">Error</div>
                  ) : priceData ? (
                    `$${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  ) : (
                    `$${BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE.toLocaleString()}`
                  )}
                </div>
              </div>
              <div className="w-px h-8 bg-gray-700"></div>
              <div className="text-center">
                <div className="text-xs text-gray-400">24h</div>
                <div className={`text-sm font-semibold ${
                  (priceData?.price_change_percentage_24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {priceLoading ? (
                    <div className="animate-pulse">...</div>
                  ) : priceError ? (
                    <div className="text-red-400">Error</div>
                  ) : priceData ? (
                    `${(priceData.price_change_percentage_24h ?? 0) >= 0 ? '+' : ''}${(priceData.price_change_percentage_24h ?? 0).toFixed(2)}%`
                  ) : (
                    '+2.34%'
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 sm:h-9 sm:px-3 text-gray-300 hover:text-white hover:bg-gray-800/50"
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 sm:h-9 sm:px-3 text-gray-300 hover:text-white hover:bg-gray-800/50"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-700"></div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 sm:h-9 sm:px-3 text-gray-300 hover:text-white hover:bg-gray-800/50"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area - Responsive */}
      <div className="container mx-auto px-4 py-2 relative z-10 h-[calc(100vh-80px)] sm:h-[calc(100vh-100px)] flex items-center justify-center">
        {/* Full Window Price History */}
        <div className="w-full max-w-7xl h-full flex flex-col">
          <BTCPriceHistory 
            onDataUpdate={(data, currency, currencySymbol) => {
              setPriceHistoryData(data)
              setSelectedCurrency(currency)
              setSelectedCurrencySymbol(currencySymbol)
            }}
          />
        </div>

        {/* Single Expandable Calculator Widget - Responsive Positioning */}
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
          <div className="relative">
            {/* Main Calculator Button */}
            <button
              onClick={() => setIsCalculatorExpanded(!isCalculatorExpanded)}
              className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-600/90 via-orange-500/90 to-amber-600/90 hover:from-orange-700/90 hover:via-orange-600/90 hover:to-amber-700/90 rounded-2xl shadow-2xl hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center text-white text-xl sm:text-2xl backdrop-blur-sm border border-orange-400/20"
              title="Calculators - Future Value & Regret Calculators"
            >
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8" />
            </button>
            
            {/* Expandable Calculator Options */}
            {isCalculatorExpanded && (
              <div className="absolute bottom-full right-0 mb-3 space-y-2">
                {/* Future Value Calculator Button */}
                <button
                  onClick={() => {
                    setIsFutureValueOpen(true)
                    setIsCalculatorExpanded(false)
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600/90 via-blue-500/90 to-cyan-600/90 hover:from-blue-700/90 hover:via-blue-600/90 hover:to-cyan-700/90 rounded-xl shadow-xl hover:shadow-blue-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center text-white backdrop-blur-sm border border-blue-400/20"
                  title="Future Value Calculator"
                >
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                
                {/* Regret Calculator Button */}
                <button
                  onClick={() => {
                    setIsRegretOpen(true)
                    setIsCalculatorExpanded(false)
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-red-600/90 via-red-500/90 to-pink-600/90 hover:from-red-700/90 hover:via-red-600/90 hover:to-pink-700/90 rounded-xl shadow-xl hover:shadow-red-500/25 hover:scale-105 transition-all duration-300 flex items-center justify-center text-white backdrop-blur-sm border border-red-400/20"
                  title="Regret Calculator"
                >
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            )}
            
            {/* Expand/Collapse Icon */}
            <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-gray-800/90 rounded-full flex items-center justify-center border border-gray-600/50">
              {isCalculatorExpanded ? (
                <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-300" />
              ) : (
                <ChevronUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-300" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Calculator Popups */}
      <FutureValueCalculator
        isOpen={isFutureValueOpen}
        onClose={() => setIsFutureValueOpen(false)}
        selectedCurrency={selectedCurrency}
        selectedCurrencySymbol={selectedCurrencySymbol}
      />
      
      <RegretCalculator
        isOpen={isRegretOpen}
        onClose={() => setIsRegretOpen(false)}
        selectedCurrency={selectedCurrency}
        selectedCurrencySymbol={selectedCurrencySymbol}
        convertedData={priceHistoryData}
      />
    </div>
  )
} 