import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  const body = await req.json()
  const db   = readDb()
  const item = (db.shoppingItems ?? []).find(s => s.tripId === id && s.id === itemId)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ('checked' in body) item.checked = Boolean(body.checked)
  writeDb(db)
  return NextResponse.json(item)
}
