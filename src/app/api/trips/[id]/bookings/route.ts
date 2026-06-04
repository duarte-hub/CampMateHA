import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { Booking, BudgetItem } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json((db.bookings ?? []).filter(b => b.tripId === id))
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()

  const booking: Booking = {
    id:      randomUUID(),
    tripId:  id,
    dayId:   body.dayId ?? undefined,
    date:    body.date,
    name:    body.name,
    type:    body.type ?? 'attraction',
    cost:    Number(body.cost) || 0,
    booked:  body.booked ?? false,
    url:     body.url?.trim() || undefined,
    notes:   body.notes?.trim() || undefined,
  }

  // Create a linked budget item when cost > 0
  if (booking.cost > 0) {
    const budgetItem: BudgetItem = {
      id:            randomUUID(),
      tripId:        id,
      category:      'Bookings',
      name:          booking.name,
      estimatedCost: booking.cost,
    }
    db.budgetItems = [...db.budgetItems, budgetItem]
    booking.budgetItemId = budgetItem.id
  }

  db.bookings = [...(db.bookings ?? []), booking]
  writeDb(db)
  return NextResponse.json(booking, { status: 201 })
}
