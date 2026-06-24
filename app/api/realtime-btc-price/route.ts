import { NextResponse } from 'next/server'

const API_KEY = process.env.COINGECKO_API_KEY || 'CG-kWAbG4Uj8mRoUxBDjXWSMVYz'

// Simple in-memory cache — 60 second TTL to avoid hammering CoinGecko
let cache: { data: any; ts: number } | null = null
const TTL = 60_000

export async function GET() { return handler() }
export async function POST() { return handler() }

async function handler() {
  try {
    if (cache && Date.now() - cache.ts < TTL) {
      return NextResponse.json({ success: true, data: cache.data, cached: true })
    }

    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true',
      { headers: { 'x-cg-demo-api-key': API_KEY }, next: { revalidate: 0 } }
    )

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)

    const json = await res.json()
    const btc = json.bitcoin

    const data = {
      price:                         btc.usd,
      market_cap:                    btc.usd_market_cap,
      volume_24h:                    btc.usd_24h_vol,
      price_change_percentage_24h:   btc.usd_24h_change,
      price_change_24h:              btc.usd * (btc.usd_24h_change / 100),
      created_at:                    new Date(btc.last_updated_at * 1000).toISOString(),
    }

    cache = { data, ts: Date.now() }
    return NextResponse.json({ success: true, data })

  } catch (err) {
    // Return cached data on error rather than showing "Error" in the UI
    if (cache) {
      return NextResponse.json({ success: true, data: cache.data, stale: true })
    }
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
