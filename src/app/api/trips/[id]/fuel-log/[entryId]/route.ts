import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; entryId: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, entryId } = await params
  const db = readDb()
  db.fuelLog = (db.fuelLog ?? []).filter(e => !(e.id === entryId && e.tripId === id))
  writeDb(db)
  return new NextResponse(null, { status: 204 })
}
