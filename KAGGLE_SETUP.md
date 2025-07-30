# Kaggle Bitcoin Historical Data Integration

This project now includes integration with the Kaggle Bitcoin historical dataset (`mczielinski/bitcoin-historical-data`) to provide comprehensive historical analysis alongside the BTC calculator.

## 🚀 Quick Setup

### 1. Install Python Dependencies

```bash
# Navigate to the scripts directory
cd scripts

# Install required Python packages
pip install -r requirements.txt
```

### 2. Load the Kaggle Dataset

```bash
# Run the Python script to load and process the dataset
python load_kaggle_data.py
```

This will:
- Download the Bitcoin historical dataset from Kaggle
- Process and clean the data
- Save it as JSON in `public/data/bitcoin-historical.json`

### 3. Start the Development Server

```bash
# Return to the project root
cd ..

# Start the Next.js development server
npm run dev
```

## 📊 What's New

### Historical Analysis Component
- **Real Historical Data**: Uses actual Bitcoin price data from Kaggle
- **Comprehensive Statistics**: Shows current price, total change, percentage change, and average volume
- **Interactive Charts**: Area chart showing price history with tooltips
- **Data Quality Indicators**: Shows whether the dataset has sufficient data points

### Enhanced Calculator Integration
- **Historical Context**: Calculator now has access to real historical data
- **Volatility Analysis**: Uses historical volatility for more accurate projections
- **Data-Driven Insights**: Better understanding of Bitcoin's price patterns

## 🔧 Technical Details

### File Structure
```
├── scripts/
│   ├── load_kaggle_data.py      # Python script to load Kaggle dataset
│   └── requirements.txt          # Python dependencies
├── lib/
│   └── btc-historical-data.ts   # TypeScript utilities for historical data
├── components/
│   └── btc-historical-analysis.tsx  # Historical analysis component
└── public/
    └── data/
        └── bitcoin-historical.json   # Processed historical data
```

### Data Flow
1. **Python Script** (`load_kaggle_data.py`):
   - Downloads dataset from Kaggle using `kagglehub`
   - Processes and cleans the data
   - Saves as JSON for web consumption

2. **TypeScript Utilities** (`btc-historical-data.ts`):
   - Loads JSON data in the browser
   - Processes data for chart display
   - Calculates statistics and metrics

3. **React Component** (`btc-historical-analysis.tsx`):
   - Displays historical analysis
   - Shows interactive charts
   - Provides comprehensive statistics

## 📈 Features

### Historical Analysis
- **Price History Chart**: Interactive area chart showing Bitcoin price over time
- **Summary Statistics**: Current price, total change, percentage change, average volume
- **Data Quality**: Indicates whether sufficient historical data is available
- **Responsive Design**: Works on all screen sizes

### Integration with Calculator
- **Enhanced Accuracy**: Calculator uses real historical data for better projections
- **Volatility Analysis**: Historical volatility helps inform future projections
- **Data-Driven Insights**: Better understanding of Bitcoin's price patterns

## 🛠️ Troubleshooting

### Common Issues

1. **Kaggle API Not Working**
   ```bash
   # If you get authentication errors, you may need to set up Kaggle credentials
   # See: https://github.com/Kaggle/kaggle-api
   ```

2. **Python Dependencies Not Found**
   ```bash
   # Make sure you're in the scripts directory
   cd scripts
   pip install -r requirements.txt
   ```

3. **JSON File Not Found**
   ```bash
   # The script creates the directory automatically, but if it fails:
   mkdir -p public/data
   python load_kaggle_data.py
   ```

### Fallback Behavior
- If the Kaggle dataset fails to load, the system falls back to mock data
- The calculator continues to work with the existing CoinGecko API
- All components gracefully handle missing data

## 🔄 Updating Data

To refresh the historical data:

```bash
# Run the Python script again
cd scripts
python load_kaggle_data.py
```

The new data will be automatically loaded by the web application on the next page refresh.

## 📝 Notes

- The Kaggle dataset provides comprehensive historical Bitcoin data
- The Python script processes the data into a format optimized for web display
- The TypeScript utilities provide fallback mechanisms for reliability
- All components are designed to work with or without the historical data

## 🎯 Benefits

1. **Real Data**: Uses actual Bitcoin historical data instead of mock data
2. **Comprehensive Analysis**: Provides detailed statistics and visualizations
3. **Better Calculator**: Enhanced projections based on real historical patterns
4. **Reliable**: Fallback mechanisms ensure the app always works
5. **Maintainable**: Clear separation between data loading and display logic 