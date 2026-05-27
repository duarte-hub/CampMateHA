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

  db.itineraryDays = db.itineraryDays.filter(d => d.tripId !== id)
  db.itineraryDays.push(...generateItineraryFromWaypoints(trip, waypoints))
  writeDb(db)

  return NextResponse.json({ ok: true, days: db.itineraryDays.filter(d => d.tripId === id).length })
}
