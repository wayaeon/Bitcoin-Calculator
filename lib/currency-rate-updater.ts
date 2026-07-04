import path from 'path'
import { readStoredCSV, writeStoredCSV } from './csv-storage'

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

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
const CURRENCY_PATHNAME = 'currency-conversion.md'
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

// Fetch live currency rates via CoinGecko's exchange_rates endpoint (BTC-denominated
// cross rates) instead of a dedicated currency API — avoids needing a separate paid
// key, reuses the CoinGecko key already used elsewhere in this app.
export async function fetchLiveCurrencyRates(): Promise<CurrencyRate[]> {
  const response = await fetch('https://api.coingecko.com/api/v3/exchange_rates', {
    headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
  })

  if (!response.ok) {
    throw new Error(`CoinGecko exchange_rates error: ${response.status}`)
  }

  const { rates: btcRates } = await response.json()
  const usdPerBtc = btcRates?.usd?.value
  if (!usdPerBtc) {
    throw new Error('CoinGecko response missing USD rate')
  }

  const now = new Date().toISOString()
  const rates: CurrencyRate[] = []

  for (const currency of SUPPORTED_CURRENCIES) {
    if (currency.code === 'USD') {
      rates.push({ ...currency, rate: 1, lastUpdated: now })
      continue
    }
    const perBtc = btcRates?.[currency.code.toLowerCase()]?.value
    if (perBtc == null) continue
    // perBtc / usdPerBtc = how many units of this currency equal 1 USD
    rates.push({ ...currency, rate: perBtc / usdPerBtc, lastUpdated: now })
  }

  return rates
}

// Read current currency rates from storage (Blob in production, local file in dev — see lib/csv-storage.ts)
export async function readCurrencyRatesFromFile(): Promise<CurrencyRatesData | null> {
  try {
    const content = await readStoredCSV(CURRENCY_PATHNAME, CURRENCY_FILE_PATH)
    if (!content.trim()) return null
    const lines = content.split('\n')

    const rates: CurrencyRate[] = []
    let lastUpdated = ''
    let baseCurrency = 'USD'

    // Data rows look like "| USD | US Dollar | $ | 1.000000 | ... |" — match a
    // 3-letter currency code right after the leading pipe to skip the header/separator rows.
    const rowPattern = /^\|\s*([A-Z]{3})\s*\|/

    for (const line of lines) {
      if (line.includes('Last Updated:')) {
        lastUpdated = line.split('Last Updated:')[1].replace(/\*/g, '').trim()
      } else if (line.includes('Base Currency:')) {
        baseCurrency = line.split('Base Currency:')[1].replace(/\*/g, '').trim()
      } else if (rowPattern.test(line)) {
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
*Rates are updated once daily*
*Data derived from CoinGecko's BTC exchange rates*
`

  await writeStoredCSV(CURRENCY_PATHNAME, content, CURRENCY_FILE_PATH)
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