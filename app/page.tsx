"use client"

import { BTCCalculator } from '@/components/btc-calculator'
import { PriceUpdateMonitor } from '@/components/price-update-monitor'

export default function Home() {
  return (
    <div className="min-h-screen w-full">
      <BTCCalculator />
      {/* Temporary monitor for testing real-time updates */}
      <div className="fixed top-4 right-4 z-50">
        <PriceUpdateMonitor />
      </div>
    </div>
  )
}
