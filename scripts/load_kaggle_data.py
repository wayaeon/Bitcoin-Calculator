#!/usr/bin/env python3
"""
Kaggle Bitcoin Historical Data Loader
This script loads the Bitcoin historical dataset from Kaggle and converts it to JSON
for use in the Next.js application.
"""

import json
import pandas as pd
import numpy as np
import kagglehub
from kagglehub import KaggleDatasetAdapter
from datetime import datetime
import os

def load_bitcoin_dataset():
    """Load the Bitcoin historical dataset from Kaggle"""
    try:
        print("Loading Bitcoin historical data from Kaggle...")
        
        # Load the dataset
        df = kagglehub.load_dataset(
            KaggleDatasetAdapter.PANDAS,
            "mczielinski/bitcoin-historical-data",
            "",  # Empty string for the main dataset file
        )
        
        print(f"Dataset loaded successfully! Shape: {df.shape}")
        print(f"Columns: {df.columns.tolist()}")
        print(f"Date range: {df.index.min()} to {df.index.max()}")
        
        return df
        
    except Exception as e:
        print(f"Error loading Kaggle dataset: {e}")
        print("Falling back to sample data...")
        return create_sample_data()

def create_sample_data():
    """Create sample data for testing when Kaggle dataset is unavailable"""
    print("Creating sample Bitcoin historical data...")
    
    # Create comprehensive sample data from 2020 to 2024
    dates = pd.date_range(start='2020-01-01', end='2024-12-31', freq='D')
    
    sample_data = []
    base_price = 8000  # Starting price in 2020
    
    for i, date in enumerate(dates):
        # Simulate realistic Bitcoin price movements with more variation
        days_since_start = i
        
        # Add trend, cycles, and noise for more realistic data
        trend = days_since_start * 15  # Upward trend
        cycle = np.sin(days_since_start * 0.01) * 10000  # Cyclical pattern
        noise = (np.random.random() - 0.5) * 5000  # Random noise
        
        price = max(base_price + trend + cycle + noise, 3000)  # Minimum price
        
        # Generate OHLC data
        open_price = price - (np.random.random() * 1000 - 500)
        high_price = price + np.random.random() * 2000
        low_price = price - np.random.random() * 2000
        close_price = price
        
        volume = 15000000000 + np.random.random() * 10000000000
        market_cap = close_price * 19000000
        
        sample_data.append({
            'timestamp': date.strftime('%Y-%m-%d'),
            'open': open_price,
            'high': high_price,
            'low': low_price,
            'close': close_price,
            'volume': volume,
            'market_cap': market_cap
        })
    
    return pd.DataFrame(sample_data)

def process_dataframe(df):
    """Process the dataframe into the format needed for the application"""
    print("Processing data...")
    
    # Ensure we have the required columns
    required_columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
    
    # If the dataframe has a different structure, adapt it
    if 'Date' in df.columns:
        df = df.rename(columns={'Date': 'timestamp'})
    
    if 'Open' in df.columns:
        df = df.rename(columns={
            'Open': 'open',
            'High': 'high', 
            'Low': 'low',
            'Close': 'close',
            'Volume': 'volume'
        })
    
    # Ensure all required columns exist
    for col in required_columns:
        if col not in df.columns:
            print(f"Warning: Missing column {col}, adding default values")
            if col == 'timestamp':
                df[col] = pd.date_range(start='2020-01-01', periods=len(df)).strftime('%Y-%m-%d')
            else:
                df[col] = 0
    
    # Convert to the format expected by the application
    processed_data = []
    
    for _, row in df.iterrows():
        processed_row = {
            'timestamp': str(row['timestamp']),
            'open': float(row['open']),
            'high': float(row['high']),
            'low': float(row['low']),
            'close': float(row['close']),
            'volume': float(row['volume']),
            'market_cap': float(row.get('market_cap', row['close'] * 19000000))
        }
        processed_data.append(processed_row)
    
    return processed_data

def save_to_json(data, filename='public/data/bitcoin-historical.json'):
    """Save the processed data to JSON file"""
    print(f"Saving data to {filename}...")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Data saved successfully! {len(data)} records written.")

def main():
    """Main function to load and process the Bitcoin dataset"""
    print("=== Bitcoin Historical Data Loader ===")
    
    # Load the dataset
    df = load_bitcoin_dataset()
    
    # Process the data
    processed_data = process_dataframe(df)
    
    # Save to JSON
    save_to_json(processed_data)
    
    # Print summary statistics
    if processed_data:
        prices = [item['close'] for item in processed_data]
        volumes = [item['volume'] for item in processed_data]
        
        print("\n=== Summary Statistics ===")
        print(f"Total records: {len(processed_data)}")
        print(f"Date range: {processed_data[0]['timestamp']} to {processed_data[-1]['timestamp']}")
        print(f"Price range: ${min(prices):,.2f} to ${max(prices):,.2f}")
        print(f"Average volume: ${sum(volumes)/len(volumes):,.0f}")
        print(f"Current price: ${prices[-1]:,.2f}")
    
    print("\n=== Data loading complete! ===")

if __name__ == "__main__":
    main() 