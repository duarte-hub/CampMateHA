import { NextResponse } from 'next/server'
import { readDb } from '@/lib/db'
import type { Waypoint } from '@/lib/types'

function haversineKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

async function getRoadSegments(waypoints: Waypoint[]): Promise<number[]> {
  if (waypoints.length < 2) return []
  const coords = waypoints.map(w => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(';')
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&annotations=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('no route')
    return data.routes[0].legs.map((leg: {distance:number}, i: number) => {
      const roadKm = Math.round(leg.distance / 1000)
      const straight = haversineKm(waypoints[i], waypoints[i+1])
      return roadKm > 0 && roadKm < straight * 5 ? roadKm : Math.round(straight * 1.35)
    })
  } catch {
    return waypoints.slice(1).map((w, i) => Math.round(haversineKm(waypoints[i], w) * 1.35))
  }
}

export async function GET() {
  const db = readDb()

  const waypointsByTrip: Record<string, Waypoint[]> = {}
  for (const wp of db.waypoints) {
    if (!waypointsByTrip[wp.tripId]) waypointsByTrip[wp.tripId] = []
    waypointsByTrip[wp.tripId].push(wp)
  }

  // Fetch road distances for each trip's waypoints in parallel
  const roadDistByTrip: Record<string, number[]> = {}
  await Promise.all(
    Object.entries(waypointsByTrip).map(async ([tripId, wps]) => {
      const sorted = [...wps].sort((a,b) => a.order - b.order)
      if (sorted.length >= 2) {
        roadDistByTrip[tripId] = await getRoadSegments(sorted)
      }
    })
  )

  return NextResponse.json({
    trips: db.trips,
    itineraryDays: db.itineraryDays,
    waypointsByTrip,
    roadDistByTrip,
  })
}
