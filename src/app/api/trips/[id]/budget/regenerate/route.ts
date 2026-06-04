import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { readDb, writeDb, readSettings } from '@/lib/db'
import { generateBudget } from '@/lib/rules'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const settings  = readSettings()
  const waypoints = db.waypoints.filter(w => w.tripId === id)

  db.budgetItems = db.budgetItems.filter(b => b.tripId !== id)
  db.budgetItems.push(...generateBudget(trip, settings, waypoints))
  writeDb(db)

  return NextResponse.json({ ok: true })
}
