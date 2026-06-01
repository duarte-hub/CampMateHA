import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb, readSettings } from '@/lib/db'
import {
  generatePackingList,
  generateItinerary,
  generateMeals,
  generateBudget,
  generateReminders,
} from '@/lib/rules'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Remove any existing generated content
  db.itineraryDays = db.itineraryDays.filter(d => d.tripId !== id)
  db.packingItems = db.packingItems.filter(p => p.tripId !== id)
  db.meals = db.meals.filter(m => m.tripId !== id)
  db.budgetItems = db.budgetItems.filter(b => b.tripId !== id)
  db.reminders = db.reminders.filter(r => r.tripId !== id)

  const settings  = readSettings()
  const waypoints = db.waypoints.filter(w => w.tripId === id)

  // Generate and insert
  db.itineraryDays.push(...generateItinerary(trip))
  db.packingItems.push(...generatePackingList(trip))
  db.meals.push(...generateMeals(trip))
  db.budgetItems.push(...generateBudget(trip, settings, waypoints))
  db.reminders.push(...generateReminders(trip))

  writeDb(db)
  return NextResponse.json({ ok: true })
}
