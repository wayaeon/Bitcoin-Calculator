// Currency API Service for real-time exchange rates
export interface CurrencyRate {
  code: string
  value: number
  last_updated: string
}

export interface CurrencyResponse {
  data: {
    [currency: string]: CurrencyRate
  }
}

export async function getCurrencyRates(baseCurrency: string = 'USD'): Promise<CurrencyResponse> {
  try {
    const response = await fetch(`/api/currency?base=${baseCurrency}`)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching currency rates:', error)
    throw error
  }
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  try {
    const response = await fetch('/api/currency', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        fromCurrency,
        toCurrency
      })
    })
    
    if (!response.ok) {
      throw new Error(`Currency conversion error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.convertedAmount
  } catch (error) {
    console.error('Error converting currency:', error)
    return amount // Fallback to original amount
  }
}

export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const rates = await getCurrencyRates('USD')
    return Object.keys(rates.data)
  } catch (error) {
    console.error('Error fetching supported currencies:', error)
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL', 'KRW', 'RUB', 'MXN', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN']
  }
} 