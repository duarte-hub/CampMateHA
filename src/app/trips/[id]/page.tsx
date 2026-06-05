'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { TripWithDetails, PackingItem, BudgetItem, Booking, BookingType } from '@/lib/types'
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
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'overview') as Tab

  const [trip, setTrip] = useState<TripWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('Custom')
  const [loadingLib, setLoadingLib] = useState(false)
  const [libMsg, setLibMsg] = useState('')
  const [showReminders, setShowReminders] = useState(false)
  // Bookings
  const [addingBookingDayId,  setAddingBookingDayId]  = useState<string | null>(null)
  const [bkName,              setBkName]              = useState('')
  const [bkType,              setBkType]              = useState<BookingType>('attraction')
  const [bkCost,              setBkCost]              = useState('')
  const [bkBooked,            setBkBooked]            = useState(false)
  const [bkUrl,               setBkUrl]               = useState('')
  const [bkNotes,             setBkNotes]             = useState('')
  const [savingBooking,       setSavingBooking]        = useState(false)

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

  async function addBooking(dayId: string, date: string) {
    if (!bkName.trim()) return
    setSavingBooking(true)
    const res = await fetch(`/api/trips/${id}/bookings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayId, date, name: bkName, type: bkType, cost: parseFloat(bkCost) || 0, booked: bkBooked, url: bkUrl || undefined, notes: bkNotes || undefined }),
    })
    const booking: Booking = await res.json()
    setTrip(t => t ? { ...t, bookings: [...(t.bookings ?? []), booking] } : t)
    setBkName(''); setBkType('attraction'); setBkCost(''); setBkBooked(false); setBkUrl(''); setBkNotes('')
    setAddingBookingDayId(null); setSavingBooking(false)
  }

  async function deleteBooking(bookingId: string) {
    await fetch(`/api/trips/${id}/bookings/${bookingId}`, { method: 'DELETE' })
    setTrip(t => t ? { ...t, bookings: (t.bookings ?? []).filter(b => b.id !== bookingId) } : t)
  }

  async function toggleBooked(booking: Booking) {
    const updated = { ...booking, booked: !booking.booked }
    await fetch(`/api/trips/${id}/bookings/${booking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booked: !booking.booked }),
    })
    setTrip(t => t ? { ...t, bookings: (t.bookings ?? []).map(b => b.id === booking.id ? updated : b) } : t)
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
    <div className="space-y-3 animate-pulse">
      <div className="h-28 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-16 rounded-2xl bg-stone-100 dark:bg-stone-800" />
      <div className="h-20 rounded-2xl bg-stone-100 dark:bg-stone-800" />
    </div>
  )
  if (!trip) return null

  const nights = Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
  const checkedItems = trip.packingItems.filter(i => i.checked).length
  const totalItems = trip.packingItems.length
  const packingPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-4">

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
              <div className="pt-2 border-t border-stone-100 dark:border-stone-700 mt-2">
                <button
                  onClick={() => setShowReminders(o => !o)}
                  className="w-full flex items-center justify-between text-xs py-1 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {trip.reminders.some(r => r.severity === 'critical') && <span>🚨 {trip.reminders.filter(r => r.severity === 'critical').length} critical</span>}
                    {trip.reminders.some(r => r.severity === 'warning') && <span>⚠️ {trip.reminders.filter(r => r.severity === 'warning').length} warning{trip.reminders.filter(r => r.severity === 'warning').length !== 1 ? 's' : ''}</span>}
                    {trip.reminders.some(r => r.severity === 'info') && <span>ℹ️ {trip.reminders.filter(r => r.severity === 'info').length} info</span>}
                  </span>
                  <span className="text-stone-300 dark:text-stone-600 ml-2">{showReminders ? '▲' : '▼'}</span>
                </button>
                {showReminders && (
                  <div className="mt-1.5 space-y-1">
                    {trip.reminders.sort((a, b) => {
                      const order = { critical: 0, warning: 1, info: 2 }
                      return order[a.severity] - order[b.severity]
                    }).map(r => (
                      <div key={r.id} className={`flex gap-1.5 text-xs px-2 py-1.5 rounded-lg border ${SEVERITY_STYLE[r.severity]}`}>
                        <span className="shrink-0">{SEVERITY_ICON[r.severity]}</span>
                        <span>{r.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Itinerary Tab */}
      {tab === 'itinerary' && (() => {
        const BK_TYPE: Record<string, { icon: string; label: string; bg: string; text: string }> = {
          attraction:    { icon: '📸', label: 'Attraction', bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-400' },
          accommodation: { icon: '🏨', label: 'Stay',       bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-700 dark:text-blue-400' },
          tour:          { icon: '🎯', label: 'Tour',        bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-700 dark:text-purple-400' },
          restaurant:    { icon: '🍽', label: 'Dining',      bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
          transport:     { icon: '🚌', label: 'Transport',   bg: 'bg-sky-100 dark:bg-sky-900/30',        text: 'text-sky-700 dark:text-sky-400' },
          other:         { icon: '📋', label: 'Other',       bg: 'bg-stone-100 dark:bg-stone-700',       text: 'text-stone-600 dark:text-stone-400' },
        }
        function dayIcon(summary: string) {
          const s = summary.toLowerCase()
          if (s.includes('depart') || s.includes('drive') || s.includes('travel')) return '🚗'
          if (s.includes('fish')) return '🎣'
          if (s.includes('hik') || s.includes('trail')) return '🥾'
          if (s.includes('beach') || s.includes('swim')) return '🏖️'
          if (s.includes('4wd') || s.includes('track')) return '🚙'
          if (s.includes('kayak')) return '🚣'
          if (s.includes('pack') || s.includes('return') || s.includes('home')) return '🏁'
          return '⛺'
        }
        function dayBorder(summary: string) {
          const s = summary.toLowerCase()
          if (s.includes('depart') || s.includes('drive') || s.includes('travel') || s.includes('pack') || s.includes('return')) return '#f59e0b'
          if (s.includes('beach') || s.includes('swim') || s.includes('kayak')) return '#38bdf8'
          if (s.includes('fish')) return '#0284c7'
          return '#16a34a'
        }
        const allBookings = trip.bookings ?? []
        const totalBookingCost = allBookings.reduce((s, b) => s + b.cost, 0)
        const confirmedCount = allBookings.filter(b => b.booked).length
        return (
          <div className="space-y-3">
            {/* Summary strip */}
            {trip.itinerary.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <div className="card px-3 py-2 flex items-center gap-1.5">
                  <span className="text-sm font-bold text-stone-800 dark:text-stone-200">{trip.itinerary.length}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">days</span>
                </div>
                {allBookings.length > 0 && (
                  <div className="card px-3 py-2 flex items-center gap-1.5">
                    <span className="text-sm font-bold text-stone-800 dark:text-stone-200">🎫 {allBookings.length}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">booking{allBookings.length !== 1 ? 's' : ''}</span>
                    {confirmedCount > 0 && (
                      <span className="text-xs font-medium text-forest-600 dark:text-forest-400">· {confirmedCount} confirmed</span>
                    )}
                  </div>
                )}
                {totalBookingCost > 0 && (
                  <div className="card px-3 py-2 flex items-center gap-1.5">
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">${totalBookingCost.toLocaleString()}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">in bookings</span>
                  </div>
                )}
              </div>
            )}

            {trip.itinerary.sort((a, b) => a.dayNumber - b.dayNumber).map(day => {
              const dayBookings = allBookings.filter(b => b.dayId === day.id)
              const dayBookingCost = dayBookings.reduce((s, b) => s + b.cost, 0)
              const isAdding = addingBookingDayId === day.id
              return (
                <div key={day.id} className="card overflow-hidden" style={{ borderLeftColor: dayBorder(day.summary), borderLeftWidth: 3 }}>
                  {/* Day header */}
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{dayIcon(day.summary)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-stone-800 dark:text-stone-100 leading-snug">{day.summary}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{fmtDate(day.date)}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        {dayBookingCost > 0 && (
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                            💰 ${dayBookingCost.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs font-bold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-700 rounded-full px-2 py-0.5">
                          Day {day.dayNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activities */}
                  {(day.activities.length > 0 || day.notes) && (
                    <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700">
                      {day.activities.length > 0 && (
                        <div className="ml-1 pl-3 border-l-2 border-stone-200 dark:border-stone-700 space-y-1.5">
                          {day.activities.map((a, i) => (
                            <p key={i} className="text-sm text-stone-600 dark:text-stone-400">{a}</p>
                          ))}
                        </div>
                      )}
                      {day.notes && <p className={`text-xs text-stone-400 dark:text-stone-500 italic ${day.activities.length > 0 ? 'mt-2' : ''}`}>{day.notes}</p>}
                    </div>
                  )}

                  {/* Bookings */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
                        🎫 Bookings{dayBookings.length > 0 && ` (${dayBookings.length})`}
                      </p>
                      {!isAdding && (
                        <button
                          onClick={() => { setAddingBookingDayId(day.id); setBkName(''); setBkCost(''); setBkUrl(''); setBkNotes(''); setBkBooked(false); setBkType('attraction') }}
                          className="text-xs text-forest-600 dark:text-forest-400 font-semibold hover:underline">
                          + Add booking
                        </button>
                      )}
                    </div>

                    {dayBookings.map(bk => {
                      const bkStyle = BK_TYPE[bk.type] ?? BK_TYPE.other
                      return (
                        <div key={bk.id} className="flex items-start gap-2.5 group py-0.5">
                          <button onClick={() => toggleBooked(bk)}
                            className={`mt-0.5 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${bk.booked ? 'bg-forest-600 border-forest-600' : 'border-stone-300 dark:border-stone-600 hover:border-forest-400'}`}>
                            {bk.booked && <span className="text-white text-[9px] font-bold">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium shrink-0 ${bkStyle.bg} ${bkStyle.text}`}>
                                {bkStyle.icon} {bkStyle.label}
                              </span>
                              <span className="text-sm text-stone-700 dark:text-stone-200 font-medium">{bk.name}</span>
                            </div>
                            {bk.notes && <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 italic">{bk.notes}</p>}
                            {bk.url && (
                              <a href={bk.url} target="_blank" rel="noreferrer" className="text-xs text-forest-600 dark:text-forest-400 hover:underline mt-0.5 block">
                                Book now →
                              </a>
                            )}
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            {bk.cost > 0 && (
                              <span className="text-sm font-bold text-stone-700 dark:text-stone-200">${bk.cost.toLocaleString()}</span>
                            )}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bk.booked ? 'bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                              {bk.booked ? 'Confirmed' : 'To book'}
                            </span>
                            <button onClick={() => deleteBooking(bk.id)}
                              className="text-stone-300 dark:text-stone-600 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-all shrink-0">✕</button>
                          </div>
                        </div>
                      )
                    })}

                    {dayBookings.length === 0 && !isAdding && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 italic">No bookings yet — add attractions, tours, restaurants…</p>
                    )}

                    {/* Inline add form */}
                    {isAdding && (
                      <div className="rounded-xl border border-forest-200 dark:border-forest-800 bg-forest-50/50 dark:bg-forest-900/20 p-3 space-y-2 mt-1">
                        <div className="flex gap-2">
                          <select value={bkType} onChange={e => setBkType(e.target.value as BookingType)}
                            className="input text-xs py-1.5 w-36 shrink-0">
                            <option value="attraction">📸 Attraction</option>
                            <option value="tour">🎯 Tour</option>
                            <option value="accommodation">🏨 Stay</option>
                            <option value="restaurant">🍽 Restaurant</option>
                            <option value="transport">🚌 Transport</option>
                            <option value="other">📋 Other</option>
                          </select>
                          <input className="input text-sm flex-1" placeholder="Name…" autoFocus
                            value={bkName} onChange={e => setBkName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addBooking(day.id, day.date)} />
                        </div>
                        <div className="flex gap-2">
                          <div className="relative w-28 shrink-0">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                            <input type="number" min={0} className="input text-sm pl-5 w-full" placeholder="Cost"
                              value={bkCost} onChange={e => setBkCost(e.target.value)} />
                          </div>
                          <input className="input text-sm flex-1" placeholder="Booking URL (optional)"
                            value={bkUrl} onChange={e => setBkUrl(e.target.value)} />
                        </div>
                        <textarea className="input text-sm w-full resize-none" rows={2} placeholder="Notes (optional)"
                          value={bkNotes} onChange={e => setBkNotes(e.target.value)} />
                        <div className="flex items-center gap-3 justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <button onClick={() => setBkBooked(v => !v)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${bkBooked ? 'bg-forest-600 border-forest-600' : 'border-stone-300 hover:border-forest-400'}`}>
                              {bkBooked && <span className="text-white text-[9px] font-bold">✓</span>}
                            </button>
                            <span className="text-xs text-stone-600 dark:text-stone-400">Already confirmed</span>
                          </label>
                          <div className="flex gap-2">
                            <button onClick={() => setAddingBookingDayId(null)} className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1">Cancel</button>
                            <button onClick={() => addBooking(day.id, day.date)} disabled={savingBooking || !bkName.trim()}
                              className="btn-primary text-xs py-1 px-3 disabled:opacity-40">
                              {savingBooking ? 'Saving…' : 'Add booking'}
                            </button>
                          </div>
                        </div>
                        {parseFloat(bkCost) > 0 && (
                          <p className="text-xs text-stone-400 dark:text-stone-500">💡 Cost will be added to your budget under Bookings</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {trip.itinerary.length === 0 && (
              <div className="card p-10 text-center">
                <p className="text-3xl mb-2">📅</p>
                <p className="text-stone-500 dark:text-stone-400 text-sm">No itinerary yet — add stops on the Map tab to generate one.</p>
              </div>
            )}
          </div>
        )
      })()}

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
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  items.filter(i => i.checked).length === items.length
                    ? 'bg-forest-100 dark:bg-forest-900/40 text-forest-700 dark:text-forest-400'
                    : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                }`}>{items.filter(i => i.checked).length}/{items.length}</span>
              </div>
              <div className="divide-y divide-stone-50 dark:divide-stone-800">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
                    <button
                      onClick={() => togglePacking(item)}
                      className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        item.checked
                          ? 'bg-forest-600 border-forest-600 dark:bg-forest-500 dark:border-forest-500'
                          : 'border-stone-300 dark:border-stone-600 hover:border-forest-500 dark:hover:border-forest-500'
                      }`}
                      aria-label="Toggle packed"
                    >
                      {item.checked && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                    </button>
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
      {tab === 'budget' && (() => {
        const people      = trip.adults + trip.kids
        const totalEst    = trip.budgetItems.reduce((s, b) => s + b.estimatedCost, 0)
        const totalAct    = trip.budgetItems.reduce((s, b) => s + (b.actualCost ?? 0), 0)
        const hasActual   = trip.budgetItems.some(b => (b.actualCost ?? 0) > 0)
        const overBudget  = hasActual && totalAct > totalEst
        const categories  = Object.entries(
          trip.budgetItems.reduce<Record<string, BudgetItem[]>>((acc, item) => {
            ;(acc[item.category] ??= []).push(item)
            return acc
          }, {})
        )
        const CAT_COLOR: Record<string, string> = {
          'Campsite':      '#3b82f6',
          'Transport':     '#f59e0b',
          'Food':          '#22c55e',
          'Camp Supplies': '#8b5cf6',
          'Activities':    '#ec4899',
          'Bookings':      '#f43f5e',
          'Miscellaneous': '#94a3b8',
        }
        const catColor = (c: string) => CAT_COLOR[c] ?? '#94a3b8'

        return (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Estimated total</p>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-100">${totalEst.toLocaleString()}</p>
                  {people > 1 && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">≈ ${Math.round(totalEst / people)} per person</p>
                  )}
                </div>
                {hasActual && (
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500 mb-1">Actual spend</p>
                    <p className={`text-2xl font-bold ${overBudget ? 'text-red-600 dark:text-red-400' : 'text-forest-700 dark:text-forest-400'}`}>
                      ${totalAct.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-0.5 font-medium ${overBudget ? 'text-red-500' : 'text-forest-600 dark:text-forest-400'}`}>
                      {overBudget ? `↑ $${(totalAct - totalEst).toLocaleString()} over` : `↓ $${(totalEst - totalAct).toLocaleString()} under`}
                    </p>
                  </div>
                )}
              </div>

              {/* Stacked breakdown bar */}
              {totalEst > 0 && (
                <div className="h-3 rounded-full overflow-hidden flex gap-px bg-stone-100 dark:bg-stone-700">
                  {categories.map(([cat, items]) => {
                    const catEst = items.reduce((s, b) => s + b.estimatedCost, 0)
                    const pct = catEst / totalEst * 100
                    if (pct < 0.5) return null
                    return (
                      <div key={cat} style={{ width: `${pct}%`, background: catColor(cat) }}
                        title={`${cat}: $${catEst.toLocaleString()}`} className="transition-all" />
                    )
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {categories.map(([cat, items]) => {
                  const catEst = items.reduce((s, b) => s + b.estimatedCost, 0)
                  const pct = totalEst > 0 ? Math.round(catEst / totalEst * 100) : 0
                  return (
                    <div key={cat} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: catColor(cat) }} />
                      <span className="text-xs text-stone-500 dark:text-stone-400">{cat}</span>
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">${catEst.toLocaleString()}</span>
                      <span className="text-xs text-stone-300 dark:text-stone-600">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Category cards */}
            {categories.map(([cat, items]) => {
              const catEst = items.reduce((s, b) => s + b.estimatedCost, 0)
              const catAct = items.reduce((s, b) => s + (b.actualCost ?? 0), 0)
              const pct    = totalEst > 0 ? Math.round(catEst / totalEst * 100) : 0
              const catOver = catAct > catEst && catAct > 0
              return (
                <div key={cat} className="card overflow-hidden" style={{ borderLeftColor: catColor(cat), borderLeftWidth: 3 }}>
                  <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800/60 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-stone-700 dark:text-stone-200">{cat}</h4>
                      <span className="text-xs text-stone-400 dark:text-stone-500">{pct}%</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-stone-800 dark:text-stone-100">${catEst.toLocaleString()}</span>
                      {catAct > 0 && (
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${catOver ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-forest-100 dark:bg-forest-900/30 text-forest-700 dark:text-forest-400'}`}>
                          act. ${catAct.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-stone-50 dark:divide-stone-800">
                    {items.map(item => {
                      const itemOver = (item.actualCost ?? 0) > item.estimatedCost && (item.actualCost ?? 0) > 0
                      return (
                        <div key={item.id} className={`px-4 py-3 ${itemOver ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                          <p className="text-sm text-stone-700 dark:text-stone-300 mb-2 leading-snug">{item.name}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-xs text-stone-400 dark:text-stone-500 w-7 shrink-0">Est.</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                                <input type="number" min={0}
                                  className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-sm pl-5 pr-2 py-1.5 text-right focus:border-forest-500 focus:outline-none focus:ring-1 focus:ring-forest-500/30"
                                  value={item.estimatedCost}
                                  onChange={e => updateBudget(item.id, 'estimatedCost', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-1">
                              <span className="text-xs text-stone-400 dark:text-stone-500 w-7 shrink-0">Act.</span>
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                                <input type="number" min={0}
                                  className={`w-full rounded-lg border text-sm pl-5 pr-2 py-1.5 text-right focus:outline-none focus:ring-1 focus:ring-forest-500/30 bg-white dark:bg-stone-800 dark:text-stone-200 ${itemOver ? 'border-red-300 dark:border-red-700 text-red-700 focus:border-red-400' : 'border-stone-200 dark:border-stone-700 text-stone-800 focus:border-forest-500'}`}
                                  placeholder="0"
                                  value={item.actualCost ?? ''}
                                  onChange={e => updateBudget(item.id, 'actualCost', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            <div className="card p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">Budget settings</h4>
              <div className="flex items-center gap-3">
                <label className="text-sm text-stone-600 dark:text-stone-400 shrink-0">Campsite rate</label>
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-28">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                    <input type="number" min={0}
                      className="input text-sm pl-6 text-right"
                      placeholder={String((() => { const r: Record<string,number>={tent:40,camper_trailer:50,caravan:55,cabin:120}; return r[trip.campingStyle]??45 })())}
                      defaultValue={trip.campsiteRatePerNight ?? ''}
                      onBlur={async e => {
                        const val = parseFloat(e.target.value) || undefined
                        await fetch(`/api/trips/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({campsiteRatePerNight: val}) })
                        await fetch(`/api/trips/${id}/budget/regenerate`, { method: 'POST' })
                        load()
                      }} />
                  </div>
                  <span className="text-sm text-stone-400 dark:text-stone-500">/night</span>
                </div>
                <button
                  onClick={async () => { await fetch(`/api/trips/${id}/budget/regenerate`, { method: 'POST' }); load() }}
                  className="text-xs text-stone-400 dark:text-stone-500 hover:text-forest-600 dark:hover:text-forest-400 transition-colors shrink-0">
                  ↻ Refresh
                </button>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500">Fill in Act. fields as you spend to track against estimates</p>
            </div>
          </div>
        )
      })()}
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
