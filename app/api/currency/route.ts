import { NextRequest, NextResponse } from 'next/server'
import { 
  readCurrencyRatesFromFile, 
  convertAmount,
  getCurrencyRate 
} from '@/lib/currency-rate-updater'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseCurrency = searchParams.get('base') || 'USD'
    
    // Read rates from stored file
    const ratesData = await readCurrencyRatesFromFile()
    
    if (!ratesData) {
      return NextResponse.json({ error: 'No currency rates available' }, { status: 500 })
    }
    
    // Format response to match the original API structure
    const data: any = {
      data: {}
    }
    
    for (const rate of ratesData.rates) {
      data.data[rate.code] = {
        code: rate.code,
        value: rate.rate,
        last_updated: rate.lastUpdated
      }
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching currency rates:', error)
    return NextResponse.json({ error: 'Failed to fetch currency rates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { amount, fromCurrency, toCurrency } = await request.json()
    
    if (fromCurrency === toCurrency) {
      return NextResponse.json({ convertedAmount: amount })
    }
    
    // Use stored rates for conversion
    const convertedAmount = await convertAmount(amount, fromCurrency, toCurrency)
    
    return NextResponse.json({ convertedAmount })
  } catch (error) {
    console.error('Error converting currency:', error)
    return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 })
  }
} 