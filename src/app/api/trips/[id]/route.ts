import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import type { TripWithDetails } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result: TripWithDetails = {
    ...trip,
    itinerary:    db.itineraryDays.filter(d => d.tripId === id),
    packingItems: db.packingItems.filter(p => p.tripId === id),
    meals:        db.meals.filter(m => m.tripId === id),
    budgetItems:  db.budgetItems.filter(b => b.tripId === id),
    reminders:    db.reminders.filter(r => r.tripId === id),
    bookings:     (db.bookings ?? []).filter(b => b.tripId === id),
  }
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()
  const idx = db.trips.findIndex(t => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.trips[idx] = { ...db.trips[idx], ...body, id, updatedAt: new Date().toISOString() }
  writeDb(db)
  return NextResponse.json(db.trips[idx])
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  db.trips         = db.trips.filter(t => t.id !== id)
  db.itineraryDays = db.itineraryDays.filter(d => d.tripId !== id)
  db.packingItems  = db.packingItems.filter(p => p.tripId !== id)
  db.meals         = db.meals.filter(m => m.tripId !== id)
  db.budgetItems   = db.budgetItems.filter(b => b.tripId !== id)
  db.reminders     = db.reminders.filter(r => r.tripId !== id)
  db.bookings      = (db.bookings ?? []).filter(b => b.tripId !== id)
  writeDb(db)
  return new NextResponse(null, { status: 204 })
}
