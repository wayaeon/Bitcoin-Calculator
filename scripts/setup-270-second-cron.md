# Updated Cron Setup: 5-Minute Intervals + Direct Historical Calls

## Overview
This setup ensures CoinGecko API calls every 5 minutes for realtime data, plus direct calls twice daily for historical data.

## Architecture

### 🔄 Realtime Data (CoinGecko API)
- **Endpoint**: `/api/cron/update-btc` (POST)
- **Frequency**: Every 5 minutes
- **Action**: Calls CoinGecko API → Stores in `realtime_btc_prices`
- **Monthly Calls**: 8640 (288/day × 30 days)

### 📊 Historical Data (Direct CoinGecko Calls)
- **Endpoint**: `/api/cron/update-btc-data` (POST)
- **Frequency**: Twice daily (7:00 AM and 7:00 PM)
- **Action**: Calls CoinGecko API directly → Stores in `historical_btc_prices`
- **Monthly Calls**: 60 (2/day × 30 days)

### 📖 Database Readers (No API Calls)
- **Frontend Hook**: `use-btc-price.ts` - Reads every 2 minutes
- **API Endpoint**: `/api/realtime-btc-price` - Reads on demand
- **Chart Data**: `/api/btc-chart-data` - Reads historical data

## Usage Breakdown

### ✅ CoinGecko API Usage
- **Realtime Endpoint**: `/api/cron/update-btc` - 864 calls/month
- **Historical Endpoint**: `/api/cron/update-btc-data` - 60 calls/month
- **Total Monthly Calls**: 924
- **Limit**: 10,000 calls/month
- **Usage**: 9.2% of limit ✅

### 📊 Database Reads (Unlimited)
- **Frontend updates**: Every 2 minutes (720/day)
- **API calls**: On-demand
- **Chart data**: On-demand
- **No API limits**: Pure database reads

## Setup Instructions

### 1. Manual Testing
```bash
# Test the realtime endpoint
curl -X POST http://localhost:3001/api/cron/update-btc

# Test the historical endpoint
curl -X POST http://localhost:3001/api/cron/update-btc-data

# Test reading from database
curl -X GET http://localhost:3001/api/realtime-btc-price
```

### 2. Cron Setup (Production)
```bash
# Add to crontab
*/5 * * * * curl -X POST https://your-domain.com/api/cron/update-btc
0 7,19 * * * curl -X POST https://your-domain.com/api/cron/update-btc-data
```

### 3. Vercel Cron (Recommended)
Current `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-btc",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/update-btc-data",
      "schedule": "0 7,19 * * *"
    }
  ]
}
```

## Benefits
- ✅ **5-minute intervals** - More frequent updates than 15 minutes
- ✅ **Direct historical calls** - Historical data gets fresh CoinGecko data twice daily
- ✅ **Well under limits** - 9.2% of monthly limit
- ✅ **Fast UI updates** - Database reads are instant
- ✅ **Reliable fallbacks** - Database persists data
- ✅ **Scalable** - Can add more readers without API cost

## Monitoring
- Check `/api/cron/update-btc` (GET) for realtime status
- Check `/api/cron/update-btc-data` (GET) for historical status
- Monitor database tables `realtime_btc_prices` and `historical_btc_prices`
- Logs show "🔄 SINGLE COINGECKO API CALL" for realtime API calls
- Logs show "🔄 DIRECT COINGECKO API CALL" for historical API calls
- Logs show "📖 Reading BTC price from database" for reads 