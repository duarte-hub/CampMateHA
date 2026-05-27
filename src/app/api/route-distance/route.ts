import { NextRequest, NextResponse } from 'next/server'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// coords = "lng1,lat1;lng2,lat2;..." (OSRM order)
export async function GET(req: NextRequest) {
  const coords = req.nextUrl.searchParams.get('coords')
  if (!coords) return NextResponse.json({ error: 'coords required' }, { status: 400 })

  const points = coords.split(';').map(p => {
    const [lng, lat] = p.split(',').map(Number)
    return { lat, lng }
  })

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&annotations=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()

    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('OSRM no route')

    const legs: { distance: number }[] = data.routes[0].legs
    const segments = legs.map((leg, i) => {
      const roadKm = Math.round(leg.distance / 1000)
      // Sanity check: road shouldn't be >4× straight-line; fall back if so
      const straight = haversineKm(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng)
      return roadKm > 0 && roadKm < straight * 5 ? roadKm : Math.round(straight * 1.35)
    })

    return NextResponse.json({
      segments,
      total: segments.reduce((s, d) => s + d, 0),
      source: 'osrm',
    })
  } catch {
    // Fall back to Haversine × 1.35 if OSRM unavailable
    const segments = points.slice(1).map((p, i) =>
      Math.round(haversineKm(points[i].lat, points[i].lng, p.lat, p.lng) * 1.35)
    )
    return NextResponse.json({
      segments,
      total: segments.reduce((s, d) => s + d, 0),
      source: 'estimate',
    })
  }
}
