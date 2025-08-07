# Single Source CoinGecko API Setup

## Overview
This setup ensures **ONLY ONE** CoinGecko API call every 15 minutes, with everything else reading from the database.

## Architecture

### 🔄 Single Source (CoinGecko API)
- **Endpoint**: `/api/cron/update-btc` (POST)
- **Frequency**: Every 15 minutes
- **Action**: Calls CoinGecko API → Stores in `realtime_btc_prices`
- **Monthly Calls**: 2,880 (96/day × 30 days)

### 📖 Database Readers (No API Calls)
- **Frontend Hook**: `use-btc-price.ts` - Reads every 2 minutes
- **API Endpoint**: `/api/realtime-btc-price` - Reads on demand
- **Chart Data**: `/api/btc-chart-data` - Reads historical data

## Usage Breakdown

### ✅ CoinGecko API Usage
- **Single Endpoint**: `/api/cron/update-btc`
- **Calls per day**: 96 (every 15 minutes)
- **Calls per month**: 2,880
- **Limit**: 10,000 calls/month
- **Usage**: 29% of limit ✅

### 📊 Database Reads (Unlimited)
- **Frontend updates**: Every 2 minutes (720/day)
- **API calls**: On-demand
- **Chart data**: On-demand
- **No API limits**: Pure database reads

## Setup Instructions

### 1. Manual Testing
```bash
# Test the single source endpoint
curl -X POST http://localhost:3001/api/cron/update-btc

# Test reading from database
curl -X GET http://localhost:3001/api/realtime-btc-price
```

### 2. Cron Setup (Production)
```bash
# Add to crontab
*/15 * * * * curl -X POST https://your-domain.com/api/cron/update-btc
```

### 3. Vercel Cron (Recommended)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/update-btc",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## Benefits
- ✅ **Single API source** - Easy to monitor and debug
- ✅ **Well under limits** - 29% of monthly limit
- ✅ **Fast UI updates** - Database reads are instant
- ✅ **Reliable fallbacks** - Database persists data
- ✅ **Scalable** - Can add more readers without API cost

## Monitoring
- Check `/api/cron/update-btc` (GET) for status
- Monitor database table `realtime_btc_prices`
- Logs show "🔄 SINGLE COINGECKO API CALL" for API calls
- Logs show "📖 Reading BTC price from database" for reads 