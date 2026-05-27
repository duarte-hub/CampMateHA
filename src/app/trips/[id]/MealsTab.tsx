'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { Meal, ShoppingItem, ShopCategory } from '@/lib/types'

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '🥪', dinner: '🍖', snack: '🍫' }

const CAT_LABELS: Record<ShopCategory, string> = {
  produce: '🥦 Produce',
  meat:    '🥩 Meat & Seafood',
  dairy:   '🧀 Dairy & Eggs',
  bakery:  '🍞 Bakery',
  pantry:  '🥫 Pantry',
  frozen:  '🧊 Frozen',
  drinks:  '🥤 Drinks',
  other:   '🧴 Other',
}
const CAT_ORDER: ShopCategory[] = ['produce','meat','dairy','bakery','pantry','frozen','drinks','other']

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

type ShopView = 'aisle' | 'meal' | 'flat'

interface Props { tripId: string; initialMeals: Meal[] }

export default function MealsTab({ tripId, initialMeals }: Props) {
  const [meals,         setMeals]         = useState<Meal[]>(initialMeals)
  const [shopItems,     setShopItems]     = useState<ShoppingItem[]>([])
  const [shopView,      setShopView]      = useState<ShopView>('aisle')
  const [generating,    setGenerating]    = useState(false)
  const [genMsg,        setGenMsg]        = useState('')
  const [expandedDay,   setExpandedDay]   = useState<string | null>(null)
  const [shopExpanded,  setShopExpanded]  = useState(true)

  const loadShopItems = useCallback(() => {
    fetch(`/api/trips/${tripId}/shopping-list`)
      .then(r => r.json()).then(setShopItems).catch(() => {})
  }, [tripId])

  useEffect(() => { loadShopItems() }, [loadShopItems])

  async function generate() {
    setGenerating(true)
    setGenMsg('')
    try {
      const res  = await fetch(`/api/trips/${tripId}/meals/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Generation failed')
      // Reload meals from the trip
      const tripRes = await fetch(`/api/trips/${tripId}`)
      const trip    = await tripRes.json()
      setMeals(trip.meals ?? [])
      loadShopItems()
      setGenMsg(`✓ ${data.meals} meals generated${data.source === 'claude' ? ' with AI' : ' from templates'}`)
      setTimeout(() => setGenMsg(''), 5000)
    } catch (e) {
      setGenMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  async function toggleShopItem(item: ShoppingItem) {
    const updated = { ...item, checked: !item.checked }
    setShopItems(prev => prev.map(s => s.id === item.id ? updated : s))
    await fetch(`/api/trips/${tripId}/shopping-list/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: updated.checked }),
    })
  }

  // Group meals by date
  const byDate = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    ;(acc[m.date] ??= []).push(m)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort()

  // Shopping list views
  const byAisle = CAT_ORDER.reduce<Record<ShopCategory, ShoppingItem[]>>((acc, c) => {
    acc[c] = shopItems.filter(s => s.category === c)
    return acc
  }, {} as Record<ShopCategory, ShoppingItem[]>)

  const byMeal = shopItems.reduce<Record<string, ShoppingItem[]>>((acc, s) => {
    const key = s.mealRef || 'General'
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})

  const flatItems = [...shopItems].sort((a, b) => a.name.localeCompare(b.name))

  const checkedCount = shopItems.filter(s => s.checked).length

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">
            {meals.length > 0 ? `${meals.length} meals planned` : 'No meal plan yet'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">
            {meals.length > 0 ? 'Regenerate to refresh the plan' : 'Generate a day-by-day meal plan with shopping list'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {genMsg && <p className={`text-xs ${genMsg.startsWith('✓') ? 'text-forest-700' : 'text-red-600'}`}>{genMsg}</p>}
          <button onClick={generate} disabled={generating}
            className="btn-primary text-sm whitespace-nowrap disabled:opacity-50">
            {generating ? '⏳ Generating…' : meals.length > 0 ? '🔄 Regenerate' : '🤖 Generate Plan'}
          </button>
        </div>
      </div>

      {meals.length === 0 && (
        <div className="card p-8 text-center space-y-2">
          <p className="text-4xl">🍳</p>
          <p className="text-stone-600 font-medium">No meal plan yet</p>
          <p className="text-sm text-stone-400">Click "Generate Plan" to create a day-by-day meal plan with a full shopping list.</p>
          <p className="text-xs text-stone-400 mt-2">
            Add an Anthropic API key in <Link href="/settings" className="text-forest-600 hover:underline">Settings</Link> for AI-powered personalised meals,
            or use smart templates (no key needed).
          </p>
        </div>
      )}

      {/* Shopping List */}
      {shopItems.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShopExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200 hover:bg-stone-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-stone-800">🛒 Shopping List</span>
              <span className="text-xs text-stone-400">{checkedCount}/{shopItems.length} ticked</span>
            </div>
            <span className="text-stone-400 text-xs">{shopExpanded ? '▲' : '▼'}</span>
          </button>

          {shopExpanded && (
            <>
              {/* View toggle */}
              <div className="flex border-b border-stone-200">
                {(['aisle', 'meal', 'flat'] as ShopView[]).map(v => (
                  <button key={v} onClick={() => setShopView(v)}
                    className={`flex-1 py-2 text-xs font-semibold transition-colors capitalize
                      ${shopView === v ? 'bg-forest-50 text-forest-700 border-b-2 border-forest-600' : 'text-stone-500 hover:text-stone-700'}`}>
                    {v === 'aisle' ? '🏪 By Aisle' : v === 'meal' ? '🍽️ By Meal' : '📋 Flat List'}
                  </button>
                ))}
              </div>

              <div className="p-3 max-h-96 overflow-y-auto">
                {/* By Aisle */}
                {shopView === 'aisle' && (
                  <div className="space-y-3">
                    {CAT_ORDER.filter(c => byAisle[c].length > 0).map(cat => (
                      <div key={cat}>
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">{CAT_LABELS[cat]}</p>
                        <div className="space-y-0.5">
                          {byAisle[cat].map(item => <ShopRow key={item.id} item={item} onToggle={toggleShopItem} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* By Meal */}
                {shopView === 'meal' && (
                  <div className="space-y-3">
                    {Object.entries(byMeal).sort(([a],[b]) => a.localeCompare(b)).map(([meal, items]) => (
                      <div key={meal}>
                        <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 truncate">{meal}</p>
                        <div className="space-y-0.5">
                          {items.map(item => <ShopRow key={item.id} item={item} onToggle={toggleShopItem} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Flat */}
                {shopView === 'flat' && (
                  <div className="space-y-0.5">
                    {flatItems.map(item => <ShopRow key={item.id} item={item} onToggle={toggleShopItem} />)}
                  </div>
                )}
              </div>

              {checkedCount > 0 && (
                <div className="px-4 py-2 border-t border-stone-100 bg-stone-50">
                  <p className="text-xs text-stone-400">{checkedCount} of {shopItems.length} items ticked off</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Day-by-day meals */}
      {sortedDates.map(date => {
        const dayMeals = byDate[date].sort((a, b) => (MEAL_ORDER[a.mealType]??4) - (MEAL_ORDER[b.mealType]??4))
        const isExpanded = expandedDay === date
        return (
          <div key={date} className="card overflow-hidden">
            <button
              onClick={() => setExpandedDay(isExpanded ? null : date)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100 hover:bg-stone-100 transition-colors"
            >
              <h4 className="font-semibold text-sm text-stone-700">{fmtDate(date)}</h4>
              <div className="flex items-center gap-1.5">
                {dayMeals.map(m => (
                  <span key={m.id} title={m.title} className="text-base leading-none">{MEAL_ICONS[m.mealType]}</span>
                ))}
                <span className="text-stone-400 text-xs ml-1">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </button>

            <div className="divide-y divide-stone-50">
              {dayMeals.map(meal => (
                <div key={meal.id} className="px-4 py-2.5">
                  <div className="flex gap-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-stone-400 w-16 pt-0.5 shrink-0">
                      {meal.mealType}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">{meal.title}</p>
                      {meal.notes && <p className="text-xs text-stone-400 mt-0.5">{meal.notes}</p>}
                      {isExpanded && meal.ingredients && meal.ingredients.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {meal.ingredients.map((ing, i) => (
                            <span key={i} className="text-xs bg-stone-100 text-stone-500 rounded px-1.5 py-0.5">{ing}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShopRow({ item, onToggle }: { item: ShoppingItem; onToggle: (i: ShoppingItem) => void }) {
  return (
    <label className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-stone-50 cursor-pointer group">
      <input type="checkbox" checked={item.checked} onChange={() => onToggle(item)}
        className="rounded border-stone-300 text-forest-600 shrink-0" />
      <span className={`text-sm flex-1 ${item.checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>
        {item.name}
      </span>
      {item.quantity && (
        <span className="text-xs text-stone-400 shrink-0">{item.quantity}</span>
      )}
    </label>
  )
}
