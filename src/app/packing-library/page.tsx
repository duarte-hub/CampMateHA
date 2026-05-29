'use client'

import { useState, useEffect } from 'react'
import type { PackingTemplate } from '@/lib/types'

const EMPTY_ITEM = { name: '', category: 'Misc', quantity: 1 }

export default function PackingLibraryPage() {
  const [items,    setItems]    = useState<PackingTemplate[]>([])
  const [search,   setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [creating, setCreating] = useState(false)
  const [newItem,  setNewItem]  = useState({ ...EMPTY_ITEM })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ name: '', category: 'Misc', quantity: 1 })
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/packing-library').then(r => r.json()).then(setItems)
  }, [])

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category))).sort()]

  const filtered = items.filter(i => {
    const catOk = catFilter === 'all' || i.category === catFilter
    const searchOk = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

  const grouped = filtered.reduce<Record<string, PackingTemplate[]>>((acc, item) => {
    ;(acc[item.category] ??= []).push(item)
    return acc
  }, {})

  async function createItem() {
    if (!newItem.name.trim()) return
    setSaving(true)
    const res = await fetch('/api/packing-library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    })
    const created: PackingTemplate = await res.json()
    setItems(prev => [...prev, created])
    setCreating(false)
    setNewItem({ ...EMPTY_ITEM })
    setSaving(false)
  }

  function startEdit(item: PackingTemplate) {
    setEditingId(item.id)
    setEditDraft({ name: item.name, category: item.category, quantity: item.quantity })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await fetch(`/api/packing-library/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editDraft),
    })
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...editDraft } : i))
    setEditingId(null)
    setSaving(false)
  }

  async function deleteItem(id: string) {
    await fetch(`/api/packing-library/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const allCats = Array.from(new Set(items.map(i => i.category))).sort()

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Packing Library</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} across {allCats.length} categories — your default gear list
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setNewItem({ ...EMPTY_ITEM }) }}
          className="btn-primary shrink-0"
        >
          + Add item
        </button>
      </div>

      {/* Search + category filter */}
      <div className="space-y-2">
        <input
          className="input"
          placeholder="Search items or categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`shrink-0 text-xs px-3 py-1 rounded-full font-semibold border transition-colors capitalize ${
                catFilter === cat
                  ? 'bg-forest-600 text-white border-forest-600'
                  : 'border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-300 hover:border-forest-400 dark:hover:border-forest-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card p-4 space-y-3 border-2 border-forest-200 dark:border-forest-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-800 dark:text-stone-100">New item</h3>
            <button onClick={() => setCreating(false)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="label">Item name</label>
              <input
                className="input"
                placeholder="e.g. Sleeping bag"
                value={newItem.name}
                onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && createItem()}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="e.g. Bedding"
                value={newItem.category}
                onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                list="cat-suggestions"
              />
              <datalist id="cat-suggestions">
                {allCats.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Qty</label>
              <input
                type="number"
                className="input"
                min={1}
                value={newItem.quantity}
                onChange={e => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setCreating(false)} className="flex-1 btn-secondary text-sm justify-center">Cancel</button>
            <button
              onClick={createItem}
              disabled={saving || !newItem.name.trim()}
              className="flex-1 btn-primary text-sm justify-center disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Add item'}
            </button>
          </div>
        </div>
      )}

      {/* Items grouped by category */}
      {Object.keys(grouped).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, catItems]) => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
                <h3 className="font-semibold text-sm text-stone-700 dark:text-stone-200">{cat}</h3>
                <span className="text-xs text-stone-400 dark:text-stone-500">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-stone-50 dark:divide-stone-800">
                {catItems.map(item => (
                  <div key={item.id}>
                    {editingId === item.id ? (
                      <div className="px-4 py-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <input
                              className="input text-sm"
                              value={editDraft.name}
                              onChange={e => setEditDraft(p => ({ ...p, name: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                              autoFocus
                            />
                          </div>
                          <input
                            className="input text-sm"
                            value={editDraft.category}
                            onChange={e => setEditDraft(p => ({ ...p, category: e.target.value }))}
                            list="cat-suggestions"
                          />
                          <input
                            type="number"
                            className="input text-sm"
                            min={1}
                            value={editDraft.quantity}
                            onChange={e => setEditDraft(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="flex-1 btn-secondary text-xs justify-center">Cancel</button>
                          <button onClick={() => saveEdit(item.id)} disabled={saving} className="flex-1 btn-primary text-xs justify-center disabled:opacity-40">
                            {saving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 group hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                        <span className="flex-1 text-sm text-stone-700 dark:text-stone-300">
                          {item.name}
                          {item.quantity > 1 && <span className="text-stone-400 dark:text-stone-500 ml-1.5">×{item.quantity}</span>}
                        </span>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-forest-400 hover:text-forest-600 dark:hover:text-forest-400 transition-colors"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs px-2 py-1 rounded border border-stone-200 dark:border-stone-700 text-stone-400 hover:border-red-400 hover:text-red-500 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-2">🎒</p>
          <p className="text-stone-500 dark:text-stone-400">
            {items.length === 0 ? 'No items yet — add your first, or load from a trip\'s packing list.' : 'No items match your search.'}
          </p>
        </div>
      )}
    </div>
  )
}
