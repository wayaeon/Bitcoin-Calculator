/**
 * Shared Calculator Utilities
 * Common functions and utilities for Bitcoin calculators
 */

import { BTCHistoricalData, loadBTCHistoricalData } from './btc-historical-data'

// Re-export for convenience
export { loadBTCHistoricalData }

// Cache for calculations
const calculationCache = new Map<string, any>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Calculate actual historical CAGR from data
 */
export async function calculateHistoricalCAGR(
  startDate?: string,
  endDate?: string
): Promise<number> {
  const cacheKey = `cagr-${startDate}-${endDate}`
  
  // Check cache
  const cached = getCachedValue(cacheKey)
  if (cached !== null) return cached

  try {
    const historicalData = await loadBTCHistoricalData()
    
    if (historicalData.length < 2) {
      return 58 // Fallback to default
    }

    // Filter by date range if provided
    let filteredData = historicalData
    if (startDate) {
      filteredData = filteredData.filter(d => d.timestamp >= startDate)
    }
    if (endDate) {
      filteredData = filteredData.filter(d => d.timestamp <= endDate)
    }

    if (filteredData.length < 2) {
      return 58 // Fallback to default
    }

    const startPrice = filteredData[0].close
    const endPrice = filteredData[filteredData.length - 1].close
    
    // Calculate years
    const startTime = new Date(filteredData[0].timestamp).getTime()
    const endTime = new Date(filteredData[filteredData.length - 1].timestamp).getTime()
    const years = (endTime - startTime) / (1000 * 60 * 60 * 24 * 365.25)

    if (years <= 0) {
      return 58 // Fallback to default
    }

    // Calculate CAGR: ((End Value / Start Value) ^ (1 / Years)) - 1
    const cagr = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100

    // Cache the result
    setCachedValue(cacheKey, cagr)

    return cagr
  } catch (error) {
    console.error('Error calculating historical CAGR:', error)
    return 58 // Fallback to default
  }
}

/**
 * Calculate historical volatility
 */
export async function calculateHistoricalVolatility(
  days: number = 365
): Promise<number> {
  const cacheKey = `volatility-${days}`
  
  const cached = getCachedValue(cacheKey)
  if (cached !== null) return cached

  try {
    const historicalData = await loadBTCHistoricalData()
    
    if (historicalData.length < days) {
      return 0.15 // Default 15% volatility
    }

    // Get last N days
    const recentData = historicalData.slice(-days)
    
    // Calculate daily returns
    const returns: number[] = []
    for (let i = 1; i < recentData.length; i++) {
      const dailyReturn = (recentData[i].close - recentData[i - 1].close) / recentData[i - 1].close
      returns.push(dailyReturn)
    }

    // Calculate standard deviation
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const volatility = Math.sqrt(variance)

    // Annualize volatility (daily to annual)
    const annualizedVolatility = volatility * Math.sqrt(365)

    setCachedValue(cacheKey, annualizedVolatility)

    return annualizedVolatility
  } catch (error) {
    console.error('Error calculating volatility:', error)
    return 0.15 // Default 15% volatility
  }
}

/**
 * Get Bitcoin price at a specific date
 */
export async function getPriceAtDate(date: string): Promise<number | null> {
  const cacheKey = `price-${date}`
  
  const cached = getCachedValue(cacheKey)
  if (cached !== null) return cached

  try {
    const historicalData = await loadBTCHistoricalData()
    
    // Find exact match or closest date
    const exactMatch = historicalData.find(d => d.timestamp === date)
    if (exactMatch) {
      setCachedValue(cacheKey, exactMatch.close)
      return exactMatch.close
    }

    // Find closest date
    const targetTime = new Date(date).getTime()
    let closestData = historicalData[0]
    let minDiff = Math.abs(new Date(closestData.timestamp).getTime() - targetTime)

    for (const data of historicalData) {
      const diff = Math.abs(new Date(data.timestamp).getTime() - targetTime)
      if (diff < minDiff) {
        minDiff = diff
        closestData = data
      }
    }

    setCachedValue(cacheKey, closestData.close)
    return closestData.close
  } catch (error) {
    console.error('Error getting price at date:', error)
    return null
  }
}

/**
 * Get current Bitcoin price
 */
export async function getCurrentPrice(): Promise<number> {
  const cacheKey = 'current-price'
  
  const cached = getCachedValue(cacheKey)
  if (cached !== null) return cached

  try {
    const historicalData = await loadBTCHistoricalData()
    
    if (historicalData.length === 0) {
      return 115000 // Fallback price
    }

    const currentPrice = historicalData[historicalData.length - 1].close
    setCachedValue(cacheKey, currentPrice)

    return currentPrice
  } catch (error) {
    console.error('Error getting current price:', error)
    return 115000 // Fallback price
  }
}

/**
 * Calculate DCA (Dollar Cost Averaging) returns
 */
export function calculateDCAReturns(
  investmentAmount: number,
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: string,
  endDate: string,
  historicalData: BTCHistoricalData[]
): {
  totalInvested: number
  totalBTC: number
  averagePricePerBTC: number
  finalValue: number
  totalReturn: number
  returnPercentage: number
} {
  const frequencyMap = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    yearly: 365
  }

  const daysBetweenInvestments = frequencyMap[frequency]
  
  let totalInvested = 0
  let totalBTC = 0
  
  const startTime = new Date(startDate).getTime()
  const endTime = new Date(endDate).getTime()
  
  let currentTime = startTime
  
  while (currentTime <= endTime) {
    const currentDate = new Date(currentTime).toISOString().split('T')[0]
    
    // Find price at this date
    const priceData = historicalData.find(d => d.timestamp >= currentDate)
    
    if (priceData) {
      const btcBought = investmentAmount / priceData.close
      totalBTC += btcBought
      totalInvested += investmentAmount
    }
    
    // Move to next investment date
    currentTime += daysBetweenInvestments * 24 * 60 * 60 * 1000
  }

  const finalPrice = historicalData[historicalData.length - 1]?.close || 0
  const finalValue = totalBTC * finalPrice
  const totalReturn = finalValue - totalInvested
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0
  const averagePricePerBTC = totalInvested > 0 ? totalInvested / totalBTC : 0

  return {
    totalInvested,
    totalBTC,
    averagePricePerBTC,
    finalValue,
    totalReturn,
    returnPercentage
  }
}

/**
 * Calculate lump sum returns
 */
export function calculateLumpSumReturns(
  investmentAmount: number,
  investmentDate: string,
  currentDate: string,
  historicalData: BTCHistoricalData[]
): {
  investmentPrice: number
  currentPrice: number
  btcAmount: number
  currentValue: number
  totalReturn: number
  returnPercentage: number
  daysHeld: number
} {
  // Find investment price
  const investmentData = historicalData.find(d => d.timestamp >= investmentDate)
  const investmentPrice = investmentData?.close || historicalData[0]?.close || 0

  // Find current price
  const currentData = historicalData.find(d => d.timestamp >= currentDate) || 
                      historicalData[historicalData.length - 1]
  const currentPrice = currentData?.close || 0

  // Calculate returns
  const btcAmount = investmentPrice > 0 ? investmentAmount / investmentPrice : 0
  const currentValue = btcAmount * currentPrice
  const totalReturn = currentValue - investmentAmount
  const returnPercentage = investmentAmount > 0 ? (totalReturn / investmentAmount) * 100 : 0

  // Calculate days held
  const investTime = new Date(investmentDate).getTime()
  const currTime = new Date(currentDate).getTime()
  const daysHeld = Math.floor((currTime - investTime) / (1000 * 60 * 60 * 24))

  return {
    investmentPrice,
    currentPrice,
    btcAmount,
    currentValue,
    totalReturn,
    returnPercentage,
    daysHeld
  }
}

/**
 * Format currency with symbol
 */
export function formatCurrencyWithSymbol(
  amount: number,
  currency: string = 'USD',
  currencySymbol: string = '$'
): string {
  if (isNaN(amount) || !isFinite(amount)) return `${currencySymbol}0`
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(Math.abs(amount))

  const sign = amount < 0 ? '-' : ''
  return `${sign}${currencySymbol}${formatted}`
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}

/**
 * Format BTC amount
 */
export function formatBTCAmount(amount: number, decimals: number = 8): string {
  if (isNaN(amount) || !isFinite(amount)) return '0 BTC'
  return `${amount.toFixed(decimals)} BTC`
}

/**
 * Get date from years ago
 */
export function getDateFromYearsAgo(yearsAgo: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - yearsAgo)
  return date.toISOString().split('T')[0]
}

/**
 * Get today's date
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Cache management
 */
function getCachedValue(key: string): any | null {
  const cached = calculationCache.get(key)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    calculationCache.delete(key)
    return null
  }

  return cached.value
}

function setCachedValue(key: string, value: any): void {
  calculationCache.set(key, {
    value,
    timestamp: Date.now()
  })
}

/**
 * Clear calculation cache
 */
export function clearCalculationCache(): void {
  calculationCache.clear()
  console.log('Calculation cache cleared')
}

/**
 * Get cache size
 */
export function getCacheSize(): number {
  return calculationCache.size
}

/**
 * Calculate confidence interval
 */
export function calculateConfidenceInterval(
  value: number,
  volatility: number,
  confidenceLevel: number = 0.95
): {
  lower: number
  upper: number
  range: number
} {
  // Z-score for confidence levels
  const zScores: Record<number, number> = {
    0.90: 1.645,
    0.95: 1.96,
    0.99: 2.576
  }

  const zScore = zScores[confidenceLevel] || 1.96
  const margin = value * volatility * zScore

  return {
    lower: value - margin,
    upper: value + margin,
    range: margin * 2
  }
}

/**
 * Calculate annualized return
 */
export function calculateAnnualizedReturn(
  startValue: number,
  endValue: number,
  days: number
): number {
  if (startValue <= 0 || days <= 0) return 0
  
  const years = days / 365.25
  const totalReturn = (endValue / startValue) - 1
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1
  
  return annualizedReturn * 100
}

/**
 * Get investment scenarios (conservative, moderate, aggressive)
 */
export interface InvestmentScenario {
  name: string
  description: string
  cagrMultiplier: number
  volatilityMultiplier: number
}

export function getInvestmentScenarios(): InvestmentScenario[] {
  return [
    {
      name: 'Conservative',
      description: 'Lower growth rate with reduced volatility',
      cagrMultiplier: 0.5,
      volatilityMultiplier: 0.7
    },
    {
      name: 'Moderate',
      description: 'Historical average growth rate',
      cagrMultiplier: 1.0,
      volatilityMultiplier: 1.0
    },
    {
      name: 'Aggressive',
      description: 'Higher growth rate with increased volatility',
      cagrMultiplier: 1.5,
      volatilityMultiplier: 1.3
    }
  ]
}

