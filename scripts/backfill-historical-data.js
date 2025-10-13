/**
 * Backfill Historical BTC Data
 * Fetches missing daily OHLCV data from CoinGecko and appends to historical CSV
 */

const fs = require('fs').promises;
const path = require('path');

const API_KEY = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz';
const CSV_PATH = path.join(process.cwd(), 'public', 'BTC Price History copy.csv');

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch OHLC data from CoinGecko for a date range
 */
async function fetchOHLCData(fromTimestamp, toTimestamp) {
  const url = `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  
  console.log(`Fetching data from ${new Date(fromTimestamp * 1000).toISOString()} to ${new Date(toTimestamp * 1000).toISOString()}`);
  
  const response = await fetch(url, {
    headers: {
      'x-cg-demo-api-key': API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Convert CoinGecko market chart data to daily OHLCV
 */
function convertToDaily(marketChartData) {
  const { prices, market_caps, total_volumes } = marketChartData;
  
  // Group data by day
  const dailyData = {};
  
  prices.forEach(([timestamp, price]) => {
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = {
        prices: [],
        volumes: [],
        marketCaps: []
      };
    }
    dailyData[date].prices.push(price);
  });

  total_volumes.forEach(([timestamp, volume]) => {
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (dailyData[date]) {
      dailyData[date].volumes.push(volume);
    }
  });

  market_caps.forEach(([timestamp, marketCap]) => {
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (dailyData[date]) {
      dailyData[date].marketCaps.push(marketCap);
    }
  });

  // Calculate OHLCV for each day
  const ohlcvData = [];
  const sortedDates = Object.keys(dailyData).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const data = dailyData[date];
    
    if (data.prices.length === 0) continue;

    const open = data.prices[0];
    const close = data.prices[data.prices.length - 1];
    const high = Math.max(...data.prices);
    const low = Math.min(...data.prices);
    const volume = data.volumes.length > 0 ? data.volumes[data.volumes.length - 1] : 0;
    const marketCap = data.marketCaps.length > 0 ? data.marketCaps[data.marketCaps.length - 1] : 0;

    // Calculate start date (previous day)
    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const startDate = previousDate.toISOString().split('T')[0];

    ohlcvData.push({
      start: startDate,
      end: date,
      open,
      high,
      low,
      close,
      volume,
      marketCap
    });
  }

  return ohlcvData;
}

/**
 * Read the last date from CSV
 */
async function getLastDateFromCSV() {
  try {
    const content = await fs.readFile(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length <= 1) {
      return null;
    }

    const lastLine = lines[lines.length - 1];
    const values = lastLine.split(',');
    
    // End date is in column index 1
    return values[1];
  } catch (error) {
    console.error('Error reading CSV:', error);
    return null;
  }
}

/**
 * Append new rows to CSV
 */
async function appendToCSV(newRows) {
  try {
    const content = await fs.readFile(CSV_PATH, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Remove trailing newline if exists
    let csvContent = lines.join('\n');
    
    // Add new rows
    for (const row of newRows) {
      const rowString = `\n${row.start},${row.end},${row.open},${row.high},${row.low},${row.close},${row.volume},${row.marketCap},`;
      csvContent += rowString;
    }
    
    await fs.writeFile(CSV_PATH, csvContent, 'utf-8');
    console.log(`✅ Successfully appended ${newRows.length} rows to CSV`);
  } catch (error) {
    console.error('Error appending to CSV:', error);
    throw error;
  }
}

/**
 * Main backfill function
 */
async function backfillData() {
  console.log('🚀 Starting historical data backfill...\n');

  try {
    // Get the last date in CSV
    const lastDate = await getLastDateFromCSV();
    if (!lastDate) {
      console.error('❌ Could not determine last date in CSV');
      return;
    }

    console.log(`📅 Last date in CSV: ${lastDate}`);

    // Calculate date range
    const startDate = new Date(lastDate);
    startDate.setDate(startDate.getDate() + 1); // Start from next day
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Up to yesterday

    if (startDate >= endDate) {
      console.log('✅ CSV is already up to date!');
      return;
    }

    const fromTimestamp = Math.floor(startDate.getTime() / 1000);
    const toTimestamp = Math.floor(endDate.getTime() / 1000);

    console.log(`📊 Fetching data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Fetch data from CoinGecko
    const marketChartData = await fetchOHLCData(fromTimestamp, toTimestamp);
    
    if (!marketChartData.prices || marketChartData.prices.length === 0) {
      console.log('⚠️  No data received from CoinGecko');
      return;
    }

    console.log(`📈 Received ${marketChartData.prices.length} price points`);

    // Convert to daily OHLCV
    const dailyData = convertToDaily(marketChartData);
    console.log(`📊 Converted to ${dailyData.length} daily records`);

    if (dailyData.length === 0) {
      console.log('⚠️  No daily data to append');
      return;
    }

    // Append to CSV
    await appendToCSV(dailyData);

    console.log('\n✅ Backfill completed successfully!');
    console.log(`📅 New date range: ${lastDate} → ${dailyData[dailyData.length - 1].end}`);

  } catch (error) {
    console.error('\n❌ Backfill failed:', error.message);
    throw error;
  }
}

// Run the backfill
backfillData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

