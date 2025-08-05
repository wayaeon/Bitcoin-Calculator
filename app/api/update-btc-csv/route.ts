import { NextRequest, NextResponse } from 'next/server'
import { coingeckoAPI } from '@/lib/coingecko-api'

export async function GET(request: NextRequest) {
  try {
    const shouldUpdate = await coingeckoAPI.shouldUpdateData(24) // 24 hours
    
    return NextResponse.json({
      shouldUpdate,
      lastUpdate: await coingeckoAPI.getLastUpdateTime()
    })
  } catch (error) {
    console.error('Error checking update status:', error)
    return NextResponse.json(
      { error: 'Failed to check update status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { days = 1 } = await request.json()
    
    console.log('Updating BTC CSV file with latest data...')
    await coingeckoAPI.updateCSVFile(days)
    
    return NextResponse.json({
      success: true,
      message: 'CSV file updated successfully',
      lastUpdate: await coingeckoAPI.getLastUpdateTime()
    })
  } catch (error) {
    console.error('Error updating CSV file:', error)
    return NextResponse.json(
      { error: 'Failed to update CSV file' },
      { status: 500 }
    )
  }
} 