'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { nightsBetween } from '@/lib/rules'
import type { Trip } from '@/lib/types'

function styleLabel(s: Trip['campingStyle']) {
  return { tent: '🏕️ Tent', camper_trailer: '🚐 Camper Trailer', caravan: '🚌 Caravan', cabin: '🏠 Cabin' }[s]
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

    // Re-fetch when the user navigates back (bfcache restore) or switches tabs
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
      <div className="rounded-2xl bg-gradient-to-br from-forest-700 to-forest-900 px-6 py-8 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Plan your next adventure</h1>
        <p className="text-forest-100 text-sm mb-5">
          Answer a few questions and get a complete trip plan — itinerary, gear list, meals, and budget.
        </p>
        <Link href="/trips/new" className="inline-flex items-center gap-2 rounded-lg bg-ember-500 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-ember-600 transition-colors">
          + Plan a new trip
        </Link>
      </div>

      {loading && (
        <div className="text-center text-stone-400 text-sm py-8">Loading trips…</div>
      )}

      {!loading && upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-stone-800 mb-3">Upcoming trips</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {!loading && past.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-stone-500 mb-3">Past trips</h2>
          <div className="grid gap-3 sm:grid-cols-2 opacity-70">
            {past.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        </section>
      )}

      {!loading && trips.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🗺️</div>
          <h2 className="text-lg font-semibold text-stone-700 mb-1">No trips yet</h2>
          <p className="text-stone-500 text-sm mb-5">Create your first trip to get a complete camping plan.</p>
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
    <Link href={`/trips/${trip.id}`} className="card p-4 hover:border-forest-400 hover:shadow-md transition-all group block">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-stone-900 group-hover:text-forest-700 transition-colors">{trip.title}</h3>
        <span className="text-xs text-stone-400 bg-stone-100 rounded px-2 py-0.5">{nights === 0 ? 'Day' : `${nights}n`}</span>
      </div>
      <p className="text-sm text-stone-600 mb-3">📍 {trip.destination}</p>
      <div className="flex flex-wrap gap-2 text-xs text-stone-500">
        <span>📅 {start} → {end}</span>
        <span>👥 {trip.adults + trip.kids} people</span>
        <span>{styleLabel(trip.campingStyle)}</span>
      </div>
      {trip.activities.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {trip.activities.slice(0, 4).map(a => (
            <span key={a} className="text-xs bg-forest-50 text-forest-700 rounded px-2 py-0.5 border border-forest-100 capitalize">
              {a}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}
