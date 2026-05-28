'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { nightsBetween } from '@/lib/rules'
import type { Trip } from '@/lib/types'

function styleLabel(s: Trip['campingStyle']) {
  return { tent: '🏕️ Tent', camper_trailer: '🚐 Camper', caravan: '🚌 Caravan', cabin: '🏠 Cabin' }[s]
}

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function refetch() {
      fetch('/api/trips')
        .then(r => r.json())
        .then(data => { setTrips(data); setLoading(false) })
        .catch(() => setLoading(false))
    }

    refetch()

    window.addEventListener('focus', refetch)
    window.addEventListener('pageshow', refetch)

    return () => {
      window.removeEventListener('focus', refetch)
      window.removeEventListener('pageshow', refetch)
    }
  }, [])

  const sorted = [...trips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )
  const upcoming = sorted.filter(t => new Date(t.endDate) >= new Date())
  const past     = sorted.filter(t => new Date(t.endDate) <  new Date())

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-forest-700 via-forest-800 to-forest-900 px-6 py-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 text-[140px] leading-none opacity-[0.07] select-none pointer-events-none pr-2 -mt-4">⛺</div>
        <p className="text-forest-300 text-xs font-semibold uppercase tracking-widest mb-2">Your next adventure awaits</p>
        <h1 className="text-3xl font-bold mb-2 leading-tight">Plan your next camping trip</h1>
        <p className="text-forest-100/75 text-sm mb-6 max-w-xs">
          Itinerary, gear list, meals, and budget — all tailored to your group.
        </p>
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-ember-600 active:scale-95 transition-all"
        >
          + New trip
        </Link>
      </div>

      {loading && (
        <div className="text-center text-stone-400 text-sm py-8">Loading trips…</div>
      )}

      {!loading && upcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Upcoming trips</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-3">Past trips</h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-60">
            {past.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {!loading && trips.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🗺️</div>
          <h2 className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-1">No trips yet</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-5">Create your first trip to get a complete camping plan.</p>
          <Link href="/trips/new" className="btn-primary">Plan my first trip</Link>
        </div>
      )}
    </div>
  )
}

function TripCard({ trip }: { trip: Trip }) {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const start  = new Date(trip.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const end    = new Date(trip.endDate).toLocaleDateString('en-AU',   { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <Link href={`/trips/${trip.id}`} className="card hover:border-forest-500 hover:shadow-md transition-all group block overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-forest-600 to-forest-500 group-hover:from-forest-500 group-hover:to-ember-500 transition-all" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-bold text-stone-900 dark:text-stone-100 group-hover:text-forest-700 dark:group-hover:text-forest-400 transition-colors leading-tight pr-2">
            {trip.title}
          </h3>
          <span className="shrink-0 text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-full px-2.5 py-0.5">
            {nights === 0 ? 'Day' : `${nights}n`}
          </span>
        </div>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3">📍 {trip.destination}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
          <span>📅 {start} – {end}</span>
          <span>👥 {trip.adults + trip.kids}</span>
          <span>{styleLabel(trip.campingStyle)}</span>
        </div>
        {trip.activities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {trip.activities.slice(0, 4).map(a => (
              <span key={a} className="text-xs bg-forest-50 dark:bg-forest-900/40 text-forest-700 dark:text-forest-300 rounded-full px-2.5 py-0.5 border border-forest-100 dark:border-forest-800 capitalize font-medium">
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
