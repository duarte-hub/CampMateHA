'use client'

import { useState, useEffect, useRef, use, useCallback } from 'react'
import Link from 'next/link'
import type { Waypoint, WaypointType, VehicleConfig } from '@/lib/types'

const TYPES: { value: WaypointType; label: string; icon: string; color: string }[] = [
  { value: 'start',      label: 'Start',       icon: '🚦', color: '#16a34a' },
  { value: 'campsite',   label: 'Campsite',     icon: '🏕️', color: '#15803d' },
  { value: 'fuel',       label: 'Fuel Stop',    icon: '⛽', color: '#dc2626' },
  { value: 'food',       label: 'Food / Shops', icon: '🛒', color: '#d97706' },
  { value: 'fishing',    label: 'Fishing Spot', icon: '🎣', color: '#0284c7' },
  { value: 'attraction', label: 'Attraction',   icon: '📸', color: '#7c3aed' },
  { value: 'end',        label: 'End / Home',   icon: '🏁', color: '#9f1239' },
  { value: 'custom',     label: 'Custom Stop',  icon: '📍', color: '#6b7280' },
]

function typeFor(t: string) { return TYPES.find(x => x.value === t) ?? TYPES[7] }

function navLinks(lat: number, lng: number, name: string) {
  const dest = `${lat},${lng}`
  const label = encodeURIComponent(name)
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=${label}`,
    apple:  `https://maps.apple.com/?daddr=${dest}&dirflg=d`,
    waze:   `https://waze.com/ul?ll=${dest}&navigate=yes`,
  }
}

function markerHtml(icon: string, color: string, num: number) {
  return `
    <div style="position:relative;width:36px;text-align:center">
      <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:15px;line-height:1">${icon}</span>
      </div>
      <div style="position:absolute;top:-6px;right:-6px;background:white;color:${color};
        font-size:10px;font-weight:700;width:16px;height:16px;border-radius:50%;
        border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;
        box-shadow:0 1px 3px rgba(0,0,0,.2);">${num}</div>
    </div>`
}

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapObj     = useRef<import('leaflet').Map | null>(null)
  const markersRef = useRef<import('leaflet').Marker[]>([])
  const lineRef    = useRef<import('leaflet').Polyline | null>(null)
  const navPinRef  = useRef<import('leaflet').Marker | null>(null)

  const [waypoints,  setWaypoints]  = useState<Waypoint[]>([])
  const [tripName,   setTripName]   = useState('')
  const [tab,        setTab]        = useState<'navigate' | 'stops' | 'import' | 'fuel'>('navigate')
  const [vehicle,    setVehicleConfig] = useState<VehicleConfig | null>(null)
  const [clickToAdd, setClickToAdd] = useState(false)
  const [editingId,    setEditingId]    = useState<string | null>(null)
  const [editName,     setEditName]     = useState('')
  const [buildingItin,  setBuildingItin]  = useState(false)
  const [itinMsg,       setItinMsg]       = useState('')
  const [homeLoc,       setHomeLoc]       = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [roadSegments,  setRoadSegments]  = useState<number[]>([])

  // Navigate tab state
  const [navQ,       setNavQ]       = useState('')
  const [navResults, setNavResults] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [navTarget,  setNavTarget]  = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [navSearching, setNavSearching] = useState(false)

  // Import tab state
  const [importUrl,    setImportUrl]    = useState('')
  const [importErr,    setImportErr]    = useState('')
  const [importing,    setImporting]    = useState(false)
  const [foundLocs,    setFoundLocs]    = useState<{ name: string; lat: number; lng: number; googleMapsUrl: string }[]>([])
  const [selectedLocs, setSelectedLocs] = useState<Set<number>>(new Set())
  const [addingAll,    setAddingAll]    = useState(false)

  useEffect(() => {
    fetch(`/api/trips/${id}`).then(r => r.json()).then(t => setTripName(t.title || t.destination))
    fetch(`/api/trips/${id}/waypoints`).then(r => r.json()).then(setWaypoints)
    fetch('/api/settings').then(r => r.json()).then(d => {
      setHomeLoc(d.homeLocation ?? null)
      setVehicleConfig(d.vehicleConfig ?? null)
    })
  }, [id])

  // Fetch road distances whenever waypoints change
  useEffect(() => {
    const s = [...waypoints].sort((a,b) => a.order - b.order)
    if (s.length < 2) { setRoadSegments([]); return }
    const coords = s.map(w => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(';')
    fetch(`/api/route-distance?coords=${encodeURIComponent(coords)}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.segments)) setRoadSegments(d.segments) })
      .catch(() => {})
  }, [waypoints])

  // Init Leaflet
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    import('leaflet').then(({ default: L }) => {
      if (!mapRef.current || mapObj.current) return
      const map = L.map(mapRef.current, { zoomControl: true }).setView([-25.5, 134], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)
      map.on('click', e => {
        setClickToAdd(prev => {
          if (!prev) return prev
          const { lat, lng } = e.latlng
          addWaypointFn({ lat, lng, name: `Stop ${Date.now()}` })
          return false
        })
      })
      mapObj.current = map
    })
    return () => { mapObj.current?.remove(); mapObj.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addWaypointFn = useCallback(async (opts: {
    lat: number; lng: number; name: string; type?: WaypointType; googleMapsUrl?: string; nights?: number
  }) => {
    const res = await fetch(`/api/trips/${id}/waypoints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...opts, order: waypoints.length }),
    })
    const wp: Waypoint = await res.json()
    setWaypoints(prev => [...prev, wp])
  }, [id, waypoints.length])

  // Sync waypoint markers
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      lineRef.current?.remove()
      lineRef.current = null

      const sorted = [...waypoints].sort((a, b) => a.order - b.order)
      const latlngs: [number, number][] = []

      sorted.forEach((wp, idx) => {
        const t = typeFor(wp.type)
        const icon = L.divIcon({ className: '', html: markerHtml(t.icon, t.color, idx + 1), iconSize: [36, 42], iconAnchor: [18, 42], popupAnchor: [0, -44] })
        const nav = navLinks(wp.lat, wp.lng, wp.name)
        const marker = L.marker([wp.lat, wp.lng], { icon }).addTo(map).bindPopup(`
          <div style="min-width:160px">
            <strong style="font-size:13px">${wp.name}</strong><br>
            <span style="font-size:11px;color:#6b7280">${t.icon} ${t.label}</span><br>
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
              <a href="${nav.google}" target="_blank" style="font-size:11px;padding:3px 8px;background:#4285f4;color:white;border-radius:4px;text-decoration:none">Google Maps</a>
              <a href="${nav.waze}" target="_blank" style="font-size:11px;padding:3px 8px;background:#05c8f7;color:white;border-radius:4px;text-decoration:none">Waze</a>
              <a href="${nav.apple}" target="_blank" style="font-size:11px;padding:3px 8px;background:#555;color:white;border-radius:4px;text-decoration:none">Apple Maps</a>
            </div>
          </div>`)
        markersRef.current.push(marker)
        latlngs.push([wp.lat, wp.lng])
      })

      if (latlngs.length > 1) {
        lineRef.current = L.polyline(latlngs, { color: '#15803d', weight: 3, dashArray: '8,6', opacity: 0.75 }).addTo(map)
      }
      if (latlngs.length > 0) {
        try {
          map.fitBounds(latlngs.length === 1
            ? [[latlngs[0][0] - 0.5, latlngs[0][1] - 0.5], [latlngs[0][0] + 0.5, latlngs[0][1] + 0.5]]
            : latlngs, { padding: [40, 40], maxZoom: 13 })
        } catch { /* ignore */ }
      }
    })
  }, [waypoints])

  // Nav target pin
  useEffect(() => {
    const map = mapObj.current
    if (!map || !navTarget) return
    import('leaflet').then(({ default: L }) => {
      navPinRef.current?.remove()
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      })
      navPinRef.current = L.marker([navTarget.lat, navTarget.lng], { icon }).addTo(map)
      map.setView([navTarget.lat, navTarget.lng], 13, { animate: true })
    })
    return () => { navPinRef.current?.remove(); navPinRef.current = null }
  }, [navTarget])

  async function searchNav() {
    if (!navQ.trim()) return
    // Try raw coords first
    const coordMatch = navQ.trim().match(/^(-?\d+\.?\d+)[,\s]+(-?\d+\.?\d+)$/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]), lng = parseFloat(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setNavTarget({ name: navQ.trim(), lat, lng })
        setNavResults([])
        return
      }
    }
    setNavSearching(true)
    try {
      const res = await fetch(`/api/trips/${id}/waypoints/search?q=${encodeURIComponent(navQ)}`)
      const results = await res.json()
      setNavResults(results)
      if (results.length === 1) setNavTarget(results[0])
    } catch { setNavResults([]) }
    finally { setNavSearching(false) }
  }

  async function handleImport() {
    if (!importUrl.trim()) return
    setImporting(true); setImportErr(''); setFoundLocs([])
    try {
      const res = await fetch(`/api/trips/${id}/waypoints/import`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const locs = data.locations
      if (locs.length === 1) {
        await addWaypointFn({ lat: locs[0].lat, lng: locs[0].lng, name: locs[0].name, googleMapsUrl: locs[0].googleMapsUrl })
        setImportUrl(''); setTab('stops')
      } else {
        setFoundLocs(locs); setSelectedLocs(new Set(locs.map((_: unknown, i: number) => i)))
      }
    } catch (e) { setImportErr(e instanceof Error ? e.message : 'Import failed') }
    finally { setImporting(false) }
  }

  async function addSelectedLocs() {
    setAddingAll(true)
    for (const loc of foundLocs.filter((_, i) => selectedLocs.has(i))) {
      await addWaypointFn({ lat: loc.lat, lng: loc.lng, name: loc.name, googleMapsUrl: loc.googleMapsUrl })
    }
    setFoundLocs([]); setSelectedLocs(new Set()); setImportUrl(''); setTab('stops'); setAddingAll(false)
  }

  async function buildItinerary() {
    setBuildingItin(true)
    setItinMsg('')
    try {
      const res = await fetch(`/api/trips/${id}/itinerary/from-waypoints`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItinMsg(`✓ Built ${data.days} itinerary days`)
      setTimeout(() => setItinMsg(''), 4000)
    } catch (e) {
      setItinMsg(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBuildingItin(false)
    }
  }

  async function deleteWaypoint(wpId: string) {
    await fetch(`/api/trips/${id}/waypoints/${wpId}`, { method: 'DELETE' })
    setWaypoints(prev => prev.filter(w => w.id !== wpId).map((w, i) => ({ ...w, order: i })))
  }

  async function updateWaypoint(wpId: string, patch: Partial<Waypoint>) {
    await fetch(`/api/trips/${id}/waypoints/${wpId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    setWaypoints(prev => prev.map(w => w.id === wpId ? { ...w, ...patch } : w))
  }

  async function moveWaypoint(wpId: string, dir: -1 | 1) {
    const sorted = [...waypoints].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(w => w.id === wpId)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= sorted.length) return
    const updated = [...sorted];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    const patches = updated.map((w, i) => ({ ...w, order: i }))
    setWaypoints(patches)
    await Promise.all(patches.map(w => fetch(`/api/trips/${id}/waypoints/${w.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: w.order }),
    })))
  }

  function panTo(wp: Waypoint) {
    mapObj.current?.setView([wp.lat, wp.lng], 13, { animate: true })
    const sorted = [...waypoints].sort((a, b) => a.order - b.order)
    markersRef.current[sorted.findIndex(w => w.id === wp.id)]?.openPopup()
  }

  const sorted = [...waypoints].sort((a, b) => a.order - b.order)
  const totalKm = roadSegments.length > 0
    ? roadSegments.reduce((s, d) => s + d, 0)
    : Math.round(sorted.length > 1 ? sorted.slice(1).reduce((sum, wp, i) => sum + haversineKm(sorted[i], wp), 0) : 0)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <Link href={`/trips/${id}`} className="text-stone-400 hover:text-stone-700 text-sm">← {tripName || 'Trip'}</Link>
        <span className="font-bold text-stone-800">🗺️ Map Planner</span>
        {waypoints.length > 0 && (
          <span className="ml-auto text-xs text-stone-400">
            {sorted.length} stop{sorted.length !== 1 ? 's' : ''}{totalKm > 0 && ` · ~${Math.round(totalKm)} km`}
          </span>
        )}
        <button
          onClick={() => setClickToAdd(v => !v)}
          className={`text-xs rounded px-2 py-1 border transition-colors ${clickToAdd ? 'bg-forest-700 text-white border-forest-700' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}`}
        >
          {clickToAdd ? '📍 Click map…' : '+ Click to add'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 shrink-0 flex flex-col border-r border-stone-200 bg-white overflow-hidden">
          <div className="flex border-b border-stone-200 text-xs font-semibold">
            {(['navigate', 'stops', 'fuel', 'import'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 transition-colors ${tab === t ? 'bg-forest-50 text-forest-700 border-b-2 border-forest-600' : 'text-stone-500 hover:text-stone-700'}`}>
                {t === 'navigate' ? '🧭' : t === 'stops' ? `📍 ${waypoints.length}` : t === 'fuel' ? '⛽' : '⬇'}
              </button>
            ))}
          </div>

          {/* Navigate tab */}
          {tab === 'navigate' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="label">Search place or enter coordinates</label>
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    placeholder="-25.3, 153.1 or place name…"
                    value={navQ}
                    onChange={e => { setNavQ(e.target.value); setNavResults([]) }}
                    onKeyDown={e => e.key === 'Enter' && searchNav()}
                  />
                  <button onClick={searchNav} disabled={navSearching || !navQ.trim()} className="btn-primary text-sm px-3 disabled:opacity-40">
                    {navSearching ? '…' : '🔍'}
                  </button>
                </div>
              </div>

              {navResults.length > 1 && (
                <div className="space-y-1">
                  {navResults.map((r, i) => (
                    <button key={i} onClick={() => { setNavTarget(r); setNavResults([]) }}
                      className="w-full text-left p-2 rounded-lg border border-stone-200 hover:border-forest-400 hover:bg-forest-50 text-sm">
                      <p className="font-medium text-stone-800 truncate">{r.name.split(',')[0]}</p>
                      <p className="text-xs text-stone-400 truncate">{r.name.split(',').slice(1, 3).join(',')}</p>
                    </button>
                  ))}
                </div>
              )}

              {navTarget && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
                    <p className="text-sm font-semibold text-stone-800 truncate">{navTarget.name.split(',')[0]}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{navTarget.lat.toFixed(5)}, {navTarget.lng.toFixed(5)}</p>
                  </div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Navigate with</p>
                  <div className="space-y-2">
                    {(() => { const nav = navLinks(navTarget.lat, navTarget.lng, navTarget.name); return (<>
                      <a href={nav.google} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-800 font-semibold text-sm">
                        <span className="text-xl">🗺️</span> Google Maps
                      </a>
                      <a href={nav.waze} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors text-cyan-800 font-semibold text-sm">
                        <span className="text-xl">🚗</span> Waze
                      </a>
                      <a href={nav.apple} target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 w-full p-3 rounded-lg border-2 border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors text-stone-700 font-semibold text-sm">
                        <span className="text-xl">🍎</span> Apple Maps
                      </a>
                    </>)})()}
                  </div>
                  <button
                    onClick={() => addWaypointFn({ lat: navTarget.lat, lng: navTarget.lng, name: navTarget.name.split(',')[0] })}
                    className="w-full text-xs text-forest-600 hover:underline text-center"
                  >
                    + Save as stop on this trip
                  </button>
                  <button onClick={() => { setNavTarget(null); setNavQ('') }} className="w-full text-xs text-stone-400 hover:text-stone-600 text-center">
                    Clear
                  </button>
                </div>
              )}

              {!navTarget && !navSearching && homeLoc && (
                <button
                  onClick={() => setNavTarget(homeLoc)}
                  className="w-full flex items-center gap-2 text-sm text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-lg px-3 py-2 transition-colors"
                >
                  <span>🏠</span>
                  <span className="font-medium">Navigate Home</span>
                </button>
              )}
              {!navTarget && !navSearching && !homeLoc && (
                <p className="text-xs text-stone-400 text-center">Enter a place or coordinates to navigate</p>
              )}
            </div>
          )}

          {/* Stops tab */}
          {tab === 'stops' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {sorted.length === 0 ? (
                <div className="p-4 text-center text-stone-400 text-sm flex-1">
                  <div className="text-3xl mb-2">📍</div>
                  <p>No stops added yet.</p>
                  <p className="mt-1 text-xs">Use Navigate tab, Import a link, or click the map.</p>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    {sorted.map((wp, idx) => {
                      const t = typeFor(wp.type)
                      const nav = navLinks(wp.lat, wp.lng, wp.name)
                      const isEditing = editingId === wp.id
                      const nights = wp.nights ?? 1
                      const segKm = idx > 0 ? (roadSegments[idx - 1] ?? Math.round(haversineKm(sorted[idx - 1], wp) * 1.35)) : 0
                      return (
                        <div key={wp.id}>
                        {idx > 0 && (
                          <div className="flex items-center gap-2 px-3 py-0.5 bg-stone-50 border-y border-stone-100">
                            <div className="flex-1 border-t border-dashed border-stone-300" />
                            <span className="text-xs text-stone-400 whitespace-nowrap font-medium">~{Math.round(segKm)} km</span>
                            <div className="flex-1 border-t border-dashed border-stone-300" />
                          </div>
                        )}
                        <div className="p-3 hover:bg-stone-50 group border-b border-stone-100">
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5" style={{ background: t.color }}>{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input className="input text-sm w-full py-0.5" value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { updateWaypoint(wp.id, { name: editName }); setEditingId(null) } if (e.key === 'Escape') setEditingId(null) }}
                                  onBlur={() => { updateWaypoint(wp.id, { name: editName }); setEditingId(null) }} autoFocus />
                              ) : (
                                <button onClick={() => panTo(wp)} className="text-sm font-medium text-stone-800 text-left hover:text-forest-700 truncate w-full">{wp.name}</button>
                              )}
                              <select value={wp.type} onChange={e => updateWaypoint(wp.id, { type: e.target.value as WaypointType })}
                                className="mt-0.5 text-xs border-0 bg-transparent text-stone-400 cursor-pointer focus:outline-none">
                                {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.icon} {tp.label}</option>)}
                              </select>

                              {/* Nights picker */}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-xs text-stone-400">Nights:</span>
                                <button
                                  onClick={() => updateWaypoint(wp.id, { nights: Math.max(0, nights - 1) })}
                                  className="w-5 h-5 rounded border border-stone-300 text-stone-500 hover:bg-stone-100 text-xs leading-none flex items-center justify-center"
                                >−</button>
                                <span className="text-xs font-bold w-4 text-center text-stone-700">{nights}</span>
                                <button
                                  onClick={() => updateWaypoint(wp.id, { nights: nights + 1 })}
                                  className="w-5 h-5 rounded border border-stone-300 text-stone-500 hover:bg-stone-100 text-xs leading-none flex items-center justify-center"
                                >+</button>
                                {nights === 0 && <span className="text-xs text-stone-400 italic">transit only</span>}
                              </div>

                              {/* Navigate buttons */}
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                <a href={nav.google} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Google Maps</a>
                                <a href={nav.waze} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-medium">Waze</a>
                                <a href={nav.apple} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium">Apple Maps</a>
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                              <button onClick={() => moveWaypoint(wp.id, -1)} disabled={idx === 0} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 text-xs">▲</button>
                              <button onClick={() => moveWaypoint(wp.id, 1)} disabled={idx === sorted.length - 1} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 text-xs">▼</button>
                            </div>
                            <button onClick={() => { setEditingId(wp.id); setEditName(wp.name) }} className="shrink-0 text-xs text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100">✏️</button>
                            <button onClick={() => deleteWaypoint(wp.id)} className="shrink-0 text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">✕</button>
                          </div>
                        </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Build Itinerary footer */}
                  <div className="shrink-0 p-3 border-t border-stone-200 bg-stone-50 space-y-2">
                    {homeLoc && !sorted.some(w => w.type === 'start') && (
                      <button
                        onClick={() => addWaypointFn({ lat: homeLoc.lat, lng: homeLoc.lng, name: homeLoc.name.split(',')[0], type: 'start', nights: 0 })}
                        className="w-full flex items-center gap-2 text-sm text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-lg px-3 py-2 transition-colors"
                      >
                        <span>🏠</span>
                        <span className="font-medium">Add home as starting point</span>
                      </button>
                    )}
                    {!homeLoc && (
                      <Link href="/settings" className="w-full flex items-center gap-2 text-sm text-stone-500 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg px-3 py-2 transition-colors">
                        <span>🏠</span>
                        <span>Set home location in Settings</span>
                      </Link>
                    )}
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>{sorted.length} stops</span>
                      <span>{sorted.reduce((s, w) => s + (w.nights ?? 1), 0)} nights total</span>
                    </div>
                    {itinMsg && (
                      <p className={`text-xs rounded p-2 ${itinMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{itinMsg}</p>
                    )}
                    <button
                      onClick={buildItinerary}
                      disabled={buildingItin}
                      className="btn-primary w-full justify-center text-sm disabled:opacity-40"
                    >
                      {buildingItin ? 'Building…' : '📅 Build Trip Itinerary'}
                    </button>
                    <p className="text-xs text-stone-400 text-center">Replaces the current itinerary tab</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Import tab */}
          {tab === 'import' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {foundLocs.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-stone-800 text-sm">Found {foundLocs.length} places</h3>
                    <button onClick={() => { setFoundLocs([]); setSelectedLocs(new Set()) }} className="text-xs text-stone-400 hover:text-stone-600">✕</button>
                  </div>
                  <div className="space-y-1.5">
                    {foundLocs.map((loc, i) => (
                      <label key={i} className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer">
                        <input type="checkbox" checked={selectedLocs.has(i)}
                          onChange={() => setSelectedLocs(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n })}
                          className="rounded border-stone-300 text-forest-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800 truncate">{loc.name}</p>
                          <p className="text-xs text-stone-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={addSelectedLocs} disabled={addingAll || selectedLocs.size === 0} className="btn-primary w-full justify-center disabled:opacity-40">
                    {addingAll ? 'Adding…' : `Add ${selectedLocs.size} stop${selectedLocs.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-stone-800 text-sm">Import from Google Maps link</h3>
                  <p className="text-xs text-stone-500">Paste a place link or directions link with multiple stops</p>
                  <textarea className="input text-sm min-h-[80px] resize-none" placeholder="Paste Google Maps link…"
                    value={importUrl} onChange={e => { setImportUrl(e.target.value); setImportErr('') }} />
                  {importErr && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{importErr}</p>}
                  <button onClick={handleImport} disabled={importing || !importUrl.trim()} className="btn-primary w-full justify-center disabled:opacity-40">
                    {importing ? 'Resolving…' : '⬇ Import'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Fuel tab */}
          {tab === 'fuel' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {!vehicle ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-2xl">⛽</p>
                  <p className="text-sm font-semibold text-stone-700">No vehicle configured</p>
                  <Link href="/settings" className="text-xs text-forest-600 hover:underline">Set up your vehicle in Settings →</Link>
                </div>
              ) : sorted.length < 2 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-stone-400">Add at least 2 stops to see the fuel plan.</p>
                </div>
              ) : (() => {
                const consumption = vehicle.isTowing ? vehicle.towingConsumptionL100km : vehicle.consumptionL100km
                const safeRangeKm = Math.round(vehicle.tankSizeL * 0.85 / consumption * 100)
                let tank = vehicle.tankSizeL // start full
                let totalFuel = 0
                const segments = sorted.slice(1).map((wp, i) => {
                  const km  = roadSegments[i] ?? Math.round(haversineKm(sorted[i], wp) * 1.35)
                  const fuel = parseFloat(((km * consumption) / 100).toFixed(1))
                  tank -= fuel
                  totalFuel += fuel
                  const isFuelStop = wp.type === 'fuel'
                  const danger = tank < vehicle.tankSizeL * 0.15
                  const warn   = tank < vehicle.tankSizeL * 0.25 && !danger
                  if (isFuelStop) tank = vehicle.tankSizeL // refuel
                  return { wp, from: sorted[i], km, fuel, tankAfter: parseFloat(tank.toFixed(1)), isFuelStop, danger, warn }
                })
                const totalCost = vehicle.fuelPricePerL > 0 ? totalFuel * vehicle.fuelPricePerL : 0

                return (
                  <>
                    {/* Summary */}
                    <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-stone-700">
                        {vehicle.isTowing ? '🚗+🏕️ Towing' : '🚗 Solo'} · {vehicle.fuelType.charAt(0).toUpperCase()+vehicle.fuelType.slice(1)} · {vehicle.tankSizeL}L tank
                      </p>
                      <p className="text-xs text-stone-500">{consumption} L/100km · safe range ~{safeRangeKm} km</p>
                      <div className="flex gap-3 mt-2 pt-2 border-t border-stone-200">
                        <div>
                          <p className="text-xs text-stone-400">Total fuel</p>
                          <p className="text-sm font-bold text-stone-800">~{Math.round(totalFuel)} L</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-400">Est. cost</p>
                          <p className="text-sm font-bold text-stone-800">{totalCost > 0 ? `~$${Math.round(totalCost)}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-stone-400">Total km</p>
                          <p className="text-sm font-bold text-stone-800">{totalKm > 0 ? `${totalKm} km` : '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Per-segment breakdown */}
                    <div className="space-y-0">
                      {/* Start */}
                      <div className="flex items-center gap-2 py-1.5 px-2">
                        <span className="text-lg">🏁</span>
                        <p className="text-xs font-semibold text-stone-700 truncate">{sorted[0].name}</p>
                        <span className="ml-auto text-xs text-stone-400">Full tank · {vehicle.tankSizeL}L</span>
                      </div>

                      {segments.map((seg, i) => (
                        <div key={i}>
                          {/* Segment arrow */}
                          <div className={`mx-4 border-l-2 border-dashed pl-3 py-1 ${seg.danger ? 'border-red-400' : seg.warn ? 'border-amber-400' : 'border-stone-300'}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${seg.danger ? 'text-red-600' : seg.warn ? 'text-amber-600' : 'text-stone-500'}`}>
                                {seg.km} km · -{seg.fuel}L
                              </span>
                              {seg.danger && <span className="text-red-600 font-bold text-xs bg-red-50 rounded px-1">⚠ Low fuel</span>}
                              {seg.warn  && <span className="text-amber-600 font-bold text-xs bg-amber-50 rounded px-1">⚡ Watch fuel</span>}
                            </div>
                            {vehicle.fuelPricePerL > 0 && (
                              <p className="text-xs text-stone-400">~${(seg.fuel * vehicle.fuelPricePerL).toFixed(0)} · {seg.tankAfter < 0 ? <span className="text-red-600">INSUFFICIENT RANGE</span> : `${Math.max(0,seg.tankAfter)}L remaining`}</p>
                            )}
                          </div>

                          {/* Stop */}
                          <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${seg.isFuelStop ? 'bg-amber-50 border border-amber-200' : seg.danger ? 'bg-red-50' : ''}`}>
                            <span className="text-base">{seg.isFuelStop ? '⛽' : typeFor(seg.wp.type).icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-700 truncate">{seg.wp.name}</p>
                              {seg.isFuelStop && <p className="text-xs text-amber-700">Refuel here → back to {vehicle.tankSizeL}L</p>}
                            </div>
                            <span className={`text-xs font-medium shrink-0 ${seg.tankAfter < vehicle.tankSizeL * 0.15 && !seg.isFuelStop ? 'text-red-600' : 'text-stone-400'}`}>
                              {seg.isFuelStop ? `${vehicle.tankSizeL}L` : `${Math.max(0, seg.tankAfter)}L`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-stone-400 text-center pt-1">Mark a stop as ⛽ Fuel Stop to auto-refuel. Add fuel stops for remote legs.</p>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Map */}
        <div ref={mapRef} className="flex-1" style={{ cursor: clickToAdd ? 'crosshair' : 'grab' }} />
      </div>
    </div>
  )
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}
