#!/usr/bin/env node

/**
 * Script to update currency rates and store them in currency-conversion.md
 * This script can be run manually or scheduled via cron
 */

import { updateCurrencyRates, shouldUpdateCurrencyRates } from '../lib/currency-rate-updater.js'

async function main() {
  try {
    console.log('Starting currency rate update...')
    
    // Check if it's time to update
    if (!shouldUpdateCurrencyRates()) {
      console.log('Not time to update yet (updates at 7am and 7pm PST)')
      console.log('Current time in PST:', new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
      return
    }
    
    // Perform the update
    const result = await updateCurrencyRates()
    
    console.log('Currency rates updated successfully!')
    console.log(`Updated ${result.rates.length} currencies`)
    console.log(`Last updated: ${result.lastUpdated}`)
    console.log('Rates stored in: public/currency-conversion.md')
    
  } catch (error) {
    console.error('Error updating currency rates:', error)
    process.exit(1)
  }
}

// Run the script
main() 