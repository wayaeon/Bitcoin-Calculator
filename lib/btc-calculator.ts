// BTC Calculator Core Logic
export const BTC_CALCULATOR_CONSTANTS = {
  // Global wealth parameters
  INITIAL_GLOBAL_WEALTH: 900_000_000_000_000, // $900T in dollars
  GLOBAL_WEALTH_CAGR: 0.04, // 4% annual growth
  FULL_WEALTH_CAPTURE_YEAR: 30, // BTC reaches full wealth capture by year 30
  
  // Default parameters
  DEFAULT_DCA_AMOUNT: 100, // $100 default DCA
  DEFAULT_ONE_TIME_AMOUNT: 1000, // $1000 default one-time investment
  DEFAULT_START_YEAR: 0, // Current year (0)
  
  // Current BTC price (as of 2024)
  CURRENT_BTC_PRICE: 50000,
  
  // DCA frequencies
  DCA_FREQUENCIES: {
    DAILY: 365,
    WEEKLY: 52,
    MONTHLY: 12,
    YEARLY: 1,
  } as const,
} as const

export type DCAFrequency = 'daily' | 'weekly' | 'monthly'

export interface CalculatorInputs {
  // Investment type
  investmentType: 'one-time' | 'dca'
  
  // Investment amount
  investmentAmount: number
  
  // DCA parameters
  dcaAmount: number
  dcaFrequency: DCAFrequency
  
  // Timing
  startYear: number
  endYear: number
  
  // Growth parameters
  globalWealthCAGR: number
  btcCAGR: number
}

export interface CalculatorOutputs {
  // BTC holdings and value
  futureBTCHoldings: number
  futureValue: number
  totalInvestment: number
  totalReturn: number
  returnPercentage: number
  
  // Global wealth metrics
  globalWealthAtYear30: number
  percentageOfGlobalWealth: number
  
  // Yearly breakdown
  yearlyBreakdown: YearlyBreakdown[]
}

export interface YearlyBreakdown {
  year: number
  globalWealth: number
  btcPrice: number
  btcHoldings: number
  btcValue: number
  investmentThisYear: number
  cumulativeInvestment: number
}

export interface BTCTrajectory {
  year: number
  globalWealth: number
  btcPrice: number
}

// Calculate global wealth at any given year
export function calculateGlobalWealth(year: number, cagr: number = BTC_CALCULATOR_CONSTANTS.GLOBAL_WEALTH_CAGR): number {
  return BTC_CALCULATOR_CONSTANTS.INITIAL_GLOBAL_WEALTH * Math.pow(1 + cagr, year)
}

// Generate BTC price trajectory from current to full wealth capture
export function generateBTCTrajectory(
  fullWealthCaptureYear: number = BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR,
  cagr: number = BTC_CALCULATOR_CONSTANTS.GLOBAL_WEALTH_CAGR,
  btcCAGR: number = 0.15
): BTCTrajectory[] {
  const trajectory: BTCTrajectory[] = []
  
  // Start with current BTC price
  const currentBTCPrice = BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
  const currentYear = 2024 // Current year
  
  for (let year = currentYear; year <= fullWealthCaptureYear; year++) {
    const yearsFromNow = year - currentYear
    const globalWealth = calculateGlobalWealth(yearsFromNow, cagr)
    
    // Calculate BTC price using exponential growth model from current year
    const btcPrice = currentBTCPrice * Math.pow(1 + btcCAGR, yearsFromNow)
    
    trajectory.push({
      year,
      globalWealth,
      btcPrice
    })
  }
  
  return trajectory
}

// Calculate BTC holdings for one-time investment
export function calculateOneTimeBTCHoldings(
  amount: number,
  investmentYear: number,
  trajectory: BTCTrajectory[]
): number {
  const trajectoryEntry = trajectory.find(t => t.year === investmentYear)
  const btcPrice = trajectoryEntry?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
  return amount / btcPrice
}

// Calculate BTC holdings for DCA investment
export function calculateDCABTCHoldings(
  amount: number,
  frequency: DCAFrequency,
  startYear: number,
  endYear: number,
  trajectory: BTCTrajectory[]
): number {
  let totalBTCHoldings = 0
  
  const frequencyMap = {
    daily: 365,
    weekly: 52,
    monthly: 12
  }
  
  const investmentsPerYear = frequencyMap[frequency]
  
  for (let year = startYear; year <= endYear; year++) {
    const trajectoryEntry = trajectory.find(t => t.year === year)
    const btcPrice = trajectoryEntry?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
    const yearlyInvestment = amount * investmentsPerYear
    totalBTCHoldings += yearlyInvestment / btcPrice
  }
  
  return totalBTCHoldings
}

// Generate yearly breakdown for visualization
export function generateYearlyBreakdown(
  inputs: CalculatorInputs,
  trajectory: BTCTrajectory[]
): YearlyBreakdown[] {
  const breakdown: YearlyBreakdown[] = []
  let cumulativeInvestment = 0
  let btcHoldings = 0
  const currentYear = 2024
  
  for (let year = currentYear; year <= inputs.endYear; year++) {
    const trajectoryEntry = trajectory.find(t => t.year === year)
    const globalWealth = trajectoryEntry?.globalWealth || 0
    const btcPrice = trajectoryEntry?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
    
    let investmentThisYear = 0
    
    // Handle start year logic - if startYear is 0, it means "now" (current year)
    const actualStartYear = inputs.startYear === 0 ? currentYear : inputs.startYear
    
    if (inputs.investmentType === 'one-time' && year === actualStartYear) {
      investmentThisYear = inputs.investmentAmount
      btcHoldings += inputs.investmentAmount / btcPrice
    } else if (inputs.investmentType === 'dca' && year >= actualStartYear) {
      const frequencyMap = {
        daily: 365,
        weekly: 52,
        monthly: 12
      }
      investmentThisYear = inputs.dcaAmount * frequencyMap[inputs.dcaFrequency]
      btcHoldings += investmentThisYear / btcPrice
    }
    
    cumulativeInvestment += investmentThisYear
    const btcValue = btcHoldings * btcPrice
    
    breakdown.push({
      year,
      globalWealth,
      btcPrice,
      btcHoldings,
      btcValue,
      investmentThisYear,
      cumulativeInvestment
    })
  }
  
  return breakdown
}

// Main calculation function
export function calculateBTCFutureValue(inputs: CalculatorInputs): CalculatorOutputs {
  // Generate BTC trajectory based on inputs
  const trajectory = generateBTCTrajectory(
    inputs.endYear,
    inputs.globalWealthCAGR,
    inputs.btcCAGR
  )
  
  // Calculate BTC holdings based on investment type
  let futureBTCHoldings = 0
  let totalInvestment = 0
  
  if (inputs.investmentType === 'one-time') {
    futureBTCHoldings = calculateOneTimeBTCHoldings(
      inputs.investmentAmount,
      inputs.startYear,
      trajectory
    )
    totalInvestment = inputs.investmentAmount
  } else {
    futureBTCHoldings = calculateDCABTCHoldings(
      inputs.dcaAmount,
      inputs.dcaFrequency,
      inputs.startYear,
      inputs.endYear,
      trajectory
    )
    
    const frequencyMap = {
      daily: 365,
      weekly: 52,
      monthly: 12
    }
    
    const yearsOfInvestment = inputs.endYear - inputs.startYear + 1
    totalInvestment = inputs.dcaAmount * frequencyMap[inputs.dcaFrequency] * yearsOfInvestment
  }
  
  // Calculate future value
  const finalBTCPrice = trajectory[inputs.endYear]?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
  const futureValue = futureBTCHoldings * finalBTCPrice
  
  // Calculate returns
  const totalReturn = futureValue - totalInvestment
  const returnPercentage = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0
  
  // Calculate global wealth metrics
  const globalWealthAtYear30 = trajectory[inputs.endYear]?.globalWealth || 0
  const percentageOfGlobalWealth = globalWealthAtYear30 > 0 ? (futureValue / globalWealthAtYear30) * 100 : 0
  
  // Generate yearly breakdown
  const yearlyBreakdown = generateYearlyBreakdown(inputs, trajectory)
  
  return {
    futureBTCHoldings,
    futureValue,
    totalInvestment,
    totalReturn,
    returnPercentage,
    globalWealthAtYear30,
    percentageOfGlobalWealth,
    yearlyBreakdown
  }
}

// Formatting utilities
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00'
  }
  
  if (amount >= 1_000_000_000_000) {
    return `$${(amount / 1_000_000_000_000).toFixed(2)}T`
  } else if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`
  } else if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`
  } else if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(2)}K`
  } else {
    return `$${amount.toFixed(2)}`
  }
}

// Format price change amounts with up to 2 non-zero digits
export function formatPriceChange(value: number): string {
  if (isNaN(value) || value === 0) {
    return '0'
  }
  
  const absValue = Math.abs(value)
  
  if (absValue >= 1) {
    // Large values - use locale formatting with 2 decimal places
    return value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    })
  } else {
    // Small values - show up to first 2 non-zero digits
    const valueStr = value.toString()
    const decimalIndex = valueStr.indexOf('.')
    
    if (decimalIndex === -1) {
      return value.toFixed(0)
    }
    
    const decimalPart = valueStr.substring(decimalIndex + 1)
    let significantDigits = 0
    let result = ''
    
    for (let i = 0; i < decimalPart.length && significantDigits < 2; i++) {
      if (decimalPart[i] !== '0') {
        significantDigits++
      }
      result += decimalPart[i]
    }
    
    const integerPart = valueStr.substring(0, decimalIndex)
    return `${integerPart}.${result}`
  }
}

// Format prices for display in tooltips and info boxes
export function formatPrice(value: number, currencySymbol: string = '$'): string {
  if (isNaN(value) || value === 0) {
    return `${currencySymbol}0`
  }
  
  const absValue = Math.abs(value)
  
  if (absValue >= 1) {
    // Large values - use locale formatting with 2 decimal places
    return `${currencySymbol}${value.toLocaleString(undefined, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    })}`
  } else {
    // Small values - show up to first 2 non-zero digits
    const valueStr = value.toString()
    const decimalIndex = valueStr.indexOf('.')
    
    if (decimalIndex === -1) {
      return `${currencySymbol}${value.toFixed(0)}`
    }
    
    const decimalPart = valueStr.substring(decimalIndex + 1)
    let significantDigits = 0
    let result = ''
    
    for (let i = 0; i < decimalPart.length && significantDigits < 2; i++) {
      if (decimalPart[i] !== '0') {
        significantDigits++
      }
      result += decimalPart[i]
    }
    
    const integerPart = valueStr.substring(0, decimalIndex)
    return `${currencySymbol}${integerPart}.${result}`
  }
}

// Format Y-axis values with proper order of magnitude and dollar signs
export function formatYAxisValue(value: number): string {
  if (isNaN(value) || value === 0) {
    return '$0'
  }
  
  const absValue = Math.abs(value)
  
  // Handle different ranges with appropriate precision
  if (absValue >= 1e12) {
    // Trillions
    const trillions = value / 1e12
    return `$${trillions >= 10 ? trillions.toFixed(0) : trillions.toFixed(1)}T`
  } else if (absValue >= 1e9) {
    // Billions
    const billions = value / 1e9
    return `$${billions >= 10 ? billions.toFixed(0) : billions.toFixed(1)}B`
  } else if (absValue >= 1e6) {
    // Millions
    const millions = value / 1e6
    return `$${millions >= 10 ? millions.toFixed(0) : millions.toFixed(1)}M`
  } else if (absValue >= 1e3) {
    // Thousands - handle granular ranges like $105k to $107k
    const thousands = value / 1e3
    if (thousands >= 100 && thousands < 1000) {
      // For ranges like $105k to $107k, show more precision
      return `$${thousands.toFixed(0)}k`
    } else {
      return `$${thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1)}k`
    }
  } else if (absValue >= 1) {
    // Units
    return `$${value >= 10 ? value.toFixed(0) : value.toFixed(1)}`
  } else if (absValue >= 0.01) {
    // Cents
    return `$${value.toFixed(2)}`
  } else {
    // Use scientific notation for very small values (e.g., $5e-6, $1e-4)
    return `$${value.toExponential(0)}`
  }
}

export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%'
  }
  return `${value.toFixed(2)}%`
}

export function formatBTC(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00000000 BTC'
  }
  return `${amount.toFixed(8)} BTC`
}

// Fetch current BTC price from CoinGecko
export async function getCurrentBTCPrice(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
      headers: {
        'x-cg-demo-api-key': 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      return data.bitcoin?.usd || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
    }
  } catch (error) {
    console.error('Failed to fetch current BTC price:', error)
  }
  
  return BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
} 