"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalculatorOutputs, formatCurrency, formatPercentage, formatBTC } from '@/lib/btc-calculator'
import { TrendingUp, DollarSign, Percent, Coins } from 'lucide-react'

interface BTCOutputCardsProps {
  outputs: CalculatorOutputs
}

export function BTCOutputCards({ outputs }: BTCOutputCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Future BTC Value */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Future BTC Value</CardTitle>
          <DollarSign className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(outputs.futureBTCValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Value at year {outputs.yearlyBreakdown[outputs.yearlyBreakdown.length - 1]?.year || 30}
          </p>
        </CardContent>
      </Card>

      {/* BTC Holdings */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">BTC Holdings</CardTitle>
          <Coins className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatBTC(outputs.totalBTCHoldings)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Bitcoin accumulated
          </p>
        </CardContent>
      </Card>

      {/* Return Percentage */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Return</CardTitle>
          <TrendingUp className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatPercentage(outputs.returnPercentage)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(outputs.totalReturn)} profit
          </p>
        </CardContent>
      </Card>

      {/* Global Wealth Percentage */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Global Wealth %</CardTitle>
          <Percent className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatPercentage(outputs.percentageOfGlobalWealth)}
          </div>
          <p className="text-xs text-muted-foreground">
            Of total global wealth
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 