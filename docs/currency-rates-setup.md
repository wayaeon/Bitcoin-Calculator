# Currency Rate Update System

This system automatically stores and updates currency conversion rates relative to USD in the `currency-conversion.md` file.

## Overview

- **Update Schedule**: Twice daily at 7:00 AM and 7:00 PM PST
- **Storage**: Rates are stored in `public/currency-conversion.md` in markdown format
- **API Source**: CurrencyAPI.com (requires API key)
- **Supported Currencies**: 20 major currencies including USD, EUR, GBP, JPY, etc.

## Setup

### 1. Environment Variables

Add your CurrencyAPI.com API key to your `.env.local` file:

```bash
CURRENCY_API_KEY=your_api_key_here
```

### 2. Initial Setup

Run the initial currency rate update:

```bash
npm run update-currency-rates
```

### 3. Automated Updates

#### Option A: Cron Job (Recommended)

Add these cron jobs to your server:

```bash
# Update at 7:00 AM PST (15:00 UTC)
0 15 * * * cd /path/to/your/project && npm run update-currency-rates

# Update at 7:00 PM PST (03:00 UTC next day)
0 3 * * * cd /path/to/your/project && npm run update-currency-rates
```

#### Option B: Vercel Cron Jobs

If using Vercel, add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/update-currency-rates",
      "schedule": "0 15,3 * * *"
    }
  ]
}
```

## API Endpoints

### GET `/api/update-currency-rates`
Check if currency rates should be updated.

**Response:**
```json
{
  "shouldUpdate": true,
  "message": "Currency rates status checked",
  "hasRates": true,
  "lastUpdated": "2024-01-15T19:00:00.000Z",
  "ratesCount": 20
}
```

### POST `/api/update-currency-rates`
Update currency rates (only works at 7am and 7pm PST).

**Response:**
```json
{
  "message": "Currency rates updated successfully",
  "shouldUpdate": true,
  "updatedAt": "2024-01-15T19:00:00.000Z",
  "ratesCount": 20,
  "lastUpdated": "2024-01-15T19:00:00.000Z"
}
```

## File Format

The `currency-conversion.md` file contains:

```markdown
# Currency Conversion Rates

All currencies relative to USD

**Last Updated:** 01/15/2024, 07:00:00 PM PST

**Base Currency:** USD

| Code | Name | Symbol | Rate (USD) | Last Updated |
|------|------|--------|------------|--------------|
| USD | US Dollar | $ | 1.000000 | 01/15/2024, 07:00 PM PST |
| EUR | Euro | € | 0.850000 | 01/15/2024, 07:00 PM PST |
| GBP | British Pound | £ | 0.730000 | 01/15/2024, 07:00 PM PST |
...

---
*Rates are updated twice daily at 7:00 AM and 7:00 PM PST*
*Data provided by CurrencyAPI.com*
```

## Manual Updates

To manually update currency rates:

```bash
npm run update-currency-rates
```

Or make a POST request to `/api/update-currency-rates` (only works during update windows).

## Integration

The system automatically integrates with:

1. **BTC Price History Component**: Uses stored rates for currency conversion
2. **Currency API**: Returns rates from stored file instead of live API calls
3. **Calculator Components**: Use stored rates for calculations

## Troubleshooting

### No Rates Available
If the system shows "No currency rates available":

1. Check if `CURRENCY_API_KEY` is set
2. Run manual update: `npm run update-currency-rates`
3. Verify `currency-conversion.md` file exists and has content

### Update Not Working
If automatic updates aren't working:

1. Check cron job configuration
2. Verify timezone settings (PST)
3. Check API key validity
4. Review server logs for errors

### API Errors
If you get API errors:

1. Verify CurrencyAPI.com API key is valid
2. Check API rate limits
3. Ensure network connectivity
4. Review error logs for specific issues

## Monitoring

Monitor the system by:

1. Checking `/api/update-currency-rates` GET endpoint
2. Reviewing `currency-conversion.md` file timestamps
3. Monitoring application logs
4. Setting up alerts for failed updates 