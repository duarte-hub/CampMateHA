'use client'

import { useState, useEffect, use } from 'react'
import type { FuelEntry } from '@/lib/types'

function fmt(ts: string) {
  return new Date(ts).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function LogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [entries,    setEntries]    = useState<FuelEntry[]>([])
  const [locating,   setLocating]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [geoError,   setGeoError]   = useState('')

  // Form state
  const [litres,     setLitres]     = useState('')
  const [pricePerL,  setPricePerL]  = useState('')
  const [odometer,   setOdometer]   = useState('')
  const [notes,      setNotes]      = useState('')
  const [location,   setLocation]   = useState<{ lat: number; lng: number; name: string } | null>(null)

  const totalCost = litres && pricePerL
    ? (parseFloat(litres) * parseFloat(pricePerL)).toFixed(2)
    : ''

  useEffect(() => {
    reload()
  }, [id])

  function reload() {
    fetch(`/api/trips/${id}/fuel-log`).then(r => r.json()).then(setEntries)
  }

  async function getLocation() {
    setGeoError('')
    if (!navigator.geolocation) { setGeoError('Geolocation not supported on this device'); return }
    setLocating(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, enableHighAccuracy: true })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      // Reverse geocode via Nominatim
      let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data = await res.json()
        if (data.display_name) {
          const parts = data.display_name.split(',')
          name = parts.slice(0, 3).join(',').trim()
        }
      } catch { /* keep coords as name */ }
      setLocation({ lat, lng, name })
    } catch (e) {
      const err = e as GeolocationPositionError
      if (err.code === 1) {
        setGeoError('Location access denied — please enable it in your browser/device settings, then try again')
      } else if (err.code === 3) {
        setGeoError('Location timed out — make sure GPS is on and try again')
      } else {
        setGeoError('Could not get location — try again')
      }
    }
    setLocating(false)
  }

  async function submit() {
    if (!litres || !pricePerL) return
    setSaving(true)
    await fetch(`/api/trips/${id}/fuel-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        litres:    parseFloat(litres),
        pricePerL: parseFloat(pricePerL),
        totalCost: parseFloat(totalCost || '0'),
        location:  location ?? undefined,
        odometer:  odometer ? parseFloat(odometer) : undefined,
        notes:     notes || undefined,
      }),
    })
    setLitres(''); setPricePerL(''); setOdometer(''); setNotes(''); setLocation(null)
    reload()
    setSaving(false)
  }

  // Summary
  const totalL     = entries.reduce((s, e) => s + e.litres, 0)
  const totalSpend = entries.reduce((s, e) => s + e.totalCost, 0)
  const avgPrice   = totalL > 0 ? totalSpend / totalL : 0

  return (
    <div className="max-w-xl mx-auto space-y-5">

      {/* Summary strip */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total litres', value: `${totalL.toFixed(1)} L` },
            { label: 'Total spend',  value: `$${totalSpend.toFixed(2)}` },
            { label: 'Avg price',    value: `$${avgPrice.toFixed(3)}/L` },
          ].map(s => (
            <div key={s.label} className="card p-3 text-center">
              <p className="text-xs text-stone-400 dark:text-stone-500 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add entry form */}
      <div className="card p-5 space-y-4">
        <h2 className="font-bold text-stone-800 dark:text-stone-100">Log a fuel stop</h2>

        {/* Location */}
        <div className="space-y-1.5">
          <label className="label">Location</label>
          <div className="flex gap-2">
            <div className="flex-1 input text-sm flex items-center gap-2 min-h-[44px]">
              {location
                ? <span className="text-stone-700 dark:text-stone-200 truncate">{location.name}</span>
                : <span className="text-stone-400">Not set</span>
              }
            </div>
            <button onClick={getLocation} disabled={locating}
              className="btn-secondary text-sm shrink-0 min-h-[44px] disabled:opacity-40">
              {locating ? '⏳' : '📍 GPS'}
            </button>
            {location && (
              <button onClick={() => setLocation(null)} className="text-stone-400 hover:text-stone-600 px-2">✕</button>
            )}
          </div>
          {geoError && <p className="text-xs text-red-600">{geoError}</p>}
        </div>

        {/* Litres + Price */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="label">Litres</label>
            <div className="relative">
              <input type="number" min={0} step={0.01} inputMode="decimal"
                className="input text-lg font-semibold pr-8" placeholder="0.00"
                value={litres} onChange={e => setLitres(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">L</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="label">Price per litre</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
              <input type="number" min={0} step={0.001} inputMode="decimal"
                className="input text-lg font-semibold pl-6" placeholder="0.000"
                value={pricePerL} onChange={e => setPricePerL(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Total (auto-calculated) */}
        {totalCost && (
          <div className="rounded-xl bg-forest-50 dark:bg-forest-900/30 border border-forest-200 dark:border-forest-800 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-forest-700 dark:text-forest-300 font-medium">Total cost</span>
            <span className="text-2xl font-bold text-forest-800 dark:text-forest-200">${totalCost}</span>
          </div>
        )}

        {/* Odometer + Notes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="label">Odometer (optional)</label>
            <div className="relative">
              <input type="number" min={0} inputMode="numeric"
                className="input text-sm pr-8" placeholder="km"
                value={odometer} onChange={e => setOdometer(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">km</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="label">Notes (optional)</label>
            <input className="input text-sm" placeholder="e.g. Dirty Dick's"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <button onClick={submit} disabled={saving || !litres || !pricePerL}
          className="btn-primary w-full justify-center disabled:opacity-40 text-sm min-h-[44px]">
          {saving ? 'Saving…' : '⛽ Log fuel stop'}
        </button>
      </div>

      {/* Entry list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">History</h2>
          {entries.map(entry => (
            <div key={entry.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      ${entry.totalCost.toFixed(2)}
                    </span>
                    <span className="text-sm text-stone-500 dark:text-stone-400">
                      {entry.litres.toFixed(2)} L @ ${entry.pricePerL.toFixed(3)}/L
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{fmt(entry.timestamp)}</p>
                  {entry.location && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 flex items-center gap-1">
                      <span>📍</span>
                      <span className="truncate">{entry.location.name}</span>
                    </p>
                  )}
                  {(entry.odometer || entry.notes) && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                      {entry.odometer ? `🔢 ${entry.odometer.toLocaleString()} km` : ''}
                      {entry.odometer && entry.notes ? ' · ' : ''}
                      {entry.notes ?? ''}
                    </p>
                  )}
                </div>
                <button onClick={async () => {
                  await fetch(`/api/trips/${id}/fuel-log/${entry.id}`, { method: 'DELETE' })
                  setEntries(prev => prev.filter(e => e.id !== entry.id))
                }} className="text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors text-sm shrink-0">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-2">⛽</p>
          <p className="text-stone-500 dark:text-stone-400 text-sm">No fuel stops logged yet.</p>
        </div>
      )}
    </div>
  )
}
