const fs = require('fs');
const path = require('path');

class RealtimeBTCUpdater {
  constructor() {
    this.csvPath = path.join(process.cwd(), 'public', 'BTC_Realtime_Data.csv');
    this.baseUrl = 'https://api.coingecko.com/api/v3';
  }

  async fetchCurrentBTCData() {
    try {
      const url = `${this.baseUrl}/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_market_cap=true`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.bitcoin;
    } catch (error) {
      console.error('Error fetching current BTC data:', error);
      throw error;
    }
  }

  async updateCSVFile() {
    try {
      console.log('🔄 Updating BTC realtime data...');
      
      const btcData = await this.fetchCurrentBTCData();
      const now = new Date().toISOString();
      
      // Create new data row
      const newRow = {
        entry: Date.now(), // Use timestamp as entry ID
        price: btcData.usd.toString(),
        volume_24h: btcData.usd_24h_vol ? btcData.usd_24h_vol.toString() : '',
        market_cap: btcData.usd_market_cap ? btcData.usd_market_cap.toString() : '',
        price_change_24h: btcData.usd_24h_change ? btcData.usd_24h_change.toString() : '',
        price_change_percentage_24h: btcData.usd_24h_change ? btcData.usd_24h_change.toString() : '',
        created_at: now,
        updated_at: now
      };
      
      // Read existing CSV
      let csvContent = '';
      if (fs.existsSync(this.csvPath)) {
        csvContent = fs.readFileSync(this.csvPath, 'utf-8');
      } else {
        // Create header if file doesn't exist
        csvContent = 'entry,price,volume_24h,market_cap,price_change_24h,price_change_percentage_24h,created_at,updated_at\n';
      }
      
      // Add new row
      const newRowString = `${newRow.entry},${newRow.price},${newRow.volume_24h},${newRow.market_cap},${newRow.price_change_24h},${newRow.price_change_percentage_24h},${newRow.created_at},${newRow.updated_at}\n`;
      csvContent += newRowString;
      
      // Keep only last 1000 entries to prevent file from growing too large
      const lines = csvContent.split('\n');
      if (lines.length > 1001) { // Header + 1000 data rows
        const header = lines[0];
        const dataLines = lines.slice(1).filter(line => line.trim());
        const recentData = dataLines.slice(-1000);
        csvContent = header + '\n' + recentData.join('\n') + '\n';
      }
      
      // Write back to file
      fs.writeFileSync(this.csvPath, csvContent);
      
      console.log(`✅ Updated BTC realtime data: $${btcData.usd} (${new Date().toLocaleTimeString()})`);
      
    } catch (error) {
      console.error('❌ Error updating BTC realtime data:', error);
    }
  }

  startPeriodicUpdate(intervalMinutes = 5) {
    console.log(`🚀 Starting BTC realtime updates every ${intervalMinutes} minutes...`);
    
    // Initial update
    this.updateCSVFile();
    
    // Set up periodic updates
    const intervalMs = intervalMinutes * 60 * 1000;
    setInterval(() => {
      this.updateCSVFile();
    }, intervalMs);
  }
}

// Run the updater
const updater = new RealtimeBTCUpdater();

if (require.main === module) {
  // If run directly, start the periodic updates
  updater.startPeriodicUpdate(5);
}

module.exports = RealtimeBTCUpdater; 