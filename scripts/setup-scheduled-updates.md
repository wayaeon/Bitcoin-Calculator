# BTC Data Scheduled Updates Setup

This document explains how to set up automatic updates for the BTC price data at 7:00 AM and 7:00 PM daily.

## How It Works

The system uses your CSV file (`BTC Price History.csv`) as the primary data source and updates it with live CoinGecko API data twice daily. The updates include:

- **Current BTC Price** (Close price)
- **24h Volume** 
- **Market Cap**
- **High/Low prices** (updated if current price exceeds previous range)

## Setup Options

### Option 1: Using a Cron Job (Recommended)

If you have access to a server with cron:

1. **Create a cron job** to call the update endpoint:

```bash
# Add to your crontab (crontab -e)
0 7,19 * * * curl -X POST https://your-domain.com/api/cron/update-btc -H "Authorization: Bearer YOUR_SECRET_KEY"
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
      "schedule": "0 7,19 * * *"
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
    - cron: '0 7,19 * * *'
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

Set up a cron job to call:
```
POST https://your-domain.com/api/cron/update-btc
Headers: Authorization: Bearer YOUR_SECRET_KEY
```

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

## Troubleshooting

### Common Issues

1. **File Permissions**: Ensure the CSV file is writable
2. **API Rate Limits**: CoinGecko has rate limits, but the twice-daily schedule should be fine
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

- The system only updates the latest row in the CSV
- Historical data remains unchanged
- Updates are atomic (all-or-nothing)
- Backup your CSV file regularly 