import { NextRequest, NextResponse } from 'next/server'
import { readSettings } from '@/lib/db'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  if (!q) return NextResponse.json([])

  const { googleMapsApiKey } = readSettings()

  if (googleMapsApiKey) {
    return googlePlacesSearch(q, googleMapsApiKey)
  }
  return nominatimSearch(q)
}

async function googlePlacesSearch(q: string, apiKey: string) {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      // Fall back to Nominatim on API errors (bad key, billing, etc.)
      return nominatimSearch(q)
    }
    return NextResponse.json(
      (data.results ?? []).slice(0, 6).map((r: { name: string; formatted_address: string; geometry: { location: { lat: number; lng: number } } }) => ({
        name: `${r.name}, ${r.formatted_address}`,
        lat: r.geometry.location.lat,
        lng: r.geometry.location.lng,
      }))
    )
  } catch {
    return nominatimSearch(q)
  }
}

async function nominatimSearch(q: string) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
      { headers: { 'User-Agent': 'CampMate/1.0 (home-assistant-addon)' }, signal: AbortSignal.timeout(6000) }
    )
    const results = await res.json()
    return NextResponse.json(
      results.map((r: { display_name: string; lat: string; lon: string }) => ({
        name: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }))
    )
  } catch {
    return NextResponse.json([])
  }
}
