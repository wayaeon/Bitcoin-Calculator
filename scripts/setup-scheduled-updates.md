# BTC Data Scheduled Updates Setup

This document explains how to set up automatic updates for the BTC price data every 270 seconds (4.5 minutes).

## How It Works

The system updates the `realtime_btc_prices` table in Supabase with live CoinGecko API data every 270 seconds. The updates include:

- **Current BTC Price** (Close price)
- **24h Volume** 
- **Market Cap**
- **Price Change 24h**
- **Price Change Percentage 24h**

## Update Frequency

- **Every 270 seconds (4.5 minutes)**
- **320 updates per day**
- **11,680 updates per month**
- **116,800 updates per year**

## Setup Options

### Option 1: Using a Cron Job (Recommended)

If you have access to a server with cron:

1. **Create a cron job** to call the update endpoint every 270 seconds:

```bash
# Add to your crontab (crontab -e)
# Run every 4.5 minutes (270 seconds)
*/4 * * * * curl -X POST https://your-domain.com/api/cron/update-btc -H "Authorization: Bearer YOUR_SECRET_KEY"
*/9 * * * * curl -X POST https://your-domain.com/api/cron/update-btc -H "Authorization: Bearer YOUR_SECRET_KEY"
```

2. **Set up environment variable** for the secret key:

```bash
# Add to your .env.local file
BTC_UPDATE_SECRET=your-secret-key-here
```

### Option 2: Using a Cloud Scheduler

#### Vercel Cron Jobs (if deployed on Vercel)

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-btc",
      "schedule": "*/4 * * * *"
    },
    {
      "path": "/api/cron/update-btc", 
      "schedule": "*/9 * * * *"
    }
  ]
}
```

#### GitHub Actions (if using GitHub)

Create `.github/workflows/btc-update.yml`:

```yaml
name: BTC Data Update

on:
  schedule:
    - cron: '*/4 * * * *'
    - cron: '*/9 * * * *'
  workflow_dispatch:

jobs:
  update-btc:
    runs-on: ubuntu-latest
    steps:
      - name: Update BTC Data
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/update-btc \
            -H "Authorization: Bearer ${{ secrets.BTC_UPDATE_SECRET }}"
```

### Option 3: Using a Third-Party Service

Services like:
- **Cron-job.org** (free)
- **EasyCron** (free tier available)
- **SetCronJob** (free tier available)

Set up cron jobs to call:
```
POST https://your-domain.com/api/cron/update-btc
Headers: Authorization: Bearer YOUR_SECRET_KEY
```

**Schedule:** Every 270 seconds (4.5 minutes)

## Manual Testing

You can test the update system manually:

1. **Check if update is needed:**
   ```bash
   curl https://your-domain.com/api/update-btc-data
   ```

2. **Trigger manual update:**
   ```bash
   curl -X POST https://your-domain.com/api/cron/update-btc \
     -H "Authorization: Bearer YOUR_SECRET_KEY"
   ```

## Monitoring

The system provides several ways to monitor updates:

1. **Browser Console**: Check for update logs
2. **Component Display**: The chart shows last update time
3. **API Endpoints**: Check update status via API calls

## Database Performance

The `realtime_btc_prices` table is designed to handle:
- **320 updates per day**
- **11,680 updates per month** 
- **116,800 updates per year**

Consider implementing a data retention policy to keep only recent data (e.g., last 30-90 days) for optimal performance.

## Troubleshooting

### Common Issues

1. **File Permissions**: Ensure the CSV file is writable
2. **API Rate Limits**: CoinGecko has rate limits, but the 270-second interval should be fine
3. **Network Issues**: The system will retry on next scheduled update

### Debug Information

The system logs:
- Update attempts and results
- API response data
- File modification times
- Error details

## Security Notes

- The cron endpoint requires authorization
- Use a strong secret key
- Consider IP whitelisting for additional security
- Monitor for unauthorized access attempts

## Data Integrity

- Each update stores a complete price record
- Historical data is preserved
- Updates are atomic (all-or-nothing)
- Backup your database regularly 