import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { Meal } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json((db.meals ?? []).filter(m => m.tripId === id))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()
  const meal: Meal = {
    id: randomUUID(),
    tripId: id,
    date: body.date,
    mealType: body.mealType,
    title: body.title,
    notes: body.notes ?? '',
    ingredients: body.ingredients ?? [],
    templateId: body.templateId,
    ingredientDetails: body.ingredientDetails,
  }
  db.meals = [...(db.meals ?? []), meal]
  writeDb(db)
  return NextResponse.json(meal, { status: 201 })
}
