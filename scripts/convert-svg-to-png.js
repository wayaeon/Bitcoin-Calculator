const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  try {
    const svgPath = path.join(__dirname, '../public/btc-favicon.svg');
    const pngPath = path.join(__dirname, '../app/icon.png');
    
    // Read the SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Convert SVG to PNG using sharp
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(pngPath);
    
    console.log('Successfully converted SVG to PNG favicon!');
    console.log('New favicon saved to:', pngPath);
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
  }
}

convertSvgToPng(); 