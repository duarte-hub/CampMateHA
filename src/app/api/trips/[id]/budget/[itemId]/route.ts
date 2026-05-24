import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

type Ctx = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id, itemId } = await params
  const body = await req.json()
  const db = readDb()
  const idx = db.budgetItems.findIndex(b => b.id === itemId && b.tripId === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  db.budgetItems[idx] = { ...db.budgetItems[idx], ...body }
  writeDb(db)
  return NextResponse.json(db.budgetItems[idx])
}
