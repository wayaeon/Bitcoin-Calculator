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
  Rocket
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
import { BTCChart } from './btc-chart'
import { BTCOutputCards } from './btc-output-cards'
import { BTCPriceHistory } from './btc-price-history'
import Galaxy from './Galaxy'

export function BTCCalculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    investmentType: 'one-time',
    investmentAmount: 10000,
    dcaFrequency: 'monthly',
    dcaAmount: 1000,
    startYear: 0,
    globalWealthCAGR: 4,
    btcCAGR: 15
  })
  const [outputs, setOutputs] = useState<CalculatorOutputs | null>(null)
  const [currentBTCPrice, setCurrentBTCPrice] = useState<number>(BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE)
  const [isLoading, setIsLoading] = useState(false)

  const handleCalculate = async () => {
    try {
      setIsLoading(true)
      const currentPrice = await getCurrentBTCPrice()
      setCurrentBTCPrice(currentPrice)
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
      {/* Galaxy Background */}
      <div className="absolute inset-0">
        <Galaxy 
          starSpeed={0.3}
          density={0.8}
          hueShift={30}
          speed={0.8}
          mouseInteraction={true}
          glowIntensity={0.4}
          saturation={0.2}
          mouseRepulsion={true}
          twinkleIntensity={0.4}
          rotationSpeed={0.05}
          repulsionStrength={1.5}
          transparent={true}
        />
      </div>
      
      {/* Header Section */}
      <div className="relative z-10 bg-gradient-to-r from-orange-600/90 via-amber-600/90 to-yellow-600/90 backdrop-blur-sm text-white">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Bitcoin className="h-12 w-12 text-yellow-300" />
              <h1 className="text-5xl font-bold">Bitcoin Future Value Calculator</h1>
              <Bitcoin className="h-12 w-12 text-yellow-300" />
            </div>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto">
              Project Bitcoin's potential value based on global wealth growth and your investment strategy. 
              This model assumes BTC could capture a portion of global wealth by year 30, 
              with exponential price growth from current levels.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8 relative z-10">
        {/* BTC Price History Section - Top */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-orange-400" />
            <h2 className="text-2xl font-bold text-white">Live Bitcoin Price History</h2>
          </div>
          <BTCPriceHistory />
        </div>

        {/* Calculator Section - Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-orange-500/30 bg-gray-900/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Investment Parameters
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Configure your Bitcoin investment strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Investment Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-200">Investment Strategy</Label>
                  <Select 
                    value={inputs.investmentType} 
                    onValueChange={(value: 'one-time' | 'dca') => 
                      setInputs(prev => ({ ...prev, investmentType: value }))
                    }
                  >
                    <SelectTrigger className="border-orange-500/30 bg-gray-800 text-white focus:border-orange-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="one-time">One-Time Investment</SelectItem>
                      <SelectItem value="dca">Dollar-Cost Averaging (DCA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Investment Amount */}
                {inputs.investmentType === 'one-time' ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-200">Investment Amount</Label>
                    <Input
                      type="number"
                      value={inputs.investmentAmount}
                      onChange={(e) => setInputs(prev => ({ 
                        ...prev, 
                        investmentAmount: parseFloat(e.target.value) || 0 
                      }))}
                      className="border-orange-500/30 bg-gray-800 text-white focus:border-orange-400"
                      placeholder="Enter amount"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-200">DCA Frequency</Label>
                      <Select 
                        value={inputs.dcaFrequency} 
                        onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                          setInputs(prev => ({ ...prev, dcaFrequency: value }))
                        }
                      >
                        <SelectTrigger className="border-orange-500/30 bg-gray-800 text-white focus:border-orange-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-200">DCA Amount</Label>
                      <Input
                        type="number"
                        value={inputs.dcaAmount}
                        onChange={(e) => setInputs(prev => ({ 
                          ...prev, 
                          dcaAmount: parseFloat(e.target.value) || 0 
                        }))}
                        className="border-orange-500/30 bg-gray-800 text-white focus:border-orange-400"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>
                )}

                {/* Start Year */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-200">Start Year (0 = Now)</Label>
                  <Input
                    type="number"
                    value={inputs.startYear}
                    onChange={(e) => setInputs(prev => ({ 
                      ...prev, 
                      startYear: parseInt(e.target.value) || 0 
                    }))}
                    className="border-orange-500/30 bg-gray-800 text-white focus:border-orange-400"
                    placeholder="Enter year"
                  />
                </div>

                {/* Global Wealth CAGR */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-200">
                    Global Wealth CAGR: {inputs.globalWealthCAGR}%
                  </Label>
                  <Slider
                    value={[inputs.globalWealthCAGR]}
                    onValueChange={(value) => setInputs(prev => ({ 
                      ...prev, 
                      globalWealthCAGR: value[0] 
                    }))}
                    max={10}
                    min={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* BTC CAGR */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-200">
                    BTC CAGR: {inputs.btcCAGR}%
                  </Label>
                  <Slider
                    value={[inputs.btcCAGR]}
                    onValueChange={(value) => setInputs(prev => ({ 
                      ...prev, 
                      btcCAGR: value[0] 
                    }))}
                    max={50}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Current BTC Price Display */}
                <Card className="bg-gradient-to-r from-green-900/80 to-emerald-900/80 border-green-500/30 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-green-300">Current BTC Price</CardTitle>
                    <CardDescription className="text-xs text-green-400">Live from CoinGecko</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(currentBTCPrice)}
                    </div>
                  </CardContent>
                </Card>

                {/* Calculate Button */}
                <Button 
                  onClick={handleCalculate} 
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold py-3"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Calculating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Calculate Future Value
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-2 space-y-6">
            {outputs && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-900/80 to-emerald-900/80 border-green-500/30 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-green-300 flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Future BTC Holdings
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-400">
                        {formatBTC(outputs.futureBTCHoldings)}
                      </div>
                      <p className="text-xs text-green-400 mt-1">BTC</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-900/80 to-cyan-900/80 border-blue-500/30 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Future Value
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-400">
                        {formatCurrency(outputs.futureValue)}
                      </div>
                      <p className="text-xs text-blue-400 mt-1">USD</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-900/80 to-violet-900/80 border-purple-500/30 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        % Global Wealth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-400">
                        {formatPercentage(outputs.percentageOfGlobalWealth)}
                      </div>
                      <p className="text-xs text-purple-400 mt-1">of total wealth</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Chart */}
                <Card className="border-2 border-orange-500/30 bg-gray-900/80 backdrop-blur-sm">
                  <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Investment Trajectory
                    </CardTitle>
                    <CardDescription className="text-orange-100">
                      Visualize your investment growth over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <BTCChart outputs={outputs} inputs={inputs} />
                  </CardContent>
                </Card>

                {/* Detailed Output Cards */}
                <BTCOutputCards outputs={outputs} />
              </>
            )}

            {!outputs && (
              <Card className="border-2 border-orange-500/30 bg-gray-900/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="h-5 w-5" />
                    Ready to Calculate
                  </CardTitle>
                  <CardDescription className="text-orange-100">
                    Configure your parameters and click calculate to see your Bitcoin future
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Target className="h-16 w-16 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">
                      Start Your Bitcoin Journey
                    </h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                      Set your investment parameters above and click "Calculate Future Value" 
                      to see how your Bitcoin investment could grow over time.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 