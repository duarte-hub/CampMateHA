import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { generateItineraryFromWaypoints } from '@/lib/rules'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const waypoints = db.waypoints.filter(w => w.tripId === id)
  const active = waypoints.filter(w => w.nights > 0)
  if (active.length === 0) {
    return NextResponse.json({ error: 'Add at least one stop with 1+ nights before building the itinerary.' }, { status: 400 })
  }

  const newDays = generateItineraryFromWaypoints(trip, waypoints)

  // Preserve user-added activities and booking links by reusing the existing
  // day ID (and keeping its activities) whenever the date matches.
  const existing = db.itineraryDays.filter(d => d.tripId === id)
  const byDate = new Map(existing.map(d => [d.date, d]))

  const merged = newDays.map(day => {
    const prev = byDate.get(day.date)
    if (prev) {
      return {
        ...day,
        id:         prev.id,                                        // keep ID so bookings stay linked
        activities: prev.activities.length > 0 ? prev.activities : day.activities,
      }
    }
    return day
  })

  db.itineraryDays = db.itineraryDays.filter(d => d.tripId !== id)
  db.itineraryDays.push(...merged)
  writeDb(db)

  return NextResponse.json({ ok: true, days: merged.length })
}
