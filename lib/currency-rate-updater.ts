import { promises as fs } from 'fs'
import path from 'path'

export interface CurrencyRate {
  code: string
  name: string
  symbol: string
  rate: number
  lastUpdated: string
}

export interface CurrencyRatesData {
  lastUpdated: string
  baseCurrency: string
  rates: CurrencyRate[]
}

const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY
const CURRENCY_FILE_PATH = path.join(process.cwd(), 'public', 'currency-conversion.md')

// Supported currencies with their symbols and names
const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' }
]

// Check if we should perform the update (7am and 7pm PST)
export function shouldUpdateCurrencyRates(): boolean {
  const now = new Date()
  const pstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  const hour = pstTime.getHours()
  
  // Update at 7am and 7pm PST
  return hour === 7 || hour === 19
}

// Fetch live currency rates from API
export async function fetchLiveCurrencyRates(): Promise<CurrencyRate[]> {
  if (!CURRENCY_API_KEY) {
    throw new Error('CURRENCY_API_KEY not configured')
  }

  try {
    const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=USD`)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    const data = await response.json()
    const rates: CurrencyRate[] = []
    
    // Add USD as base currency
    rates.push({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      rate: 1,
      lastUpdated: new Date().toISOString()
    })
    
    // Add other currencies
    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency.code !== 'USD' && data.data[currency.code]) {
        rates.push({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          rate: data.data[currency.code].value,
          lastUpdated: new Date().toISOString()
        })
      }
    }
    
    return rates
  } catch (error) {
    console.error('Error fetching live currency rates:', error)
    throw error
  }
}

// Read current currency rates from file
export async function readCurrencyRatesFromFile(): Promise<CurrencyRatesData | null> {
  try {
    const content = await fs.readFile(CURRENCY_FILE_PATH, 'utf-8')
    const lines = content.split('\n')
    
    const rates: CurrencyRate[] = []
    let lastUpdated = ''
    let baseCurrency = 'USD'
    
    for (const line of lines) {
      if (line.startsWith('Last Updated:')) {
        lastUpdated = line.replace('Last Updated:', '').trim()
      } else if (line.startsWith('Base Currency:')) {
        baseCurrency = line.replace('Base Currency:', '').trim()
      } else if (line.includes('|') && !line.startsWith('|') && !line.includes('---')) {
        const parts = line.split('|').map(p => p.trim()).filter(p => p)
        if (parts.length >= 4) {
          rates.push({
            code: parts[0],
            name: parts[1],
            symbol: parts[2],
            rate: parseFloat(parts[3]),
            lastUpdated: parts[4] || lastUpdated
          })
        }
      }
    }
    
    return {
      lastUpdated,
      baseCurrency,
      rates
    }
  } catch (error) {
    console.error('Error reading currency rates from file:', error)
    return null
  }
}

// Write currency rates to file
export async function writeCurrencyRatesToFile(rates: CurrencyRate[]): Promise<void> {
  const now = new Date()
  const pstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
  
  const content = `# Currency Conversion Rates

All currencies relative to USD

**Last Updated:** ${pstTime.toLocaleString('en-US', { 
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
})} PST

**Base Currency:** USD

| Code | Name | Symbol | Rate (USD) | Last Updated |
|------|------|--------|------------|--------------|
${rates.map(rate => 
  `| ${rate.code} | ${rate.name} | ${rate.symbol} | ${rate.rate.toFixed(6)} | ${new Date(rate.lastUpdated).toLocaleString('en-US', { 
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })} PST |`
).join('\n')}

---
*Rates are updated twice daily at 7:00 AM and 7:00 PM PST*
*Data provided by CurrencyAPI.com*
`

  await fs.writeFile(CURRENCY_FILE_PATH, content, 'utf-8')
}

// Update currency rates
export async function updateCurrencyRates(): Promise<CurrencyRatesData> {
  try {
    console.log('Fetching live currency rates...')
    const liveRates = await fetchLiveCurrencyRates()
    
    console.log('Writing currency rates to file...')
    await writeCurrencyRatesToFile(liveRates)
    
    const result: CurrencyRatesData = {
      lastUpdated: new Date().toISOString(),
      baseCurrency: 'USD',
      rates: liveRates
    }
    
    console.log('Currency rates updated successfully')
    return result
  } catch (error) {
    console.error('Error updating currency rates:', error)
    throw error
  }
}

// Get currency rate by code
export async function getCurrencyRate(code: string): Promise<number> {
  const ratesData = await readCurrencyRatesFromFile()
  if (!ratesData) {
    throw new Error('No currency rates available')
  }
  
  const rate = ratesData.rates.find(r => r.code === code)
  if (!rate) {
    throw new Error(`Currency rate not found for ${code}`)
  }
  
  return rate.rate
}

// Convert amount between currencies
export async function convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  const ratesData = await readCurrencyRatesFromFile()
  if (!ratesData) {
    throw new Error('No currency rates available')
  }
  
  const fromRate = ratesData.rates.find(r => r.code === fromCurrency)
  const toRate = ratesData.rates.find(r => r.code === toCurrency)
  
  if (!fromRate || !toRate) {
    throw new Error(`Currency rate not found for ${fromCurrency} or ${toCurrency}`)
  }
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate.rate
  return usdAmount * toRate.rate
} 