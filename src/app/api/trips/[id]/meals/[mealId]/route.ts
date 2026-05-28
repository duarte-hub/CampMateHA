import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; mealId: string }> }) {
  const { id, mealId } = await params
  const db = readDb()
  db.meals = (db.meals ?? []).filter(m => !(m.tripId === id && m.id === mealId))
  writeDb(db)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; mealId: string }> }) {
  const { id, mealId } = await params
  const body = await req.json()
  const db = readDb()
  const meal = (db.meals ?? []).find(m => m.tripId === id && m.id === mealId)
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  Object.assign(meal, body)
  writeDb(db)
  return NextResponse.json(meal)
}
