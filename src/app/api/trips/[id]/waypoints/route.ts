import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import type { Waypoint } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json(db.waypoints.filter(w => w.tripId === id).sort((a, b) => a.order - b.order))
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()

  const waypoint: Waypoint = {
    id: crypto.randomUUID(),
    tripId: id,
    name: body.name || 'New Stop',
    lat: Number(body.lat),
    lng: Number(body.lng),
    type: body.type || 'custom',
    notes: body.notes || '',
    order: Number(body.order ?? db.waypoints.filter(w => w.tripId === id).length),
    googleMapsUrl: body.googleMapsUrl || '',
    nights: Number(body.nights ?? 1),
  }

  db.waypoints.push(waypoint)
  writeDb(db)
  return NextResponse.json(waypoint, { status: 201 })
}
