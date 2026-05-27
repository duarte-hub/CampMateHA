import { readDb } from '@/lib/db'
import { nightsBetween } from '@/lib/rules'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) notFound()

  const itinerary = db.itineraryDays.filter(d => d.tripId === id).sort((a, b) => a.dayNumber - b.dayNumber)
  const packing = db.packingItems.filter(p => p.tripId === id)
  const meals = db.meals.filter(m => m.tripId === id)
  const budget = db.budgetItems.filter(b => b.tripId === id)
  const reminders = db.reminders.filter(r => r.tripId === id)

  const nights = nightsBetween(trip.startDate, trip.endDate)
  const totalBudget = budget.reduce((s, b) => s + b.estimatedCost, 0)
  const criticalReminders = reminders.filter(r => r.severity === 'critical')
  const warningReminders = reminders.filter(r => r.severity === 'warning')

  // Top packing categories (first 5 items each, max 3 categories)
  const packingCats = Object.entries(
    packing.reduce<Record<string, typeof packing>>((acc, item) => {
      ;(acc[item.category] ??= []).push(item)
      return acc
    }, {})
  ).slice(0, 4)

  return (
    <div className="max-w-2xl mx-auto print:max-w-full">
      <div className="no-print flex items-center gap-3 mb-4">
        <Link href={`/trips/${id}`} className="btn-secondary text-sm">← Back to trip</Link>
        <button onClick={() => window.print()} className="btn-primary text-sm">🖨️ Print / Save PDF</button>
      </div>

      <div className="card p-6 space-y-6 print:shadow-none print:border-none">
        {/* Title block */}
        <div className="border-b-2 border-forest-700 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⛺</span>
            <span className="text-sm font-semibold text-forest-700 uppercase tracking-wide">CampMate Trip Brief</span>
          </div>
          <h1 className="text-3xl font-bold text-stone-900">{trip.title || trip.destination}</h1>
          <p className="text-stone-500 mt-1">
            📍 {trip.destination} &nbsp;·&nbsp;
            {nights === 0
              ? <>{fmtDate(trip.startDate)} &nbsp;·&nbsp; Day trip</>
              : <>{fmtDate(trip.startDate)} – {fmtDate(trip.endDate)} &nbsp;·&nbsp; {nights} nights</>
            }
          </p>
        </div>

        {/* Key facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Fact icon="👥" label="People" value={`${trip.adults + trip.kids}`} />
          <Fact icon="🌙" label="Nights" value={nights === 0 ? 'Day trip' : `${nights}`} />
          <Fact icon="🏕️" label="Style" value={trip.campingStyle.replace('_', ' ')} />
          <Fact icon="💰" label="Budget" value={`~$${totalBudget.toLocaleString()}`} />
        </div>

        {/* Activities */}
        {trip.activities.length > 0 && (
          <div>
            <h2 className="section-title">Activities planned</h2>
            <div className="flex flex-wrap gap-2">
              {trip.activities.map(a => (
                <span key={a} className="px-3 py-1 bg-forest-50 text-forest-700 border border-forest-200 rounded-full text-sm font-medium capitalize">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <div>
            <h2 className="section-title">Trip itinerary</h2>
            <div className="space-y-2">
              {itinerary.map(day => (
                <div key={day.id} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-forest-700 text-white flex items-center justify-center text-xs font-bold">
                    {day.dayNumber}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{day.summary}</p>
                    <p className="text-xs text-stone-400">{fmtDate(day.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Packing highlights */}
        {packing.length > 0 && (
          <div>
            <h2 className="section-title">Gear highlights</h2>
            <div className="grid grid-cols-2 gap-3">
              {packingCats.map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{cat}</p>
                  <ul className="space-y-0.5">
                    {items.slice(0, 5).map(item => (
                      <li key={item.id} className="text-sm text-stone-700">• {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</li>
                    ))}
                    {items.length > 5 && <li className="text-xs text-stone-400">+{items.length - 5} more</li>}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-2">{packing.length} total gear items</p>
          </div>
        )}

        {/* Meal plan summary */}
        {meals.length > 0 && (
          <div>
            <h2 className="section-title">Meal plan</h2>
            <div className="space-y-1">
              {meals.filter(m => m.mealType === 'dinner').map(m => (
                <div key={m.id} className="flex gap-2 text-sm">
                  <span className="text-stone-400 w-24 shrink-0">{fmtDate(m.date)}</span>
                  <span className="text-stone-700">{m.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget summary */}
        {budget.length > 0 && (
          <div>
            <h2 className="section-title">Budget estimate</h2>
            <div className="space-y-1">
              {Object.entries(
                budget.reduce<Record<string, number>>((acc, b) => {
                  acc[b.category] = (acc[b.category] ?? 0) + b.estimatedCost
                  return acc
                }, {})
              ).map(([cat, total]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-stone-600">{cat}</span>
                  <span className="font-medium">${total.toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-stone-200 pt-1 mt-1">
                <span>Total</span>
                <span>${totalBudget.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Critical reminders */}
        {(criticalReminders.length > 0 || warningReminders.length > 0) && (
          <div>
            <h2 className="section-title">Key reminders</h2>
            <div className="space-y-2">
              {criticalReminders.map(r => (
                <div key={r.id} className="flex gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-2">
                  <span>🚨</span><span className="text-red-800">{r.message}</span>
                </div>
              ))}
              {warningReminders.slice(0, 4).map(r => (
                <div key={r.id} className="flex gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-2">
                  <span>⚠️</span><span className="text-amber-800">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-stone-200 pt-3 text-xs text-stone-400 flex justify-between">
          <span>Generated by CampMate</span>
          <span>{new Date().toLocaleDateString('en-AU')}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          header { display: none !important; }
          body { background: white; }
        }
        .section-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #15803d;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  )
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="text-center p-2 bg-stone-50 rounded-lg">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-stone-400">{label}</div>
      <div className="text-sm font-bold text-stone-800 capitalize">{value}</div>
    </div>
  )
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
