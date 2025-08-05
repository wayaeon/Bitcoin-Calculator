# Setting Up Cron Jobs for BTC Price History Updates

This guide explains how to set up automated daily updates for the BTC Price History CSV file.

## Overview

The system will update the `BTC Price History.csv` file twice daily:
- **7:00 AM CST** - Morning update (captures overnight data)
- **7:00 PM CST** - Evening update (captures daily trading data)

## Setup Instructions

### 1. Make the Script Executable

```bash
chmod +x scripts/daily-btc-update.js
```

### 2. Open Crontab

```bash
crontab -e
```

### 3. Add the Cron Jobs

Add these lines to your crontab (adjust the path to match your project location):

```bash
# BTC Price History Updates
# 7:00 AM CST (13:00 UTC)
0 13 * * * /usr/bin/node /path/to/your/project/scripts/daily-btc-update.js >> /path/to/your/project/logs/btc-update.log 2>&1

# 7:00 PM CST (01:00 UTC next day)
0 1 * * * /usr/bin/node /path/to/your/project/scripts/daily-btc-update.js >> /path/to/your/project/logs/btc-update.log 2>&1
```

### 4. Create Log Directory

```bash
mkdir -p logs
```

### 5. Test the Script

Before setting up cron, test the script manually:

```bash
node scripts/daily-btc-update.js
```

### 6. Verify Cron Jobs

Check if your cron jobs are set up correctly:

```bash
crontab -l
```

## Time Zone Notes

- The cron jobs use UTC time
- 7:00 AM CST = 13:00 UTC
- 7:00 PM CST = 01:00 UTC (next day)

## Monitoring

Check the logs to ensure updates are running:

```bash
tail -f logs/btc-update.log
```

## Manual Updates

You can also run updates manually:

```bash
# Update with latest data
node scripts/daily-btc-update.js

# Or use the API endpoint
curl -X POST http://localhost:3000/api/update-btc-csv
```

## Troubleshooting

1. **Script not found**: Ensure the path in crontab is absolute
2. **Permission denied**: Make sure the script is executable
3. **Node not found**: Use full path to node executable
4. **Logs not writing**: Check directory permissions

## Expected Behavior

- New data is added at the top of the CSV file
- Only new dates are added (no duplicates)
- Complete OHLCV data for each day
- Logs show success/failure status 