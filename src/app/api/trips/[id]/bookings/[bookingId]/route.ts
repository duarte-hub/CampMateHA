import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { randomUUID } from 'crypto'

type Ctx = { params: Promise<{ id: string; bookingId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, bookingId } = await params
  const body = await req.json()
  const db = readDb()

  const idx = (db.bookings ?? []).findIndex(b => b.id === bookingId && b.tripId === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existing = db.bookings[idx]
  const updated  = { ...existing, ...body }

  // Sync budget item when cost changes
  if ('cost' in body) {
    const newCost = Number(body.cost) || 0
    if (existing.budgetItemId) {
      const bidx = db.budgetItems.findIndex(b => b.id === existing.budgetItemId)
      if (bidx >= 0) {
        if (newCost > 0) {
          db.budgetItems[bidx].estimatedCost = newCost
          db.budgetItems[bidx].name = updated.name ?? existing.name
        } else {
          db.budgetItems = db.budgetItems.filter(b => b.id !== existing.budgetItemId)
          updated.budgetItemId = undefined
        }
      }
    } else if (newCost > 0) {
      const budgetItem = {
        id: randomUUID(), tripId: id,
        category: 'Bookings', name: updated.name ?? existing.name,
        estimatedCost: newCost,
      }
      db.budgetItems = [...db.budgetItems, budgetItem]
      updated.budgetItemId = budgetItem.id
    }
  }

  db.bookings[idx] = updated
  writeDb(db)
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id, bookingId } = await params
  const db = readDb()

  const booking = (db.bookings ?? []).find(b => b.id === bookingId && b.tripId === id)
  if (booking?.budgetItemId) {
    db.budgetItems = db.budgetItems.filter(b => b.id !== booking.budgetItemId)
  }
  db.bookings = (db.bookings ?? []).filter(b => !(b.id === bookingId && b.tripId === id))
  writeDb(db)
  return new NextResponse(null, { status: 204 })
}
