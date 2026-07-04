#!/usr/bin/env node

/**
 * Manual/dev trigger for a currency rate refresh. In production this same
 * logic runs daily via /api/cron/update-currency-rates (see vercel.json).
 * Run with: npx tsx scripts/update-currency-rates.mjs
 */

import { updateCurrencyRates } from '../lib/currency-rate-updater.ts'

async function main() {
  try {
    console.log('Fetching live currency rates from CoinGecko...')
    const result = await updateCurrencyRates()

    console.log('Currency rates updated successfully!')
    console.log(`Updated ${result.rates.length} currencies`)
    console.log(`Last updated: ${result.lastUpdated}`)
  } catch (error) {
    console.error('Error updating currency rates:', error)
    process.exit(1)
  }
}

main()
