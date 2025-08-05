#!/usr/bin/env node

// Daily BTC Price History Update Script
// Run this script via cron at 7am and 7pm CST
// Example cron entries:
// 0 7 * * * /usr/bin/node /path/to/scripts/daily-btc-update.js
// 0 19 * * * /usr/bin/node /path/to/scripts/daily-btc-update.js

const fs = require('fs')
const path = require('path')

// Import the CoinGecko API class
const { CoinGeckoAPI } = require('../lib/coingecko-api.js')

async function updateBTCHistory() {
  try {
    console.log(`[${new Date().toISOString()}] Starting daily BTC update...`)
    
    const coingeckoAPI = new CoinGeckoAPI()
    
    // Update with latest day's data
    await coingeckoAPI.updateCSVFile(1)
    
    console.log(`[${new Date().toISOString()}] Daily BTC update completed successfully`)
    
    // Exit successfully
    process.exit(0)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error during daily BTC update:`, error)
    
    // Exit with error code
    process.exit(1)
  }
}

// Run the update
updateBTCHistory() 