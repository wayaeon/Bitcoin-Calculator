import { NextRequest, NextResponse } from 'next/server'
import RealtimeBTCUpdater from '@/scripts/update-realtime-btc-csv'

export async function GET(request: NextRequest) {
  try {
    const updater = new RealtimeBTCUpdater()
    await updater.updateCSVFile()
    
    return NextResponse.json({ 
      success: true, 
      message: 'BTC data updated successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}