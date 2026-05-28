import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { getPresetMeals } from '@/lib/meal-library'
import { randomUUID } from 'crypto'
import type { MealTemplate } from '@/lib/types'

export async function GET() {
  const db = readDb()
  const custom: MealTemplate[] = (db.mealTemplates ?? []).map(t => ({ ...t, isCustom: true }))
  return NextResponse.json([...getPresetMeals(), ...custom])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = readDb()
  const template: MealTemplate = {
    id: randomUUID(),
    name: body.name,
    mealType: body.mealType,
    ingredients: body.ingredients ?? [],
    notes: body.notes ?? '',
    isCustom: true,
  }
  db.mealTemplates = [...(db.mealTemplates ?? []), template]
  writeDb(db)
  return NextResponse.json(template, { status: 201 })
}
