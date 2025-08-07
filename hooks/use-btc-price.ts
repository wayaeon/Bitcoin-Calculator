import { useState, useEffect, useCallback } from 'react'

interface BTCPriceData {
  price: number
  volume_24h: number
  market_cap: number
  price_change_24h: number
  price_change_percentage_24h: number
  last_updated: string
}

interface UseBTCPriceReturn {
  priceData: BTCPriceData | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBTCPrice(): UseBTCPriceReturn {
  const [priceData, setPriceData] = useState<BTCPriceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrice = useCallback(async () => {
    try {
      setError(null)
      
      // ONLY READ FROM DATABASE - No direct CoinGecko calls
      console.log('📖 Reading BTC price from database...')
      const response = await fetch('/api/realtime-btc-price', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success && result.data) {
          const data = result.data
          const newPriceData: BTCPriceData = {
            price: data.price,
            volume_24h: data.volume_24h || 0,
            market_cap: data.market_cap || 0,
            price_change_24h: data.price_change_24h || 0,
            price_change_percentage_24h: data.price_change_percentage_24h || 0,
            last_updated: data.created_at || new Date().toISOString()
          }

          setPriceData(newPriceData)
          setIsLoading(false)
          console.log('✅ Successfully read from database:', newPriceData)
          return
        }
      }

      // If no data in database, show error (don't call CoinGecko)
      console.warn('⚠️ No data available in database')
      setError('No BTC price data available. Database may be empty.')
      setIsLoading(false)
      
    } catch (err) {
      console.error('❌ Error fetching BTC price from database:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch BTC price from database')
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    setIsLoading(true)
    await fetchPrice()
  }, [fetchPrice])

  useEffect(() => {
    // Initial fetch
    fetchPrice()

    // Update every 2 minutes (frequent UI updates, but no API calls)
    const interval = setInterval(fetchPrice, 2 * 60 * 1000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [fetchPrice])

  return {
    priceData,
    isLoading,
    error,
    refetch
  }
} 