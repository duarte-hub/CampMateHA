'use client'

import { useState, useEffect } from 'react'
import type { MealTemplate, MealType, MealIngredient, ShopCategory } from '@/lib/types'

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch',     label: 'Lunch',     icon: '🥪' },
  { value: 'dinner',    label: 'Dinner',    icon: '🍖' },
  { value: 'snack',     label: 'Snack',     icon: '🍫' },
]

const SHOP_CATS: ShopCategory[] = ['produce','meat','dairy','bakery','pantry','frozen','drinks','other']

const EMPTY_MEAL = { name: '', mealType: 'dinner' as MealType, notes: '', ingredients: [] as MealIngredient[] }

function mealTypeIcon(v: MealType) { return MEAL_TYPES.find(t => t.value === v)?.icon ?? '🍽' }
function mealTypeLabel(v: MealType) { return MEAL_TYPES.find(t => t.value === v)?.label ?? v }

// ── Inline ingredient editor ─────────────────────────────────────────────────

function IngEditor({
  ingredients, onChange,
}: { ingredients: MealIngredient[]; onChange: (v: MealIngredient[]) => void }) {
  function update(i: number, field: string, val: string) {
    onChange(ingredients.map((ing, idx) => idx === i ? { ...ing, [field]: val } : ing))
  }
  return (
    <div className="space-y-1.5 mt-2">
      {ingredients.map((ing, i) => (
        <div key={i} className="flex gap-1.5 items-center">
          <input className="input text-xs flex-[2] py-1 min-w-0" placeholder="Ingredient"
            value={ing.name} onChange={e => update(i, 'name', e.target.value)} />
          <input className="input text-xs w-16 py-1 shrink-0" placeholder="Qty"
            value={ing.quantity} onChange={e => update(i, 'quantity', e.target.value)} />
          <select className="input text-xs w-24 py-1 shrink-0" value={ing.category}
            onChange={e => update(i, 'category', e.target.value as ShopCategory)}>
            {SHOP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => onChange(ingredients.filter((_, idx) => idx !== i))}
            className="text-stone-400 hover:text-red-500 shrink-0 text-sm">✕</button>
        </div>
      ))}
      <button onClick={() => onChange([...ingredients, { name: '', quantity: '', category: 'pantry' }])}
        className="text-xs text-forest-700 dark:text-forest-400 font-semibold hover:underline">
        + Add ingredient
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MealLibraryPage() {
  const [templates, setTemplates]     = useState<MealTemplate[]>([])
  const [search,    setSearch]        = useState('')
  const [filter,    setFilter]        = useState<MealType | 'all'>('all')
  const [expanded,  setExpanded]      = useState<Set<string>>(new Set())
  const [editing,   setEditing]       = useState<string | null>(null)
  const [draft,     setDraft]         = useState<{ name: string; mealType: MealType; notes: string; ingredients: MealIngredient[] }>(EMPTY_MEAL)
  const [creating,  setCreating]      = useState(false)
  const [newMeal,   setNewMeal]       = useState({ ...EMPTY_MEAL })
  const [saving,    setSaving]        = useState(false)

  useEffect(() => {
    fetch('/api/meal-library').then(r => r.json()).then(setTemplates)
  }, [])

  const presets = templates.filter(t => !t.isCustom)
  const custom  = templates.filter(t => t.isCustom)

  function matches(t: MealTemplate) {
    const typeOk = filter === 'all' || t.mealType === filter
    const searchOk = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.ingredients.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
    return typeOk && searchOk
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function startEdit(t: MealTemplate) {
    setDraft({ name: t.name, mealType: t.mealType, notes: t.notes ?? '', ingredients: t.ingredients.map(i => ({ ...i })) })
    setEditing(t.id)
    setExpanded(prev => new Set([...prev, t.id]))
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await fetch(`/api/meal-library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...draft } : t))
    setEditing(null)
    setSaving(false)
  }

  async function deleteCustom(id: string) {
    await fetch(`/api/meal-library/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  async function copyPreset(t: MealTemplate) {
    const body = { name: t.name + ' (copy)', mealType: t.mealType, notes: t.notes ?? '', ingredients: t.ingredients }
    const res = await fetch('/api/meal-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const created: MealTemplate = await res.json()
    setTemplates(prev => [...prev, created])
    setEditing(created.id)
    setDraft({ name: created.name, mealType: created.mealType, notes: created.notes ?? '', ingredients: created.ingredients.map(i => ({ ...i })) })
    setExpanded(prev => new Set([...prev, created.id]))
  }

  async function createMeal() {
    if (!newMeal.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/meal-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMeal),
    })
    const created: MealTemplate = await res.json()
    setTemplates(prev => [...prev, created])
    setCreating(false)
    setNewMeal({ ...EMPTY_MEAL })
    setSaving(false)
  }

  const filteredPresets = presets.filter(matches)
  const filteredCustom  = custom.filter(matches)

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Meal Library</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {presets.length} presets · {custom.length} custom meal{custom.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => { setCreating(true); setNewMeal({ ...EMPTY_MEAL }) }}
          className="btn-primary shrink-0">+ New meal</button>
      </div>

      {/* Search + filter */}
      <div className="space-y-2">
        <input className="input" placeholder="Search meals or ingredients…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {(['all', ...MEAL_TYPES.map(t => t.value)] as (MealType | 'all')[]).map(v => (
            <button key={v} onClick={() => setFilter(v)}
              className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold border transition-colors ${
                filter === v
                  ? 'bg-forest-600 text-white border-forest-600'
                  : 'border-stone-300 text-stone-600 dark:border-stone-600 dark:text-stone-300 hover:border-forest-400 dark:hover:border-forest-600'
              }`}>
              {v === 'all' ? 'All' : MEAL_TYPES.find(t => t.value === v)!.icon + ' ' + MEAL_TYPES.find(t => t.value === v)!.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create new meal form */}
      {creating && (
        <div className="card p-4 space-y-3 border-2 border-forest-200 dark:border-forest-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-800 dark:text-stone-100">New Meal</h3>
            <button onClick={() => setCreating(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="label">Meal name</label>
              <input className="input" placeholder="e.g. Campfire Damper" value={newMeal.name}
                onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={newMeal.mealType}
                onChange={e => setNewMeal(p => ({ ...p, mealType: e.target.value as MealType }))}>
                {MEAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="e.g. Needs camp oven" value={newMeal.notes}
                onChange={e => setNewMeal(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div>
            <p className="label">Ingredients</p>
            <IngEditor ingredients={newMeal.ingredients} onChange={v => setNewMeal(p => ({ ...p, ingredients: v }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setCreating(false)} className="flex-1 btn-secondary text-sm justify-center">Cancel</button>
            <button onClick={createMeal} disabled={saving || !newMeal.name.trim()}
              className="flex-1 btn-primary text-sm justify-center disabled:opacity-40">
              {saving ? 'Saving…' : 'Save meal'}
            </button>
          </div>
        </div>
      )}

      {/* Custom meals */}
      {(filteredCustom.length > 0 || (custom.length > 0 && filteredCustom.length === 0 && search)) && (
        <section>
          <h2 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">
            My Meals {filteredCustom.length > 0 ? `(${filteredCustom.length})` : '— no matches'}
          </h2>
          <div className="space-y-2">
            {filteredCustom.map(t => (
              <div key={t.id} className="card overflow-hidden border-l-4 border-l-amber-400 dark:border-l-amber-500">
                {editing === t.id ? (
                  /* Edit mode */
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="label">Meal name</label>
                        <input className="input" value={draft.name}
                          onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} autoFocus />
                      </div>
                      <div>
                        <label className="label">Type</label>
                        <select className="input" value={draft.mealType}
                          onChange={e => setDraft(p => ({ ...p, mealType: e.target.value as MealType }))}>
                          {MEAL_TYPES.map(m => <option key={m.value} value={m.value}>{m.icon} {m.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Notes</label>
                        <input className="input" placeholder="Optional" value={draft.notes}
                          onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <p className="label">Ingredients</p>
                      <IngEditor ingredients={draft.ingredients} onChange={v => setDraft(p => ({ ...p, ingredients: v }))} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(null)} className="flex-1 btn-secondary text-sm justify-center">Cancel</button>
                      <button onClick={() => saveEdit(t.id)} disabled={saving}
                        className="flex-1 btn-primary text-sm justify-center disabled:opacity-40">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div>
                    <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                      onClick={() => toggleExpand(t.id)}>
                      <span className="text-lg shrink-0">{mealTypeIcon(t.mealType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 truncate">{t.name}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">
                          {mealTypeLabel(t.mealType)}
                          {t.notes ? ` · ${t.notes}` : ''}
                          {t.ingredients.length > 0 ? ` · ${t.ingredients.length} ingredient${t.ingredients.length !== 1 ? 's' : ''}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={e => { e.stopPropagation(); startEdit(t) }}
                          className="text-xs px-2 py-1 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-forest-400 hover:text-forest-600 dark:hover:text-forest-400 transition-colors">
                          ✎ Edit
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteCustom(t.id) }}
                          className="text-xs px-2 py-1 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-red-400 hover:text-red-500 transition-colors">
                          ✕
                        </button>
                        <span className="text-stone-300 dark:text-stone-600 text-sm">{expanded.has(t.id) ? '▲' : '▼'}</span>
                      </div>
                    </button>
                    {expanded.has(t.id) && t.ingredients.length > 0 && (
                      <div className="px-4 pb-3 border-t border-stone-100 dark:border-stone-800">
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {t.ingredients.map((ing, i) => (
                            <span key={i} className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full px-2 py-0.5">
                              {ing.name}{ing.quantity ? ` · ${ing.quantity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Preset meals */}
      {filteredPresets.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">
            Preset Meals ({filteredPresets.length})
          </h2>
          <div className="space-y-1">
            {filteredPresets.map(t => (
              <div key={t.id} className="card overflow-hidden">
                <button className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  onClick={() => toggleExpand(t.id)}>
                  <span className="text-base shrink-0">{mealTypeIcon(t.mealType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 truncate">{t.name}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {mealTypeLabel(t.mealType)}
                      {t.notes ? ` · ${t.notes}` : ''}
                      {t.ingredients.length > 0 ? ` · ${t.ingredients.length} ingredient${t.ingredients.length !== 1 ? 's' : ''}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); copyPreset(t) }}
                      className="text-xs px-2 py-1 rounded-md border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-forest-400 hover:text-forest-600 dark:hover:text-forest-400 transition-colors">
                      Copy &amp; edit
                    </button>
                    <span className="text-stone-300 dark:text-stone-600 text-sm">{expanded.has(t.id) ? '▲' : '▼'}</span>
                  </div>
                </button>
                {expanded.has(t.id) && (
                  <div className="px-4 pb-3 border-t border-stone-100 dark:border-stone-800">
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {t.ingredients.map((ing, i) => (
                        <span key={i} className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full px-2 py-0.5">
                          {ing.name}{ing.quantity ? ` · ${ing.quantity}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredPresets.length === 0 && filteredCustom.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-2">🍽</p>
          <p className="text-stone-500 dark:text-stone-400">No meals match your search.</p>
        </div>
      )}
    </div>
  )
}
