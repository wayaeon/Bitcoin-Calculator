import { NextRequest, NextResponse } from 'next/server'

const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const baseCurrency = searchParams.get('base') || 'USD'
    
    const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=${baseCurrency}`)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    const data = await response.json()
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
    
    const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${CURRENCY_API_KEY}&base_currency=${fromCurrency}`)
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`)
    }
    
    const data = await response.json()
    const rate = data.data[toCurrency]?.value
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`)
    }
    
    const convertedAmount = amount * rate
    return NextResponse.json({ convertedAmount })
  } catch (error) {
    console.error('Error converting currency:', error)
    return NextResponse.json({ error: 'Failed to convert currency' }, { status: 500 })
  }
} 