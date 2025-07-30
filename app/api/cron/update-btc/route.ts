import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { 
  fetchLiveBTCData, 
  updateCSVWithLiveData, 
  csvDataToString,
  setLastUpdateTime 
} from '@/lib/btc-data-updater'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (you can add your own auth logic here)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch live BTC data
    const liveData = await fetchLiveBTCData()
    
    // Read the current CSV file
    const csvPath = path.join(process.cwd(), 'public', 'BTC Historical Prices.csv')
    const csvContent = await fs.readFile(csvPath, 'utf-8')
    
    // Parse CSV data
    const lines = csvContent.split('\n')
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    const csvData = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      return row
    })
    
    // Update the latest row with live data
    const updatedCSVData = updateCSVWithLiveData(csvData, liveData)
    
    // Convert back to CSV string
    const updatedCSVString = csvDataToString(updatedCSVData)
    
    // Write the updated data back to the file
    await fs.writeFile(csvPath, updatedCSVString, 'utf-8')
    
    // Set the last update time
    setLastUpdateTime()
    
    console.log(`BTC data updated at ${new Date().toISOString()}:`, liveData)
    
    return NextResponse.json({ 
      message: 'BTC data updated successfully',
      liveData,
      updatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error updating BTC data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update BTC data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'BTC update endpoint is active',
    nextUpdate: '7:00 AM or 7:00 PM daily'
  })
} 