"use client"

import { useBTCPrice } from '@/hooks/use-btc-price'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function PriceUpdateMonitor() {
  const { priceData, isLoading, error } = useBTCPrice()

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-sm">Real-time Price Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Status:</span>
            <Badge variant={isLoading ? "secondary" : error ? "destructive" : "default"}>
              {isLoading ? "Loading..." : error ? "Error" : "Live"}
            </Badge>
          </div>
          
          {priceData && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Price:</span>
                <span className="text-sm font-mono text-green-400">
                  ${priceData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">24h Change:</span>
                <span className={`text-sm font-mono ${priceData.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceData.price_change_percentage_24h >= 0 ? '+' : ''}{priceData.price_change_percentage_24h.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Market Cap:</span>
                <span className="text-sm font-mono text-blue-400">
                  ${(priceData.market_cap / 1e12).toFixed(1)}T
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Last Update:</span>
                <span className="text-xs text-gray-500">
                  {new Date(priceData.last_updated).toLocaleTimeString()}
                </span>
              </div>
            </>
          )}
          
          {error && (
            <div className="text-sm text-red-400">
              Error: {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 