import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, itemId } = await params
  const body = await req.json()
  const db = readDb()
  const idx = db.packingItems.findIndex(p => p.id === itemId && p.tripId === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.packingItems[idx] = { ...db.packingItems[idx], ...body }
  writeDb(db)
  return NextResponse.json(db.packingItems[idx])
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, itemId } = await params
  const db = readDb()
  db.packingItems = db.packingItems.filter(p => !(p.id === itemId && p.tripId === id))
  writeDb(db)
  return new NextResponse(null, { status: 204 })
}
