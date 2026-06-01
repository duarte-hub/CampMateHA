'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TripWithDetails, PackingItem, BudgetItem } from '@/lib/types'
import MealsTab from './MealsTab'

type Tab = 'overview' | 'itinerary' | 'packing' | 'meals' | 'budget'

const SEVERITY_STYLE = {
  critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
}
const SEVERITY_ICON = { critical: '🚨', warning: '⚠️', info: 'ℹ️' }

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [trip, setTrip] = useState<TripWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('Custom')
  const [deleting, setDeleting] = useState(false)
  const [loadingLib, setLoadingLib] = useState(false)

  const [libMsg, setLibMsg] = useState('')

  async function load() {
    const res = await fetch(`/api/trips/${id}`)
    if (!res.ok) { router.push('/'); return }
    setTrip(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function togglePacking(item: PackingItem) {
    await fetch(`/api/trips/${id}/packing/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
    setTrip(t => t ? {
      ...t,
      packingItems: t.packingItems.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
    } : t)
  }

  async function addPackingItem() {
    if (!newItem.trim()) return
    const res = await fetch(`/api/trips/${id}/packing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim(), category: newCategory, quantity: 1 }),
    })
    const item = await res.json()
    setTrip(t => t ? { ...t, packingItems: [...t.packingItems, item] } : t)
    setNewItem('')
  }

  async function deletePackingItem(itemId: string) {
    await fetch(`/api/trips/${id}/packing/${itemId}`, { method: 'DELETE' })
    setTrip(t => t ? { ...t, packingItems: t.packingItems.filter(i => i.id !== itemId) } : t)
  }

  async function loadFromLibrary() {
    setLoadingLib(true)
    setLibMsg('')
    try {
      const lib = await fetch('/api/packing-library').then(r => r.json())
      const existing = new Set(trip!.packingItems.map(i => i.name.toLowerCase()))
      const toAdd = lib.filter((t: { name: string }) => !existing.has(t.name.toLowerCase()))
      for (const t of toAdd) {
        const res = await fetch(`/api/trips/${id}/packing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: t.name, category: t.category, quantity: t.quantity }),
        })
        const item = await res.json()
        setTrip(prev => prev ? { ...prev, packingItems: [...prev.packingItems, item] } : prev)
      }
      setLibMsg(toAdd.length > 0 ? `✓ Added ${toAdd.length} item${toAdd.length !== 1 ? 's' : ''} from library` : '✓ All library items already in list')
    } catch {
      setLibMsg('Failed to load from library')
    }
    setLoadingLib(false)
    setTimeout(() => setLibMsg(''), 4000)
  }

  async function deleteTrip() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/trips/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  async function updateBudget(itemId: string, field: 'estimatedCost' | 'actualCost', value: number) {
    await fetch(`/api/trips/${id}/budget/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    setTrip(t => t ? {
      ...t,
      budgetItems: t.budgetItems.map(b => b.id === itemId ? { ...b, [field]: value } : b)
    } : t)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-stone-400 text-sm">Loading trip...</div>
    </div>
  )
  if (!trip) return null

  const nights = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
  const checkedItems = trip.packingItems.filter(i => i.checked).length
  const totalItems = trip.packingItems.length
  const packingPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-xs font-medium text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors">
            ← All trips
          </Link>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">{trip.title || trip.destination}</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-0.5">
            📍 {trip.destination} · {fmtDate(trip.startDate)}{nights > 0 ? ` – ${fmtDate(trip.endDate)} · ${nights} night${nights !== 1 ? 's' : ''}` : ' · Day trip'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/trips/${id}/share`} className="btn-secondary text-xs">
            Share
          </Link>
          <button onClick={deleteTrip} disabled={deleting} className="text-xs text-red-500 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 px-2 py-1 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-700 gap-1 overflow-x-auto -mx-4 px-4">
        {(['overview', 'itinerary', 'packing', 'meals', 'budget'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 pt-1 px-1 text-sm font-medium whitespace-nowrap transition-all min-h-[44px] ${tab === t ? 'tab-active' : 'tab-inactive'}`}
          >
            {t === 'overview' && '📋 Overview'}
            {t === 'itinerary' && '📅 Itinerary'}
            {t === 'packing' && `🎒 Packing${packingPct > 0 ? ` (${packingPct}%)` : ''}`}
            {t === 'meals' && '🍳 Meals'}
            {t === 'budget' && '💰 Budget'}
          </button>
        ))}
        <Link
          href={`/trips/${id}/map`}
          className="pb-2 pt-1 px-1 text-sm font-medium whitespace-nowrap transition-all min-h-[44px] tab-inactive"
        >
          🗺️ Map
        </Link>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon="👥" label="People" value={`${trip.adults + trip.kids}`} sub={`${trip.adults} adults · ${trip.kids} kids`} />
            <StatCard icon="🌙" label="Nights" value={`${nights}`} sub={nights === 1 ? 'night away' : 'nights away'} />
            <StatCard icon="🎒" label="Gear" value={`${totalItems}`} sub={`${checkedItems} packed`} />
            <StatCard icon="💰" label="Budget" value={`$${trip.budgetItems.reduce((s, b) => s + b.estimatedCost, 0).toLocaleString()}`} sub="estimated" />
          </div>

          {/* Readiness */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-stone-800 dark:text-stone-200">Packing readiness</h3>
              <span className="text-sm font-bold text-forest-700 dark:text-forest-400">{packingPct}%</span>
            </div>
            <div className="h-2.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-forest-600 to-forest-500 rounded-full transition-all" style={{ width: `${packingPct}%` }} />
            </div>
            {packingPct === 100 && (
              <p className="text-sm text-forest-700 dark:text-forest-400 font-medium mt-2">✅ All gear packed — you&apos;re ready!</p>
            )}
          </div>

          {/* Trip details + reminders */}
          <div className="card p-4 space-y-2 text-sm">
            <h3 className="font-semibold text-stone-800 dark:text-stone-200 mb-3">Trip details</h3>
            <Detail label="Camping style" value={trip.campingStyle.replace('_', ' ')} />
            <Detail label="Vehicle" value={trip.vehicleType.toUpperCase()} />
            <Detail label="Experience" value={trip.experienceLevel} />
            <Detail label="Activities" value={trip.activities.join(', ') || 'None'} />
            {trip.notes && <Detail label="Notes" value={trip.notes} />}
            {trip.reminders.length > 0 && (
              <div className="pt-3 space-y-2 border-t border-stone-100 dark:border-stone-700 mt-2">
                {trip.reminders.sort((a, b) => {
                  const order = { critical: 0, warning: 1, info: 2 }
                  return order[a.severity] - order[b.severity]
                }).map(r => (
                  <div key={r.id} className={`rounded-lg border p-2.5 flex gap-2 ${SEVERITY_STYLE[r.severity]}`}>
                    <span className="shrink-0">{SEVERITY_ICON[r.severity]}</span>
                    <span>{r.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Itinerary Tab */}
      {tab === 'itinerary' && (
        <div className="space-y-3">
          {trip.itinerary.sort((a, b) => a.dayNumber - b.dayNumber).map(day => (
            <div key={day.id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-forest-700 dark:bg-forest-600 text-white flex items-center justify-center text-sm font-bold">
                  {day.dayNumber}
                </span>
                <div>
                  <p className="font-semibold text-stone-800 dark:text-stone-200">{day.summary}</p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">{fmtDate(day.date)}</p>
                </div>
              </div>
              <ul className="space-y-1.5 ml-11">
                {day.activities.map((a, i) => (
                  <li key={i} className="text-sm text-stone-600 dark:text-stone-400 flex gap-2">
                    <span className="text-stone-300 dark:text-stone-600 mt-0.5 shrink-0">•</span>
                    {a}
                  </li>
                ))}
              </ul>
              {day.notes && <p className="ml-11 mt-2 text-xs text-stone-400 dark:text-stone-500 italic">{day.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Packing Tab */}
      {tab === 'packing' && (
        <div className="space-y-4">
          {/* Add custom item */}
          <div className="card p-4 flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Add a custom item..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPackingItem()}
            />
            <input
              className="input w-28 text-sm"
              placeholder="Category"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
            />
            <button onClick={addPackingItem} className="btn-primary text-sm px-3">Add</button>
          </div>

          {/* Library actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={loadFromLibrary}
              disabled={loadingLib}
              className="btn-secondary text-sm disabled:opacity-40"
            >
              {loadingLib ? 'Loading…' : '📦 Load from library'}
            </button>
            <Link href="/packing-library" className="text-xs text-stone-400 dark:text-stone-500 hover:text-forest-600 dark:hover:text-forest-400 transition-colors self-center ml-auto">
              Manage library →
            </Link>
            {libMsg && (
              <span className={`text-sm font-medium px-3 py-2 rounded-lg ${libMsg.startsWith('✓') ? 'text-forest-700 dark:text-forest-400 bg-forest-50 dark:bg-forest-900/30' : 'text-red-600 bg-red-50'}`}>
                {libMsg}
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2">
            <span className="font-semibold text-forest-700 dark:text-forest-400">{checkedItems}/{totalItems}</span>
            <span>items packed</span>
            <div className="flex-1 h-1.5 bg-stone-100 dark:bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${packingPct}%` }} />
            </div>
          </div>

          {/* Items by category */}
          {Object.entries(
            trip.packingItems.reduce<Record<string, PackingItem[]>>((acc, item) => {
              ;(acc[item.category] ??= []).push(item)
              return acc
            }, {})
          ).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between">
                <h4 className="font-semibold text-sm text-stone-700 dark:text-stone-200">{cat}</h4>
                <span className="text-xs text-stone-400 dark:text-stone-500 font-medium">{items.filter(i => i.checked).length}/{items.length}</span>
              </div>
              <div className="divide-y divide-stone-50 dark:divide-stone-800">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => togglePacking(item)}
                      className="rounded border-stone-300 dark:border-stone-600 text-forest-600 focus:ring-forest-500 cursor-pointer"
                    />
                    <span
                      className={`flex-1 text-sm cursor-pointer select-none ${item.checked ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-700 dark:text-stone-300'}`}
                      onClick={() => togglePacking(item)}
                    >
                      {item.name}
                      {item.quantity > 1 && <span className="text-stone-400 dark:text-stone-500 ml-1">×{item.quantity}</span>}
                    </span>
                    {item.isCustom && <span className="text-xs text-stone-300 dark:text-stone-600 mr-1">custom</span>}
                    <button
                      onClick={() => deletePackingItem(item.id)}
                      className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-all text-sm w-6 h-6 flex items-center justify-center rounded"
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Meals Tab */}
      {tab === 'meals' && (
        <div className="space-y-4">
          <MealsTab tripId={trip.id} initialMeals={trip.meals} />
          <div className="text-center">
            <Link href="/meal-library" className="text-xs text-stone-400 dark:text-stone-500 hover:text-forest-600 dark:hover:text-forest-400 transition-colors">
              Manage meal library →
            </Link>
          </div>
        </div>
      )}

      {/* Budget Tab */}
      {tab === 'budget' && (
        <div className="space-y-4">
          {/* Total */}
          <div className="card p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-1">Estimated total</p>
              <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">
                ${trip.budgetItems.reduce((s, b) => s + b.estimatedCost, 0).toLocaleString()}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                ≈ ${Math.round(trip.budgetItems.reduce((s, b) => s + b.estimatedCost, 0) / (trip.adults + trip.kids))} per person
              </p>
            </div>
            {trip.budgetItems.some(b => b.actualCost !== undefined) && (
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-1">Actual total</p>
                <p className="text-2xl font-bold text-forest-700 dark:text-forest-400">
                  ${trip.budgetItems.reduce((s, b) => s + (b.actualCost ?? 0), 0).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {/* Items by category */}
          {Object.entries(
            trip.budgetItems.reduce<Record<string, BudgetItem[]>>((acc, item) => {
              ;(acc[item.category] ??= []).push(item)
              return acc
            }, {})
          ).map(([cat, items]) => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700">
                <h4 className="font-semibold text-sm text-stone-700 dark:text-stone-200">{cat}</h4>
              </div>
              <div className="divide-y divide-stone-50 dark:divide-stone-800">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm text-stone-700 dark:text-stone-300">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-400 dark:text-stone-500">Est.</span>
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm px-2 py-1.5 text-right focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500/30"
                        value={item.estimatedCost}
                        onChange={e => updateBudget(item.id, 'estimatedCost', parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-xs text-stone-400 dark:text-stone-500">Act.</span>
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm px-2 py-1.5 text-right focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500/30"
                        placeholder="—"
                        value={item.actualCost ?? ''}
                        onChange={e => updateBudget(item.id, 'actualCost', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-400 dark:text-stone-500 text-center">Tap Est. or Act. fields to edit amounts</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold text-stone-900 dark:text-stone-100 leading-none mb-1">{value}</div>
      <div className="text-xs text-stone-500 dark:text-stone-400 leading-snug">{sub}</div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-stone-400 dark:text-stone-500 w-28 shrink-0 capitalize">{label}</span>
      <span className="text-stone-800 dark:text-stone-200 font-medium capitalize">{value}</span>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}
