#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Fix CSV file order - reverse so oldest dates are at the top
const csvPath = path.join(process.cwd(), 'public', 'BTC Price History.csv')

async function fixCSVOrder() {
  try {
    console.log('Reading CSV file...')
    const csvContent = fs.readFileSync(csvPath, 'utf8')
    const lines = csvContent.split('\n')
    
    // Keep the header
    const header = lines[0]
    
    // Get all data lines (skip header)
    const dataLines = lines.slice(1).filter(line => line.trim())
    
    console.log(`Found ${dataLines.length} data lines`)
    
    // Reverse the data lines (oldest first)
    const reversedDataLines = dataLines.reverse()
    
    // Create new CSV content
    const newCSVContent = header + '\n' + reversedDataLines.join('\n')
    
    // Write back to file
    fs.writeFileSync(csvPath, newCSVContent, 'utf8')
    
    console.log('CSV file reordered successfully!')
    console.log('Oldest dates are now at the top, newest dates at the bottom.')
    
    // Show first and last few lines
    const newLines = newCSVContent.split('\n')
    console.log('\nFirst 3 lines:')
    console.log(newLines.slice(0, 3).join('\n'))
    
    console.log('\nLast 3 lines:')
    console.log(newLines.slice(-3).join('\n'))
    
  } catch (error) {
    console.error('Error fixing CSV order:', error)
  }
}

fixCSVOrder() 