/**
 * Volatility Analysis Engine
 * Detects and analyzes Bitcoin market drops, rallies, and recovery patterns
 */

import { BTCHistoricalData, loadBTCHistoricalData } from './btc-historical-data'

export interface DropEvent {
  id: string
  startDate: string
  endDate: string
  startPrice: number
  bottomPrice: number
  dropPercentage: number
  duration: number // in days
  recovered: boolean
  recoveryDate?: string
  recoveryDays?: number
}

export interface RallyEvent {
  id: string
  startDate: string
  endDate: string
  startPrice: number
  peakPrice: number
  rallyPercentage: number
  duration: number // in days
}

export interface VolatilityAnalysis {
  drops: DropEvent[]
  rallies: RallyEvent[]
  averageDropPercentage: number
  averageRallyPercentage: number
  averageRecoveryTime: number
  totalDropEvents: number
  totalRallyEvents: number
  recoveryRate: number // percentage of drops that recovered
}

export interface AnalysisOptions {
  startDate?: string
  endDate?: string
  dropThreshold: number // percentage
  rallyThreshold: number // percentage
  timeframe: number // days (1, 7, 14, 30, etc.)
}

/**
 * Detect drop events in historical data
 */
export async function detectDropEvents(options: AnalysisOptions): Promise<DropEvent[]> {
  const data = await loadBTCHistoricalData()
  const drops: DropEvent[] = []
  
  // Filter by date range if specified
  let filteredData = data
  if (options.startDate) {
    filteredData = filteredData.filter(d => d.timestamp >= options.startDate!)
  }
  if (options.endDate) {
    filteredData = filteredData.filter(d => d.timestamp <= options.endDate!)
  }

  // Analyze data in windows based on timeframe
  for (let i = 0; i < filteredData.length - options.timeframe; i++) {
    const window = filteredData.slice(i, i + options.timeframe)
    
    if (window.length < 2) continue

    const startPrice = window[0].close
    const prices = window.map(d => d.close)
    const minPrice = Math.min(...prices)
    const minIndex = prices.indexOf(minPrice)
    
    const dropPercentage = ((startPrice - minPrice) / startPrice) * 100

    if (dropPercentage >= options.dropThreshold) {
      const startDate = window[0].timestamp
      const endDate = window[minIndex].timestamp
      
      // Check if this drop was already detected
      const isDuplicate = drops.some(d => 
        Math.abs(new Date(d.startDate).getTime() - new Date(startDate).getTime()) < 7 * 24 * 60 * 60 * 1000
      )
      
      if (!isDuplicate) {
        // Check for recovery
        const futureData = filteredData.slice(i + minIndex)
        let recovered = false
        let recoveryDate: string | undefined
        let recoveryDays: number | undefined

        for (let j = 0; j < futureData.length; j++) {
          if (futureData[j].close >= startPrice) {
            recovered = true
            recoveryDate = futureData[j].timestamp
            recoveryDays = Math.floor(
              (new Date(recoveryDate).getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
            )
            break
          }
        }

        drops.push({
          id: `drop-${startDate}-${endDate}`,
          startDate,
          endDate,
          startPrice,
          bottomPrice: minPrice,
          dropPercentage,
          duration: Math.floor(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
          ),
          recovered,
          recoveryDate,
          recoveryDays
        })
      }
    }
  }

  // Sort by date
  return drops.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

/**
 * Detect rally events in historical data
 */
export async function detectRallyEvents(options: AnalysisOptions): Promise<RallyEvent[]> {
  const data = await loadBTCHistoricalData()
  const rallies: RallyEvent[] = []
  
  // Filter by date range if specified
  let filteredData = data
  if (options.startDate) {
    filteredData = filteredData.filter(d => d.timestamp >= options.startDate!)
  }
  if (options.endDate) {
    filteredData = filteredData.filter(d => d.timestamp <= options.endDate!)
  }

  // Analyze data in windows based on timeframe
  for (let i = 0; i < filteredData.length - options.timeframe; i++) {
    const window = filteredData.slice(i, i + options.timeframe)
    
    if (window.length < 2) continue

    const startPrice = window[0].close
    const prices = window.map(d => d.close)
    const maxPrice = Math.max(...prices)
    const maxIndex = prices.indexOf(maxPrice)
    
    const rallyPercentage = ((maxPrice - startPrice) / startPrice) * 100

    if (rallyPercentage >= options.rallyThreshold) {
      const startDate = window[0].timestamp
      const endDate = window[maxIndex].timestamp
      
      // Check if this rally was already detected
      const isDuplicate = rallies.some(r => 
        Math.abs(new Date(r.startDate).getTime() - new Date(startDate).getTime()) < 7 * 24 * 60 * 60 * 1000
      )
      
      if (!isDuplicate) {
        rallies.push({
          id: `rally-${startDate}-${endDate}`,
          startDate,
          endDate,
          startPrice,
          peakPrice: maxPrice,
          rallyPercentage,
          duration: Math.floor(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
          )
        })
      }
    }
  }

  // Sort by date
  return rallies.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
}

/**
 * Perform complete volatility analysis
 */
export async function analyzeVolatility(options: AnalysisOptions): Promise<VolatilityAnalysis> {
  const [drops, rallies] = await Promise.all([
    detectDropEvents(options),
    detectRallyEvents(options)
  ])

  const averageDropPercentage = drops.length > 0
    ? drops.reduce((sum, d) => sum + d.dropPercentage, 0) / drops.length
    : 0

  const averageRallyPercentage = rallies.length > 0
    ? rallies.reduce((sum, r) => sum + r.rallyPercentage, 0) / rallies.length
    : 0

  const recoveredDrops = drops.filter(d => d.recovered)
  const averageRecoveryTime = recoveredDrops.length > 0
    ? recoveredDrops.reduce((sum, d) => sum + (d.recoveryDays || 0), 0) / recoveredDrops.length
    : 0

  const recoveryRate = drops.length > 0
    ? (recoveredDrops.length / drops.length) * 100
    : 0

  return {
    drops,
    rallies,
    averageDropPercentage,
    averageRallyPercentage,
    averageRecoveryTime,
    totalDropEvents: drops.length,
    totalRallyEvents: rallies.length,
    recoveryRate
  }
}

/**
 * Get maximum drawdown
 */
export async function getMaximumDrawdown(
  startDate?: string,
  endDate?: string
): Promise<{
  maxDrawdown: number
  drawdownStart: string
  drawdownEnd: string
  peakPrice: number
  bottomPrice: number
  recoveryDate?: string
  currentDrawdownFromATH: number
}> {
  const data = await loadBTCHistoricalData()
  
  let filteredData = data
  if (startDate) {
    filteredData = filteredData.filter(d => d.timestamp >= startDate)
  }
  if (endDate) {
    filteredData = filteredData.filter(d => d.timestamp <= endDate)
  }

  let maxDrawdown = 0
  let drawdownStart = ''
  let drawdownEnd = ''
  let peakPrice = 0
  let bottomPrice = 0
  let peak = 0
  let peakDate = ''

  for (let i = 0; i < filteredData.length; i++) {
    const currentPrice = filteredData[i].close
    
    if (currentPrice > peak) {
      peak = currentPrice
      peakDate = filteredData[i].timestamp
    }

    const drawdown = ((peak - currentPrice) / peak) * 100

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      drawdownStart = peakDate
      drawdownEnd = filteredData[i].timestamp
      peakPrice = peak
      bottomPrice = currentPrice
    }
  }

  // Check for recovery
  let recoveryDate: string | undefined
  const bottomIndex = filteredData.findIndex(d => d.timestamp === drawdownEnd)
  if (bottomIndex !== -1) {
    for (let i = bottomIndex + 1; i < filteredData.length; i++) {
      if (filteredData[i].close >= peakPrice) {
        recoveryDate = filteredData[i].timestamp
        break
      }
    }
  }

  // Calculate current drawdown from all-time high
  const allTimeHigh = Math.max(...data.map(d => d.close))
  const currentPrice = data[data.length - 1].close
  const currentDrawdownFromATH = ((allTimeHigh - currentPrice) / allTimeHigh) * 100

  return {
    maxDrawdown,
    drawdownStart,
    drawdownEnd,
    peakPrice,
    bottomPrice,
    recoveryDate,
    currentDrawdownFromATH
  }
}

/**
 * Calculate rolling volatility
 */
export async function calculateRollingVolatility(
  days: number = 30
): Promise<Array<{ date: string; volatility: number }>> {
  const data = await loadBTCHistoricalData()
  const results: Array<{ date: string; volatility: number }> = []

  for (let i = days; i < data.length; i++) {
    const window = data.slice(i - days, i)
    
    // Calculate daily returns
    const returns: number[] = []
    for (let j = 1; j < window.length; j++) {
      const dailyReturn = (window[j].close - window[j - 1].close) / window[j - 1].close
      returns.push(dailyReturn)
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const volatility = Math.sqrt(variance) * 100 // Convert to percentage

    results.push({
      date: data[i].timestamp,
      volatility
    })
  }

  return results
}

/**
 * Identify market cycles (bull/bear markets)
 */
export async function identifyMarketCycles(): Promise<Array<{
  type: 'bull' | 'bear'
  startDate: string
  endDate: string
  startPrice: number
  endPrice: number
  percentageChange: number
  duration: number
}>> {
  const data = await loadBTCHistoricalData()
  const cycles: Array<{
    type: 'bull' | 'bear'
    startDate: string
    endDate: string
    startPrice: number
    endPrice: number
    percentageChange: number
    duration: number
  }> = []

  // Use 200-day moving average crossover strategy
  const ma200Period = 200
  let currentCycle: 'bull' | 'bear' | null = null
  let cycleStartDate = ''
  let cycleStartPrice = 0

  for (let i = ma200Period; i < data.length; i++) {
    const window = data.slice(i - ma200Period, i)
    const ma200 = window.reduce((sum, d) => sum + d.close, 0) / ma200Period
    const currentPrice = data[i].close

    const previousCycle = currentCycle

    // Determine current cycle
    if (currentPrice > ma200) {
      currentCycle = 'bull'
    } else {
      currentCycle = 'bear'
    }

    // Detect cycle change
    if (previousCycle !== null && currentCycle !== previousCycle) {
      const percentageChange = ((data[i - 1].close - cycleStartPrice) / cycleStartPrice) * 100
      const duration = Math.floor(
        (new Date(data[i - 1].timestamp).getTime() - new Date(cycleStartDate).getTime()) / (1000 * 60 * 60 * 24)
      )

      cycles.push({
        type: previousCycle,
        startDate: cycleStartDate,
        endDate: data[i - 1].timestamp,
        startPrice: cycleStartPrice,
        endPrice: data[i - 1].close,
        percentageChange,
        duration
      })

      cycleStartDate = data[i].timestamp
      cycleStartPrice = data[i].close
    } else if (previousCycle === null) {
      cycleStartDate = data[i].timestamp
      cycleStartPrice = data[i].close
    }
  }

  // Add final cycle if still ongoing
  if (currentCycle !== null && cycleStartDate) {
    const lastData = data[data.length - 1]
    const percentageChange = ((lastData.close - cycleStartPrice) / cycleStartPrice) * 100
    const duration = Math.floor(
      (new Date(lastData.timestamp).getTime() - new Date(cycleStartDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    cycles.push({
      type: currentCycle,
      startDate: cycleStartDate,
      endDate: lastData.timestamp,
      startPrice: cycleStartPrice,
      endPrice: lastData.close,
      percentageChange,
      duration
    })
  }

  return cycles
}

