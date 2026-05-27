import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; waypointId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, waypointId } = await params
  const body = await req.json()
  const db = readDb()
  const idx = db.waypoints.findIndex(w => w.id === waypointId && w.tripId === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.waypoints[idx] = { ...db.waypoints[idx], ...body }
  writeDb(db)
  return NextResponse.json(db.waypoints[idx])
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, waypointId } = await params
  const db = readDb()
  db.waypoints = db.waypoints.filter(w => !(w.id === waypointId && w.tripId === id))
  // Re-order remaining
  const remaining = db.waypoints.filter(w => w.tripId === id).sort((a, b) => a.order - b.order)
  remaining.forEach((w, i) => { w.order = i })
  writeDb(db)
  return new NextResponse(null, { status: 204 })
}
