import { NextRequest, NextResponse } from 'next/server'
import { readSettings } from '@/lib/db'

interface Location {
  name: string
  lat: number
  lng: number
  googleMapsUrl: string
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url?.trim()) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  const { googleMapsApiKey } = readSettings()

  let resolvedUrl = url.trim()

  // Resolve short links
  if (/goo\.gl|maps\.app/.test(resolvedUrl)) {
    try {
      const res = await fetch(resolvedUrl, {
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CampMate/1.0)' },
        signal: AbortSignal.timeout(8000),
      })
      resolvedUrl = res.url
    } catch { /* use original */ }
  }

  // ── Shared live route (server-side stored, no extractable stops) ──
  // URL looks like maps/@/data=!...!2sROUTE_ID!... — no public API to decode
  if (/maps\/@\/data=/.test(resolvedUrl)) {
    return NextResponse.json({
      error: 'This is a "Share route" link — Google stores the stops privately and they can\'t be extracted. Instead, open the route in Google Maps → tap the ⋮ menu → Share or embed map → Copy link. Or use a directions link (maps.google.com/maps/dir/Place1/Place2).',
    }, { status: 422 })
  }

  // ── Multi-stop directions URL: /maps/dir/PlaceA/PlaceB/PlaceC/@lat,lng ──
  const dirMatch = resolvedUrl.match(/maps\/dir\/(.+?)(?:\/@|$)/)
  if (dirMatch) {
    const segments = dirMatch[1]
      .split('/')
      .map((s: string) => decodeURIComponent(s.replace(/\+/g, ' ')).trim())
      .filter((s: string) => s.length > 0 && s !== 'dir')

    if (segments.length > 0) {
      const locations = await Promise.all(segments.map((s: string) => geocodePlace(s, googleMapsApiKey ?? null)))
      const valid = locations.filter((l): l is Location => l !== null)
      if (valid.length > 0) return NextResponse.json({ locations: valid })
    }
  }

  // ── Single place / coordinate URL ──
  const single = parseSingleUrl(resolvedUrl)
  if (single) return NextResponse.json({ locations: [single] })

  // ── Direct "lat, lng" input ──
  const bare = url.trim().match(/^(-?\d+\.?\d+),\s*(-?\d+\.?\d+)$/)
  if (bare) {
    const lat = parseFloat(bare[1]), lng = parseFloat(bare[2])
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return NextResponse.json({ locations: [{ name: 'Pinned Location', lat, lng, googleMapsUrl: mapsLink(lat, lng) }] })
    }
  }

  return NextResponse.json({
    error: 'Could not read this link. For best results: open Google Maps → tap a place → Share → Copy link. Directions links (with multiple stops) also work.',
  }, { status: 422 })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSingleUrl(url: string): Location | null {
  let lat: number | null = null, lng: number | null = null

  const patterns = [
    /@(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
    /[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) { lat = parseFloat(m[1]); lng = parseFloat(m[2]); break }
  }
  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  let name = 'Imported Location'
  const placeM = url.match(/maps\/(?:place|search)\/([^/@?#]+)/)
  if (placeM) {
    const raw = decodeURIComponent(placeM[1].replace(/\+/g, ' '))
    if (raw && raw !== 'undefined') name = raw
  }
  const qM = url.match(/[?&]q=([^&]+)/)
  if (name === 'Imported Location' && qM) {
    const decoded = decodeURIComponent(qM[1].replace(/\+/g, ' '))
    if (decoded && isNaN(parseFloat(decoded))) name = decoded
  }

  return { name, lat, lng, googleMapsUrl: mapsLink(lat, lng) }
}

async function geocodePlace(name: string, apiKey: string | null): Promise<Location | null> {
  if (apiKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name)}&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      )
      const data = await res.json()
      if (data.status === 'OK' && data.results?.length) {
        const r = data.results[0]
        const lat = r.geometry.location.lat as number
        const lng = r.geometry.location.lng as number
        const shortName = r.address_components?.[0]?.long_name || r.formatted_address.split(',')[0].trim() || name
        return { name: shortName, lat, lng, googleMapsUrl: mapsLink(lat, lng) }
      }
    } catch { /* fall through to Nominatim */ }
  }

  // Fallback: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'CampMate/1.0 (home-assistant-addon)' }, signal: AbortSignal.timeout(5000) }
    )
    const results: { display_name: string; lat: string; lon: string }[] = await res.json()
    if (!results.length) return null
    const lat = parseFloat(results[0].lat), lng = parseFloat(results[0].lon)
    const shortName = results[0].display_name.split(',')[0].trim() || name
    return { name: shortName, lat, lng, googleMapsUrl: mapsLink(lat, lng) }
  } catch {
    return null
  }
}

function mapsLink(lat: number, lng: number) {
  return `https://www.google.com/maps/@${lat},${lng},15z`
}
