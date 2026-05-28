'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Meal, MealTemplate, MealType, ShoppingItem, ShopCategory } from '@/lib/types'

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch',     label: 'Lunch',     icon: '🥪' },
  { value: 'dinner',    label: 'Dinner',    icon: '🍖' },
  { value: 'snack',     label: 'Snack',     icon: '🍫' },
]

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

function tripDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const d = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

// ── Meal Picker Modal ────────────────────────────────────────────────────────

interface PickerProps {
  templates: MealTemplate[]
  onPick: (t: MealTemplate) => void
  onCustom: (name: string, mealType: MealType, notes: string) => void
  defaultType: MealType
  onClose: () => void
}

function MealPicker({ templates, onPick, onCustom, defaultType, onClose }: PickerProps) {
  const [filter,  setFilter]  = useState<MealType | 'all'>(defaultType)
  const [search,  setSearch]  = useState('')
  const [custom,  setCustom]  = useState(false)
  const [cName,   setCName]   = useState('')
  const [cType,   setCType]   = useState<MealType>(defaultType)
  const [cNotes,  setCNotes]  = useState('')

  const visible = templates.filter(t => {
    const matchType = filter === 'all' || t.mealType === filter
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h3 className="font-bold text-stone-800">Pick a meal</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
        </div>

        {!custom ? (
          <>
            {/* Search */}
            <div className="px-4 pt-3">
              <input
                className="w-full input text-sm"
                placeholder="Search meals…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Category filter */}
            <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide">
              {(['all', ...MEAL_TYPES.map(t => t.value)] as (MealType | 'all')[]).map(v => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${filter === v ? 'bg-forest-600 text-white border-forest-600' : 'border-stone-300 text-stone-600 hover:border-forest-400'}`}>
                  {v === 'all' ? 'All' : MEAL_TYPES.find(t => t.value === v)!.icon + ' ' + MEAL_TYPES.find(t => t.value === v)!.label}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1">
              {visible.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-6">No meals found</p>
              )}
              {visible.map(t => (
                <button key={t.id} onClick={() => onPick(t)}
                  className="w-full text-left p-3 rounded-xl hover:bg-forest-50 border border-transparent hover:border-forest-200 transition-all group">
                  <div className="flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{MEAL_TYPES.find(m => m.value === t.mealType)?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 group-hover:text-forest-700">{t.name}</p>
                      {t.notes && <p className="text-xs text-stone-400 mt-0.5">{t.notes}</p>}
                      {t.ingredients.length > 0 && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate">
                          {t.ingredients.map(i => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                    {t.isCustom && <span className="text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 shrink-0">custom</span>}
                  </div>
                </button>
              ))}
            </div>

            {/* Add custom */}
            <div className="px-4 py-3 border-t border-stone-100">
              <button onClick={() => setCustom(true)}
                className="w-full text-sm text-forest-700 font-semibold hover:underline text-center">
                + Create custom meal
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div>
              <label className="label">Meal name</label>
              <input className="input text-sm w-full" placeholder="e.g. Campfire damper" value={cName}
                onChange={e => setCName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input text-sm w-full" value={cType} onChange={e => setCType(e.target.value as MealType)}>
                {MEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input text-sm w-full" placeholder="e.g. Needs camp oven" value={cNotes}
                onChange={e => setCNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setCustom(false)} className="flex-1 btn-secondary text-sm justify-center">Back</button>
              <button onClick={() => { if (cName.trim()) onCustom(cName.trim(), cType, cNotes) }}
                disabled={!cName.trim()}
                className="flex-1 btn-primary text-sm justify-center disabled:opacity-40">Add meal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props { tripId: string; initialMeals: Meal[] }

export default function MealsTab({ tripId, initialMeals }: Props) {
  const [tab,        setTab]        = useState<'plan' | 'shop'>('plan')
  const [meals,      setMeals]      = useState<Meal[]>(initialMeals)
  const [templates,  setTemplates]  = useState<MealTemplate[]>([])
  const [shopItems,  setShopItems]  = useState<ShoppingItem[]>([])
  const [dates,      setDates]      = useState<string[]>([])
  const [picker,     setPicker]     = useState<{ date: string; mealType: MealType } | null>(null)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [building,   setBuilding]   = useState(false)
  const [buildMsg,   setBuildMsg]   = useState('')

  // Load trip dates + templates + shopping items
  useEffect(() => {
    fetch(`/api/trips/${tripId}`)
      .then(r => r.json())
      .then(t => setDates(tripDates(t.startDate, t.endDate)))
  }, [tripId])

  useEffect(() => {
    fetch('/api/meal-library').then(r => r.json()).then(setTemplates)
  }, [])

  const loadShopItems = useCallback(() => {
    fetch(`/api/trips/${tripId}/shopping-list`).then(r => r.json()).then(setShopItems)
  }, [tripId])

  useEffect(() => { loadShopItems() }, [loadShopItems])

  // Pre-select all meals for shopping when meals change
  useEffect(() => {
    setSelected(new Set(meals.map(m => m.id)))
  }, [meals])

  async function addMeal(date: string, mealType: MealType, template: MealTemplate) {
    const res = await fetch(`/api/trips/${tripId}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date, mealType, title: template.name,
        ingredients: template.ingredients.map(i => i.name),
        templateId: template.id,
        notes: template.notes ?? '',
      }),
    })
    const meal: Meal = await res.json()
    setMeals(prev => [...prev, meal])
    setPicker(null)
  }

  async function addCustomMeal(date: string, mealType: MealType, name: string, notes: string) {
    const res = await fetch(`/api/trips/${tripId}/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, mealType, title: name, notes }),
    })
    const meal: Meal = await res.json()
    setMeals(prev => [...prev, meal])
    setPicker(null)
  }

  async function removeMeal(mealId: string) {
    await fetch(`/api/trips/${tripId}/meals/${mealId}`, { method: 'DELETE' })
    setMeals(prev => prev.filter(m => m.id !== mealId))
  }

  async function buildList() {
    if (selected.size === 0) return
    setBuilding(true); setBuildMsg('')
    try {
      const res = await fetch(`/api/trips/${tripId}/shopping-list/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealIds: Array.from(selected) }),
      })
      const data = await res.json()
      loadShopItems()
      setBuildMsg(`✓ ${data.items} items added`)
      setTab('shop')
      setTimeout(() => setBuildMsg(''), 4000)
    } catch { setBuildMsg('Failed to build list') }
    finally { setBuilding(false) }
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

  // Meals by date+type lookup
  const mealMap = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    const key = `${m.date}__${m.mealType}`
    ;(acc[key] ??= []).push(m)
    return acc
  }, {})

  const checkedCount = shopItems.filter(s => s.checked).length

  const byAisle = CAT_ORDER.reduce<Record<ShopCategory, ShoppingItem[]>>((acc, c) => {
    acc[c] = shopItems.filter(s => s.category === c)
    return acc
  }, {} as Record<ShopCategory, ShoppingItem[]>)

  return (
    <div className="space-y-3">
      {/* Tab toggle */}
      <div className="flex rounded-xl overflow-hidden border border-stone-200 bg-stone-100 p-0.5">
        {(['plan', 'shop'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            {t === 'plan' ? '📋 Meal Plan' : `🛒 Shopping List${shopItems.length > 0 ? ` (${shopItems.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* ── Plan tab ──────────────────────────────────────────────────────── */}
      {tab === 'plan' && (
        <div className="space-y-3">
          {dates.length === 0 ? (
            <div className="card p-8 text-center text-stone-400">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">Set trip start and end dates to plan meals.</p>
            </div>
          ) : (
            <>
              {dates.map(date => (
                <div key={date} className="card overflow-hidden">
                  <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                    <h4 className="font-semibold text-sm text-stone-700">{fmtDate(date)}</h4>
                  </div>
                  <div className="divide-y divide-stone-50">
                    {MEAL_TYPES.map(({ value, label, icon }) => {
                      const slot = mealMap[`${date}__${value}`] ?? []
                      return (
                        <div key={value} className="flex items-start gap-3 px-4 py-2.5 min-h-[44px]">
                          <span className="text-base shrink-0 w-6 text-center mt-0.5">{icon}</span>
                          <div className="flex-1 min-w-0">
                            {slot.length === 0 ? (
                              <button onClick={() => setPicker({ date, mealType: value })}
                                className="text-xs text-stone-400 hover:text-forest-600 font-medium hover:underline">
                                + Add {label.toLowerCase()}
                              </button>
                            ) : (
                              <div className="space-y-1">
                                {slot.map(m => (
                                  <div key={m.id} className="flex items-center gap-2 group">
                                    <span className="text-sm text-stone-700 font-medium flex-1 truncate">{m.title}</span>
                                    <button onClick={() => removeMeal(m.id)}
                                      className="text-xs text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0">✕</button>
                                  </div>
                                ))}
                                <button onClick={() => setPicker({ date, mealType: value })}
                                  className="text-xs text-stone-400 hover:text-forest-600 hover:underline">+ add another</button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Build shopping list CTA */}
              <div className="card p-4 space-y-3">
                <p className="text-sm font-semibold text-stone-700">
                  {meals.length} meals planned · {selected.size} selected for shopping
                </p>
                {buildMsg && (
                  <p className={`text-xs rounded p-2 ${buildMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{buildMsg}</p>
                )}
                <button onClick={buildList} disabled={building || selected.size === 0}
                  className="btn-primary w-full justify-center text-sm disabled:opacity-40">
                  {building ? '⏳ Building…' : '🛒 Build Shopping List'}
                </button>
                <p className="text-xs text-stone-400 text-center">
                  Switch to Shopping List tab to choose which meals to include
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Shop tab ──────────────────────────────────────────────────────── */}
      {tab === 'shop' && (
        <div className="space-y-3">
          {/* Meal selector */}
          {meals.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <p className="text-sm font-bold text-stone-700">Select meals to shop for</p>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelected(new Set(meals.map(m => m.id)))} className="text-forest-600 hover:underline font-semibold">All</button>
                  <span className="text-stone-300">|</span>
                  <button onClick={() => setSelected(new Set())} className="text-stone-500 hover:underline">None</button>
                </div>
              </div>
              <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto">
                {dates.flatMap(date => {
                  const dayMeals = meals.filter(m => m.date === date)
                    .sort((a, b) => {
                      const order: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 }
                      return (order[a.mealType] ?? 4) - (order[b.mealType] ?? 4)
                    })
                  if (dayMeals.length === 0) return []
                  return [
                    <div key={`hd-${date}`} className="px-4 py-1 bg-stone-50">
                      <p className="text-xs font-semibold text-stone-500">{fmtDate(date)}</p>
                    </div>,
                    ...dayMeals.map(m => {
                      const mt = MEAL_TYPES.find(t => t.value === m.mealType)
                      return (
                        <label key={m.id} className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 cursor-pointer">
                          <input type="checkbox" checked={selected.has(m.id)}
                            onChange={() => setSelected(prev => {
                              const n = new Set(prev)
                              n.has(m.id) ? n.delete(m.id) : n.add(m.id)
                              return n
                            })}
                            className="rounded border-stone-300 text-forest-600" />
                          <span className="text-sm shrink-0">{mt?.icon}</span>
                          <span className="text-sm text-stone-700">{m.title}</span>
                        </label>
                      )
                    }),
                  ]
                })}
              </div>
              <div className="px-4 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                <p className="text-xs text-stone-500">{selected.size} of {meals.length} meals selected</p>
                {buildMsg && <p className={`text-xs ${buildMsg.startsWith('✓') ? 'text-green-700' : 'text-red-600'}`}>{buildMsg}</p>}
                <button onClick={buildList} disabled={building || selected.size === 0}
                  className="btn-primary text-sm disabled:opacity-40">
                  {building ? 'Building…' : '🛒 Build list'}
                </button>
              </div>
            </div>
          )}

          {/* Shopping list */}
          {shopItems.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <p className="text-sm font-bold text-stone-700">🛒 Shopping List</p>
                <p className="text-xs text-stone-400">{checkedCount}/{shopItems.length} ticked</p>
              </div>
              <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
                {CAT_ORDER.filter(c => byAisle[c].length > 0).map(cat => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">{CAT_LABELS[cat]}</p>
                    <div className="space-y-0.5">
                      {byAisle[cat].map(item => (
                        <label key={item.id} className="flex items-center gap-2.5 px-2 py-1 rounded hover:bg-stone-50 cursor-pointer">
                          <input type="checkbox" checked={item.checked} onChange={() => toggleShopItem(item)}
                            className="rounded border-stone-300 text-forest-600 shrink-0" />
                          <span className={`text-sm flex-1 ${item.checked ? 'line-through text-stone-300' : 'text-stone-700'}`}>
                            {item.name}
                          </span>
                          {item.quantity && <span className="text-xs text-stone-400 shrink-0">{item.quantity}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : meals.length === 0 ? (
            <div className="card p-8 text-center space-y-2">
              <p className="text-3xl">🛒</p>
              <p className="text-stone-600 font-medium">No meals planned yet</p>
              <p className="text-sm text-stone-400">Switch to Meal Plan tab to add meals to your trip.</p>
            </div>
          ) : (
            <div className="card p-8 text-center space-y-2">
              <p className="text-3xl">🛒</p>
              <p className="text-stone-600 font-medium">Shopping list not built yet</p>
              <p className="text-sm text-stone-400">Select meals above and click Build list.</p>
            </div>
          )}
        </div>
      )}

      {/* Meal picker modal */}
      {picker && (
        <MealPicker
          templates={templates}
          defaultType={picker.mealType}
          onPick={t => addMeal(picker.date, picker.mealType, t)}
          onCustom={(name, type, notes) => addCustomMeal(picker.date, picker.mealType, name, notes)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}
