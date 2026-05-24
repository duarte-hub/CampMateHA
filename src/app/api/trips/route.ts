import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import type { Trip } from '@/lib/types'

export async function GET() {
  const db = readDb()
  return NextResponse.json(db.trips)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = readDb()

  const trip: Trip = {
    id: crypto.randomUUID(),
    title: body.title || body.destination,
    destination: body.destination,
    startDate: body.startDate,
    endDate: body.endDate,
    adults: Number(body.adults) || 2,
    kids: Number(body.kids) || 0,
    campingStyle: body.campingStyle || 'tent',
    vehicleType: body.vehicleType || '2wd',
    experienceLevel: body.experienceLevel || 'regular',
    activities: body.activities || [],
    notes: body.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.trips.push(trip)
  writeDb(db)
  return NextResponse.json(trip, { status: 201 })
}
