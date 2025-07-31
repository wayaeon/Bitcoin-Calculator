// Currency API Service
const CURRENCY_API_KEY = 'cur_live_aPyWfOZ3e7fDxQsulMxIzudowobtXiJMzuYuwiAZ'

export interface CurrencyRate {
  code: string
  value: number
  last_updated: string
}

export interface CurrencyConversion {
  from: string
  to: string
  rate: number
  amount: number
  converted_amount: number
}

// Get current exchange rates
export async function getExchangeRates(baseCurrency: string = 'USD'): Promise<CurrencyRate[]> {
  try {
    const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=${baseCurrency}`)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    const data = await response.json()
    return Object.entries(data.data).map(([code, rate]: [string, any]) => ({
      code,
      value: rate.value,
      last_updated: rate.last_updated
    }))
  } catch (error) {
    console.error('Error fetching exchange rates:', error)
    throw error
  }
}

// Convert amount between currencies
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<CurrencyConversion> {
  try {
    const response = await fetch(
      `https://api.currencyapi.com/v3/convert?apikey=${CURRENCY_API_KEY}&from=${fromCurrency}&to=${toCurrency}&amount=${amount}`
    )
    
    if (!response.ok) {
      throw new Error(`Currency conversion error: ${response.status}`)
    }
    
    const data = await response.json()
    return {
      from: fromCurrency,
      to: toCurrency,
      rate: data.data[toCurrency].value,
      amount,
      converted_amount: data.data[toCurrency].value * amount
    }
  } catch (error) {
    console.error('Error converting currency:', error)
    throw error
  }
}

// Get supported currencies
export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const response = await fetch(`https://api.currencyapi.com/v3/currencies?apikey=${CURRENCY_API_KEY}`)
    
    if (!response.ok) {
      throw new Error(`Currency list error: ${response.status}`)
    }
    
    const data = await response.json()
    return Object.keys(data.data)
  } catch (error) {
    console.error('Error fetching supported currencies:', error)
    // Fallback to common currencies
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'KRW', 'RUB', 'MXN', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN']
  }
}

// Cache exchange rates for performance
const rateCache = new Map<string, { rates: CurrencyRate[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getCachedExchangeRates(baseCurrency: string = 'USD'): Promise<CurrencyRate[]> {
  const cacheKey = `rates_${baseCurrency}`
  const cached = rateCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rates
  }
  
  const rates = await getExchangeRates(baseCurrency)
  rateCache.set(cacheKey, { rates, timestamp: Date.now() })
  return rates
} 