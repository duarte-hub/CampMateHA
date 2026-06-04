import type { Waypoint } from './types'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function estimateRouteKm(
  waypoints: Waypoint[],
  home?: { lat: number; lng: number },
): Promise<number> {
  const sorted = [...waypoints].sort((a, b) => a.order - b.order).filter(w => w.lat && w.lng)
  const pts: { lat: number; lng: number }[] = []
  if (home) pts.push(home)
  pts.push(...sorted)
  if (home) pts.push(home)
  if (pts.length < 2) return 0

  const coords = pts.map(p => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&annotations=false`,
      { signal: AbortSignal.timeout(8000) },
    )
    const data = await res.json()
    if (data.code === 'Ok' && data.routes?.[0]) {
      return Math.round(data.routes[0].distance / 1000)
    }
  } catch { /* fall through */ }

  // Fallback: haversine × 1.35 road factor
  let km = 0
  for (let i = 0; i < pts.length - 1; i++) {
    km += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng)
  }
  return Math.round(km * 1.35)
}
