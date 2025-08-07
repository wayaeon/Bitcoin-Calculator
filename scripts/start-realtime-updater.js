const RealtimeBTCUpdater = require('./update-realtime-btc-csv.js');

console.log('🚀 Starting BTC Realtime Data Updater...');
console.log('📊 This will update BTC_Realtime_Data.csv every 5 minutes');
console.log('⏰ Updates will include: price, volume, market cap, and 24h changes');
console.log('💾 Data is stored in: public/BTC_Realtime_Data.csv');
console.log('');

const updater = new RealtimeBTCUpdater();
updater.startPeriodicUpdate(5);

console.log('✅ Updater started successfully!');
console.log('🔄 First update will happen immediately...');
console.log('📈 Subsequent updates every 5 minutes');
console.log('');
console.log('Press Ctrl+C to stop the updater'); 