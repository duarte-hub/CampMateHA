import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; dayId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, dayId } = await params
  const body = await req.json()
  const db = readDb()
  const idx = db.itineraryDays.findIndex(d => d.tripId === id && d.id === dayId)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.itineraryDays[idx] = { ...db.itineraryDays[idx], ...body }
  writeDb(db)
  return NextResponse.json(db.itineraryDays[idx])
}
