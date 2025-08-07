# BTC Realtime Data Setup

This system replaces the Supabase realtime_btc_prices table with a local CSV file that updates every 5 minutes.

## Files Created

1. **`public/BTC_Realtime_Data.csv`** - The realtime data file with headers
2. **`scripts/update-realtime-btc-csv.js`** - Script that updates the CSV every 5 minutes
3. **`scripts/start-realtime-updater.js`** - Simple launcher script
4. **`lib/btc-realtime-csv-service.ts`** - Service to read from the CSV file
5. **Updated `app/api/btc-chart-data/route.ts`** - Now uses both historical and realtime CSV files

## How to Start

### Option 1: Using npm script
```bash
npm run start-realtime-updater
```

### Option 2: Direct script execution
```bash
node scripts/start-realtime-updater.js
```

### Option 3: Manual update
```bash
npm run update-realtime-btc
```

## Data Structure

The `BTC_Realtime_Data.csv` file contains:
- `id` - Timestamp-based unique identifier
- `price` - Current BTC price in USD
- `volume_24h` - 24-hour trading volume
- `market_cap` - Current market capitalization
- `price_change_24h` - 24-hour price change
- `price_change_percentage_24h` - 24-hour percentage change
- `created_at` - Timestamp when data was recorded
- `updated_at` - Timestamp when data was last updated

## Chart Data Logic

- **Short ranges (1D, 7D, 30D)**: Uses `BTC_Realtime_Data.csv`
- **Long ranges (90D, 1Y, 5Y, 10Y, ALL)**: Uses `BTC Price History.csv`

## Features

- ✅ Updates every 5 minutes automatically
- ✅ Keeps last 1000 entries to prevent file bloat
- ✅ Handles API errors gracefully
- ✅ Logs all updates with timestamps
- ✅ Compatible with existing chart components

## API Endpoints

The chart data API (`/api/btc-chart-data`) now:
- Uses realtime CSV for short time ranges
- Uses historical CSV for long time ranges
- Returns the same data format as before
- Maintains backward compatibility

## Monitoring

The updater logs:
- ✅ Successful updates with current price
- ❌ API errors and failures
- 📊 Number of data points found
- ⏰ Timestamps for all operations

## Stopping the Updater

Press `Ctrl+C` in the terminal where the updater is running. 