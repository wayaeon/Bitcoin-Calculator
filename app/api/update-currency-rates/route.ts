import { NextRequest, NextResponse } from 'next/server'
import { 
  updateCurrencyRates, 
  shouldUpdateCurrencyRates,
  readCurrencyRatesFromFile 
} from '@/lib/currency-rate-updater'

export async function POST(request: NextRequest) {
  try {
    // Check if we should perform the update
    if (!shouldUpdateCurrencyRates()) {
      return NextResponse.json({ 
        message: 'Not time to update yet (updates at 7am and 7pm PST)',
        shouldUpdate: false 
      })
    }

    // Update currency rates
    const result = await updateCurrencyRates()
    
    return NextResponse.json({ 
      message: 'Currency rates updated successfully',
      shouldUpdate: true,
      updatedAt: new Date().toISOString(),
      ratesCount: result.rates.length,
      lastUpdated: result.lastUpdated
    })
    
  } catch (error) {
    console.error('Error updating currency rates:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update currency rates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Check current rates
    const ratesData = await readCurrencyRatesFromFile()
    
    return NextResponse.json({ 
      shouldUpdate: shouldUpdateCurrencyRates(),
      message: 'Currency rates status checked',
      hasRates: !!ratesData,
      lastUpdated: ratesData?.lastUpdated || null,
      ratesCount: ratesData?.rates.length || 0
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check currency rates status' },
      { status: 500 }
    )
  }
} 