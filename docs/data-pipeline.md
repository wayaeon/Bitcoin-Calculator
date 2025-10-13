# Bitcoin Data Pipeline Documentation

## Overview

The Bitcoin data pipeline is a comprehensive system for collecting, consolidating, and serving Bitcoin historical price data from 2009 to the present day. The system ensures accurate, up-to-date data through automated collection and consolidation processes.

## Architecture

### Components

1. **Realtime Data Collector** (`lib/btc-realtime-collector.ts`)
   - Fetches current Bitcoin price data from CoinGecko API every 5 minutes
   - Stores data in `public/BTC_Realtime_Data.csv`
   - Implements retry logic with exponential backoff
   - Caches API responses to reduce redundant calls
   - Maintains rolling 30-day window of realtime data

2. **Data Consolidator** (`lib/btc-data-consolidator.ts`)
   - Runs twice daily at 7 AM and 7 PM UTC
   - Calculates OHLCV (Open, High, Low, Close, Volume) from realtime data
   - Merges calculated data into `public/BTC Price History copy.csv`
   - Removes duplicates and maintains chronological order
   - Validates data integrity before consolidation

3. **Logger** (`lib/logger.ts`)
   - Provides centralized logging for the entire pipeline
   - Logs to both console and `logs/btc-data-pipeline.log`
   - Supports multiple log levels (info, warn, error, debug)
   - Automatic log rotation to prevent file bloat

4. **Historical Data Loader** (`lib/btc-historical-data.ts`)
   - Loads consolidated CSV data with 5-minute caching
   - Provides processed data for charts and calculators
   - Graceful fallback to mock data if CSV unavailable
   - Cache management utilities for forcing refresh

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   CoinGecko API                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Every 5 minutes
                       ▼
          ┌────────────────────────┐
          │  Realtime Collector    │
          │  (with retry logic)    │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │ BTC_Realtime_Data.csv  │
          │ (30-day rolling)       │
          └────────────┬───────────┘
                       │
                       │ 7 AM & 7 PM UTC
                       ▼
          ┌────────────────────────┐
          │   Data Consolidator    │
          │   (OHLCV calculation)  │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │BTC Price History copy  │
          │   (2009 - Present)     │
          └────────────┬───────────┘
                       │
                       │ On-demand with caching
                       ▼
          ┌────────────────────────┐
          │  Charts & Calculators  │
          └────────────────────────┘
```

## API Endpoints

### Realtime Collection

**Endpoint:** `/api/cron/update-btc-realtime`  
**Method:** GET or POST  
**Schedule:** Every 5 minutes (`*/5 * * * *`)  
**Purpose:** Collect current Bitcoin price data from CoinGecko

**Response:**
```json
{
  "success": true,
  "message": "Realtime BTC data collected successfully",
  "source": "api|cache|fallback",
  "data": {
    "timestamp": 1234567890,
    "price": 115000,
    "volume_24h": 30000000000,
    "market_cap": 2280000000000,
    "price_change_24h": 1000,
    "price_change_percentage_24h": 0.87
  },
  "timestamp": "2025-10-12T12:00:00.000Z"
}
```

### Daily Consolidation

**Endpoint:** `/api/cron/update-btc-daily`  
**Method:** GET or POST  
**Schedule:** Twice daily at 7 AM and 7 PM UTC (`0 7,19 * * *`)  
**Purpose:** Consolidate realtime data into historical CSV

**Response:**
```json
{
  "success": true,
  "message": "Data consolidation completed successfully",
  "stats": {
    "realtimeEntries": 288,
    "newRowsAdded": 1,
    "rowsUpdated": 0,
    "dateRange": "2025-10-11 to 2025-10-12"
  },
  "timestamp": "2025-10-12T07:00:00.000Z"
}
```

### Health Check

**Endpoint:** `/api/health/btc-data`  
**Method:** GET  
**Purpose:** Monitor data pipeline health

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2025-10-12T12:00:00.000Z",
  "consolidation": {
    "status": "current",
    "lastHistoricalDate": "2025-10-12",
    "realtimeEntries": 8640,
    "historicalEntries": 5915
  },
  "realtimeData": {
    "cached": true,
    "lastPrice": 115000,
    "lastUpdate": "2025-10-12T11:55:00.000Z",
    "fileExists": true,
    "fileSize": 1048576
  },
  "historicalData": {
    "fileExists": true,
    "fileSize": 5242880
  }
}
```

### Test Consolidation

**Endpoint:** `/api/test/consolidation?action={action}`  
**Method:** GET or POST  
**Purpose:** Manually test data pipeline components

**Actions:**
- `status` - Get current consolidation status
- `collect` - Manually trigger realtime data collection
- `consolidate` - Manually trigger consolidation
- `full` - Run full pipeline (collect then consolidate)

**Example:**
```bash
# Get status
curl http://localhost:3000/api/test/consolidation?action=status

# Run full pipeline
curl http://localhost:3000/api/test/consolidation?action=full
```

### Chart Data

**Endpoint:** `/api/btc-chart-data?timeRange={range}&currency={currency}`  
**Method:** GET  
**Purpose:** Retrieve processed data for charts

**Parameters:**
- `timeRange`: 1D, 7D, 30D, 90D, 6mo, 1Y, 5Y, 10Y, ALL
- `currency`: USD, EUR, GBP, etc.

**Response:**
```json
{
  "success": true,
  "data": [...],
  "timeRange": "1Y",
  "currency": "USD",
  "count": 365,
  "lastUpdated": {
    "consolidationStatus": "current",
    "lastHistoricalDate": "2025-10-12",
    "fileModified": "2025-10-12T07:00:15.000Z"
  }
}
```

## Data Validation

### Realtime Data Validation

- **Price**: Must be between $100 and $10,000,000
- **Volume**: Must be non-negative
- **Market Cap**: Must be non-negative
- **Required fields**: All fields must be present

### Historical Data Validation

- **Dates**: Must be in ISO 8601 format (YYYY-MM-DD)
- **Chronological order**: Data must be sorted by date
- **Duplicates**: Automatically removed, keeping most recent
- **OHLCV consistency**: High ≥ Open, Close, Low; Low ≤ Open, Close, High

## Error Handling

### Retry Logic

1. **Initial attempt** - Try API call
2. **First retry** - Wait 1 second, retry
3. **Second retry** - Wait 2 seconds, retry
4. **Third retry** - Wait 4 seconds, retry
5. **Failure** - Use cached data or return error

### Fallback Mechanisms

1. **API failure** → Use cached data (up to 4 minutes old)
2. **Stale cache** → Use very old cache if available
3. **No cache** → Return error, log incident
4. **CSV read failure** → Use fallback mock data

### Logging

All errors and important events are logged to:
- Console (real-time monitoring)
- File: `logs/btc-data-pipeline.log`

Log format:
```
[2025-10-12T12:00:00.000Z] [INFO] [Collector] Successfully fetched fresh data from API {"price":115000}
[2025-10-12T12:05:00.000Z] [WARN] [Collector] Retry 1/3 after 1000ms
[2025-10-12T12:10:00.000Z] [ERROR] [Collector] Max retries exceeded
```

## File Structure

### Realtime Data CSV

**File:** `public/BTC_Realtime_Data.csv`  
**Format:**
```csv
entry,price,volume_24h,market_cap,price_change_24h,price_change_percentage_24h,created_at,updated_at
1728739242000,115000,30000000000,2280000000000,1000,0.87,2025-10-12T12:00:42.000Z,2025-10-12T12:00:42.000Z
```

**Retention:** 30 days (8,640 entries maximum)

### Historical Data CSV

**File:** `public/BTC Price History copy.csv`  
**Format:**
```csv
Start,End,Open,High,Low,Close,Volume,Market Cap,Circulating Supply
2009-01-03,2009-01-04,0.00000022,0.00000022,0.00000022,0.00000022,0,0.00001103,50
```

**Coverage:** 2009-01-03 to present day

## Monitoring

### Health Indicators

- ✅ **Healthy**: All systems operational, data up-to-date
- ⚠️ **Warning**: Using cached data, minor delays
- ❌ **Unhealthy**: API failures, missing data, consolidation errors

### Key Metrics

1. **Data Freshness**
   - Realtime data: Updated every 5 minutes
   - Historical data: Updated at 7 AM & 7 PM UTC
   - Cache age: Maximum 5 minutes

2. **API Usage**
   - Realtime endpoint: 288 calls/day
   - Total monthly calls: ~8,640
   - CoinGecko limit: 10,000/month
   - Usage: ~86% of limit

3. **Data Coverage**
   - Historical entries: 5,915+ rows
   - Date range: 2009-01-03 to present
   - Realtime entries: ~8,640 (30 days)

### Monitoring Tools

1. **Health Check Endpoint**
   ```bash
   curl http://localhost:3000/api/health/btc-data
   ```

2. **Log Monitoring**
   ```bash
   tail -f logs/btc-data-pipeline.log
   ```

3. **Manual Testing**
   ```bash
   # Test realtime collection
   curl -X POST http://localhost:3000/api/cron/update-btc-realtime
   
   # Test consolidation
   curl -X POST http://localhost:3000/api/cron/update-btc-daily
   
   # Test full pipeline
   curl http://localhost:3000/api/test/consolidation?action=full
   ```

## Deployment

### Vercel Configuration

The cron jobs are configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-btc-realtime",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/update-btc-daily",
      "schedule": "0 7,19 * * *"
    }
  ]
}
```

### Environment Variables

Required variables:
```env
COINGECKO_API_KEY=your_api_key_here
```

### Local Development

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Test realtime collection**
   ```bash
   curl -X POST http://localhost:3000/api/cron/update-btc-realtime
   ```

3. **Test consolidation**
   ```bash
   curl -X POST http://localhost:3000/api/cron/update-btc-daily
   ```

4. **Monitor logs**
   ```bash
   tail -f logs/btc-data-pipeline.log
   ```

## Troubleshooting

### Common Issues

1. **"No realtime data available"**
   - Check if `BTC_Realtime_Data.csv` exists
   - Manually trigger collection: `/api/test/consolidation?action=collect`
   - Check API key configuration

2. **"Consolidation failed"**
   - Check if realtime data has entries from last 24 hours
   - Verify CSV file permissions
   - Check logs for specific error

3. **"API rate limit exceeded"**
   - CoinGecko free tier has 10,000 calls/month limit
   - Current usage is ~8,640/month (within limits)
   - If exceeded, system will use cached data

4. **"Invalid data received from API"**
   - CoinGecko API may be down
   - Data validation failed (price out of range)
   - System will retry with exponential backoff

### Debug Mode

Enable detailed logging:
```typescript
// In logger.ts
logger.debug('Module', 'Detailed debug message', { data })
```

View recent logs:
```bash
curl http://localhost:3000/api/logs?lines=100
```

## Performance

### Caching Strategy

1. **API Cache**: 4 minutes (prevents redundant calls)
2. **Historical Data Cache**: 5 minutes (reduces file reads)
3. **Chart Data**: No caching (uses historical cache)

### Optimization Tips

1. **Chart rendering**: Limit data points to 2,000 for long ranges
2. **API calls**: Use cache whenever possible
3. **File operations**: Batch reads/writes
4. **Log rotation**: Keep last 10,000 lines only

## Security

### API Key Protection

- Store API key in environment variables
- Never commit API keys to version control
- Rotate keys periodically

### Rate Limiting

- Respect CoinGecko API limits
- Implement client-side rate limiting
- Use cache to reduce API calls

### Data Validation

- Validate all inputs
- Sanitize CSV data
- Check data integrity before consolidation

## Future Improvements

1. **Database Integration**: Move from CSV to PostgreSQL/Supabase
2. **Real-time Updates**: WebSocket integration for live price updates
3. **Multiple Data Sources**: Add Binance, Coinbase as fallbacks
4. **Advanced Analytics**: Calculate technical indicators (RSI, MACD, etc.)
5. **Alerting System**: Email/SMS notifications for pipeline failures
6. **Performance Monitoring**: Add APM (Application Performance Monitoring)

## Changelog

### Version 1.0.0 (2025-10-12)

- Initial release
- Realtime data collection every 5 minutes
- Daily consolidation at 7 AM and 7 PM UTC
- Comprehensive error handling and logging
- Health check endpoint
- Test endpoints for manual testing
- Complete documentation

## Support

For issues or questions:
1. Check logs: `logs/btc-data-pipeline.log`
2. Run health check: `/api/health/btc-data`
3. Test pipeline: `/api/test/consolidation?action=full`
4. Review this documentation

## License

Proprietary - All rights reserved

