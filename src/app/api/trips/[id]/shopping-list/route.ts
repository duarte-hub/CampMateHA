import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { getPresetMeals } from '@/lib/meal-library'
import { randomUUID } from 'crypto'
import type { ShoppingItem, ShopCategory } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json((db.shoppingItems ?? []).filter(s => s.tripId === id))
}

// POST: build shopping list from selected meal IDs
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { mealIds } = await req.json() as { mealIds: string[] }

  const db = readDb()
  const allTemplates = [...getPresetMeals(), ...(db.mealTemplates ?? [])]
  const tripMeals = (db.meals ?? []).filter(m => m.tripId === id && mealIds.includes(m.id))

  const agg = new Map<string, { quantity: string; category: ShopCategory; mealRef: string }>()

  for (const meal of tripMeals) {
    const template = meal.templateId ? allTemplates.find(t => t.id === meal.templateId) : null
    const ingredients = template?.ingredients ?? []

    for (const ing of ingredients) {
      const key = ing.name.toLowerCase()
      if (agg.has(key)) {
        const existing = agg.get(key)!
        const existNum  = parseFloat(existing.quantity)
        const newNum    = parseFloat(ing.quantity)
        const existUnit = existing.quantity.replace(/[\d.]+\s*/, '').trim()
        const newUnit   = ing.quantity.replace(/[\d.]+\s*/, '').trim()
        if (!isNaN(existNum) && !isNaN(newNum) && existUnit === newUnit) {
          existing.quantity = `${existNum + newNum}${existUnit ? ' ' + existUnit : ''}`
        } else {
          existing.quantity = `${existing.quantity} + ${ing.quantity}`
        }
      } else {
        agg.set(key, { quantity: ing.quantity, category: ing.category, mealRef: meal.title })
      }
    }
  }

  db.shoppingItems = (db.shoppingItems ?? []).filter(s => s.tripId !== id)

  const newItems: ShoppingItem[] = Array.from(agg.entries()).map(([name, data]) => ({
    id: randomUUID(),
    tripId: id,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity: data.quantity,
    category: data.category,
    mealRef: data.mealRef,
    checked: false,
  }))

  db.shoppingItems = [...db.shoppingItems, ...newItems]
  writeDb(db)
  return NextResponse.json({ ok: true, items: newItems.length })
}
