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
  
  for (let year = 0; year <= fullWealthCaptureYear; year++) {
    const globalWealth = calculateGlobalWealth(year, cagr)
    
    // Calculate BTC price using exponential growth model
    const btcPrice = currentBTCPrice * Math.pow(1 + btcCAGR, year)
    
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
  const btcPrice = trajectory[investmentYear]?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
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
    const btcPrice = trajectory[year]?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
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
  
  for (let year = 0; year <= BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR; year++) {
    const globalWealth = trajectory[year]?.globalWealth || 0
    const btcPrice = trajectory[year]?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
    
    let investmentThisYear = 0
    
    if (inputs.investmentType === 'one-time' && year === inputs.startYear) {
      investmentThisYear = inputs.investmentAmount
      btcHoldings += inputs.investmentAmount / btcPrice
    } else if (inputs.investmentType === 'dca' && year >= inputs.startYear) {
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
  // Generate BTC price trajectory
  const trajectory = generateBTCTrajectory(
    BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR,
    inputs.globalWealthCAGR / 100,
    inputs.btcCAGR / 100
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
      BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR,
      trajectory
    )
    
    const frequencyMap = {
      daily: 365,
      weekly: 52,
      monthly: 12
    }
    
    const yearsOfInvestment = BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR - inputs.startYear + 1
    totalInvestment = inputs.dcaAmount * frequencyMap[inputs.dcaFrequency] * yearsOfInvestment
  }
  
  // Calculate future value
  const finalBTCPrice = trajectory[BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR]?.btcPrice || BTC_CALCULATOR_CONSTANTS.CURRENT_BTC_PRICE
  const futureValue = futureBTCHoldings * finalBTCPrice
  
  // Calculate returns
  const totalReturn = futureValue - totalInvestment
  const returnPercentage = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0
  
  // Calculate global wealth metrics
  const globalWealthAtYear30 = trajectory[BTC_CALCULATOR_CONSTANTS.FULL_WEALTH_CAPTURE_YEAR]?.globalWealth || 0
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
export function formatCurrency(amount: number): string {
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

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

export function formatBTC(amount: number): string {
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