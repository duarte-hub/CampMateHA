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
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${dest}&destination_place_id=${encodeURIComponent(name)}`,
    apple:  `https://maps.apple.com/?daddr=${dest}&dirflg=d`,
    waze:   `https://waze.com/ul?ll=${dest}&navigate=yes`,
  }
}

function markerHtml(icon: string, color: string, num: number, dayLabel?: string, nights?: number) {
  const subLabel = [
    dayLabel,
    nights !== undefined ? (nights === 0 ? 'transit' : `${nights}🌙`) : undefined,
  ].filter(Boolean).join(' · ')
  return `<div style="position:relative;width:36px;text-align:center">
    <div style="width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:15px;line-height:1">${icon}</span>
    </div>
    <div style="position:absolute;top:-6px;right:-6px;background:white;color:${color};
      font-size:10px;font-weight:700;width:16px;height:16px;border-radius:50%;
      border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;
      box-shadow:0 1px 3px rgba(0,0,0,.2);">${num}</div>
    ${subLabel ? `<div style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);
      background:rgba(30,30,30,.8);color:white;font-size:9px;font-weight:600;
      padding:1px 5px;border-radius:3px;white-space:nowrap;pointer-events:none">${subLabel}</div>` : ''}
  </div>`
}

function computeArrivalDates(sorted: Waypoint[], startDate: string): string[] {
  if (!startDate) return sorted.map(() => '')
  const dates: string[] = []
  const d = new Date(startDate + 'T00:00:00')
  sorted.forEach((wp, idx) => {
    if (idx > 0) d.setDate(d.getDate() + (sorted[idx - 1].nights ?? 1))
    dates.push(d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }))
  })
  return dates
}

export default function MapPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const mapRef        = useRef<HTMLDivElement>(null)
  const mapObj        = useRef<import('leaflet').Map | null>(null)
  const markersRef    = useRef<import('leaflet').Marker[]>([])
  const lineRef       = useRef<import('leaflet').Polyline | null>(null)
  const navPinRef     = useRef<import('leaflet').Marker | null>(null)
  const distLabelsRef = useRef<import('leaflet').Marker[]>([])
  const hasFitRef     = useRef(false)
  const updateWpRef   = useRef<((id: string, patch: Partial<Waypoint>) => Promise<void>) | null>(null)

  const [waypoints,      setWaypoints]      = useState<Waypoint[]>([])
  const [tripName,       setTripName]       = useState('')
  const [tripStart,      setTripStart]      = useState('')
  const [tab,            setTab]            = useState<'stops' | 'fuel' | 'import'>('stops')
  const [vehicle,        setVehicleConfig]  = useState<VehicleConfig | null>(null)
  const [editingId,      setEditingId]      = useState<string | null>(null)
  const [editName,       setEditName]       = useState('')
  const [buildingItin,   setBuildingItin]   = useState(false)
  const [itinMsg,        setItinMsg]        = useState('')
  const [homeLoc,        setHomeLoc]        = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [roadSegments,   setRoadSegments]   = useState<number[]>([])
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  // Floating search
  const [searchQ,       setSearchQ]       = useState('')
  const [searchResults, setSearchResults] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [searching,     setSearching]     = useState(false)
  const [showResults,   setShowResults]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Right-click context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null)
  const [ctxName, setCtxName] = useState('')

  // Navigate target pin
  const [navTarget, setNavTarget] = useState<{ name: string; lat: number; lng: number } | null>(null)

  // Import
  const [importUrl,    setImportUrl]    = useState('')
  const [importErr,    setImportErr]    = useState('')
  const [importing,    setImporting]    = useState(false)
  const [foundLocs,    setFoundLocs]    = useState<{ name: string; lat: number; lng: number; googleMapsUrl: string }[]>([])
  const [selectedLocs, setSelectedLocs] = useState<Set<number>>(new Set())
  const [addingAll,    setAddingAll]    = useState(false)

  // Load data
  useEffect(() => {
    fetch(`/api/trips/${id}`).then(r => r.json()).then(t => {
      setTripName(t.title || t.destination)
      setTripStart(t.startDate ?? '')
    })
    fetch(`/api/trips/${id}/waypoints`).then(r => r.json()).then(setWaypoints)
    fetch('/api/settings').then(r => r.json()).then(d => {
      setHomeLoc(d.homeLocation ?? null)
      setVehicleConfig(d.vehicleConfig ?? null)
    })
  }, [id])

  // Road distances
  useEffect(() => {
    const s = [...waypoints].sort((a, b) => a.order - b.order)
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
      const map = L.map(mapRef.current, { zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 80, wheelDebounceTime: 20 }).setView([-25.5, 134], 5)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      map.on('contextmenu', (e: import('leaflet').LeafletMouseEvent) => {
        setCtxMenu({ x: e.containerPoint.x, y: e.containerPoint.y, lat: e.latlng.lat, lng: e.latlng.lng })
        setCtxName('')
      })
      map.on('click', () => { setCtxMenu(null); setShowResults(false) })

      mapObj.current = map
    })
    return () => { mapObj.current?.remove(); mapObj.current = null }
  }, [])

  const updateWaypoint = useCallback(async (wpId: string, patch: Partial<Waypoint>) => {
    await fetch(`/api/trips/${id}/waypoints/${wpId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    setWaypoints(prev => prev.map(w => w.id === wpId ? { ...w, ...patch } : w))
  }, [id])

  useEffect(() => { updateWpRef.current = updateWaypoint }, [updateWaypoint])

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

  // Sync markers, route line, distance labels
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      lineRef.current?.remove(); lineRef.current = null
      distLabelsRef.current.forEach(m => m.remove()); distLabelsRef.current = []

      const sorted = [...waypoints].sort((a, b) => a.order - b.order)
      const latlngs: [number, number][] = []
      const dates = computeArrivalDates(sorted, tripStart)

      sorted.forEach((wp, idx) => {
        const t = typeFor(wp.type)
        const dayLabel = dates[idx]
          ? dates[idx].split(' ').slice(0, 2).join(' ')  // "Mon 16 Jun" → "Mon 16"
          : undefined
        const nights = wp.nights ?? 1
        const hasSubLabel = !!(dayLabel || nights !== undefined)
        const icon = L.divIcon({
          className: '',
          html: markerHtml(t.icon, t.color, idx + 1, dayLabel, nights),
          iconSize: [36, hasSubLabel ? 56 : 42],
          iconAnchor: [18, hasSubLabel ? 56 : 42],
          popupAnchor: [0, hasSubLabel ? -58 : -44],
        })
        const nav = navLinks(wp.lat, wp.lng, wp.name)
        const marker = L.marker([wp.lat, wp.lng], { icon, draggable: true } as import('leaflet').MarkerOptions)
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <strong style="font-size:13px">${wp.name}</strong><br>
              <span style="font-size:11px;color:#6b7280">${t.icon} ${t.label}</span>
              ${dates[idx] ? `<br><span style="font-size:11px;color:#15803d">📅 ${dates[idx]}</span>` : ''}
              <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
                <a href="${nav.google}" target="_blank" style="font-size:11px;padding:3px 8px;background:#4285f4;color:white;border-radius:4px;text-decoration:none">Google Maps</a>
                <a href="${nav.waze}" target="_blank" style="font-size:11px;padding:3px 8px;background:#05c8f7;color:white;border-radius:4px;text-decoration:none">Waze</a>
                <a href="${nav.apple}" target="_blank" style="font-size:11px;padding:3px 8px;background:#555;color:white;border-radius:4px;text-decoration:none">Apple Maps</a>
              </div>
            </div>`)

        marker.on('dragend', () => {
          const { lat, lng } = (marker as import('leaflet').Marker).getLatLng()
          updateWpRef.current?.(wp.id, { lat, lng })
        })

        markersRef.current.push(marker)
        latlngs.push([wp.lat, wp.lng])
      })

      if (latlngs.length > 1) {
        lineRef.current = L.polyline(latlngs, {
          color: '#15803d', weight: 4, dashArray: '10,7', opacity: 0.8,
        }).addTo(map)

        // Distance labels at segment midpoints
        sorted.slice(1).forEach((wp, i) => {
          const prev = sorted[i]
          const km = roadSegments[i] ?? Math.round(haversineKm(prev, wp) * 1.35)
          const midLat = (prev.lat + wp.lat) / 2
          const midLng = (prev.lng + wp.lng) / 2
          const lbl = L.marker([midLat, midLng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="background:white;border:1.5px solid #d1d5db;border-radius:10px;
                padding:2px 8px;font-size:11px;font-weight:700;color:#374151;white-space:nowrap;
                box-shadow:0 1px 4px rgba(0,0,0,.18)">${km} km</div>`,
              iconSize: [72, 22],
              iconAnchor: [36, 11],
            }),
            interactive: false,
            zIndexOffset: -200,
          } as import('leaflet').MarkerOptions).addTo(map)
          distLabelsRef.current.push(lbl)
        })
      }

      if (latlngs.length > 0 && !hasFitRef.current) {
        hasFitRef.current = true
        try {
          map.fitBounds(
            latlngs.length === 1
              ? [[latlngs[0][0] - 0.5, latlngs[0][1] - 0.5], [latlngs[0][0] + 0.5, latlngs[0][1] + 0.5]]
              : latlngs,
            { padding: [50, 50], maxZoom: 13 }
          )
        } catch { /* ignore */ }
      }
    })
  }, [waypoints, tripStart, roadSegments])

  // Nav target preview pin
  useEffect(() => {
    const map = mapObj.current
    if (!map) return
    import('leaflet').then(({ default: L }) => {
      navPinRef.current?.remove()
      if (!navTarget) return
      navPinRef.current = L.marker([navTarget.lat, navTarget.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;
            border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        }),
      }).addTo(map).bindPopup(`<strong>${navTarget.name.split(',')[0]}</strong>`).openPopup()
      map.flyTo([navTarget.lat, navTarget.lng], 13, { duration: 1.2 })
    })
    return () => { navPinRef.current?.remove(); navPinRef.current = null }
  }, [navTarget])

  // Close search results on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function doSearch() {
    if (!searchQ.trim()) return
    const coordMatch = searchQ.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]), lng = parseFloat(coordMatch[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setNavTarget({ name: searchQ.trim(), lat, lng })
        setShowResults(false)
        return
      }
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/trips/${id}/waypoints/search?q=${encodeURIComponent(searchQ)}`)
      const results = await res.json()
      setSearchResults(results)
      setShowResults(true)
      if (results.length === 1) {
        setNavTarget(results[0])
        setShowResults(false)
      }
    } catch { setSearchResults([]) }
    finally { setSearching(false) }
  }

  async function deleteWaypoint(wpId: string) {
    await fetch(`/api/trips/${id}/waypoints/${wpId}`, { method: 'DELETE' })
    setWaypoints(prev => prev.filter(w => w.id !== wpId).map((w, i) => ({ ...w, order: i })))
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
    const sorted = [...waypoints].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(w => w.id === wp.id)
    mapObj.current?.setView([wp.lat, wp.lng], 13, { animate: true })
    markersRef.current[idx]?.openPopup()
  }

  async function buildItinerary() {
    setBuildingItin(true); setItinMsg('')
    try {
      const res = await fetch(`/api/trips/${id}/itinerary/from-waypoints`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItinMsg(`✓ Built ${data.days} itinerary days`)
      setTimeout(() => setItinMsg(''), 4000)
    } catch (e) { setItinMsg(e instanceof Error ? e.message : 'Failed') }
    finally { setBuildingItin(false) }
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
      if (data.locations.length === 1) {
        await addWaypointFn({ lat: data.locations[0].lat, lng: data.locations[0].lng, name: data.locations[0].name, googleMapsUrl: data.locations[0].googleMapsUrl })
        setImportUrl(''); setTab('stops')
      } else {
        setFoundLocs(data.locations)
        setSelectedLocs(new Set(data.locations.map((_: unknown, i: number) => i)))
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

  async function addCtxStop() {
    if (!ctxMenu) return
    const name = ctxName.trim() || `Stop ${waypoints.length + 1}`
    await addWaypointFn({ lat: ctxMenu.lat, lng: ctxMenu.lng, name })
    setCtxMenu(null)
    setTab('stops')
  }

  async function setHomeFromCtx() {
    if (!ctxMenu) return
    await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeLocation: { name: 'Home', lat: ctxMenu.lat, lng: ctxMenu.lng } }),
    })
    setHomeLoc({ name: 'Home', lat: ctxMenu.lat, lng: ctxMenu.lng })
    setCtxMenu(null)
  }

  const sorted = [...waypoints].sort((a, b) => a.order - b.order)
  const totalKm = roadSegments.length > 0
    ? Math.round(roadSegments.reduce((s, d) => s + d, 0))
    : Math.round(sorted.length > 1 ? sorted.slice(1).reduce((sum, wp, i) => sum + haversineKm(sorted[i], wp) * 1.35, 0) : 0)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-200 bg-white shrink-0">
        <Link href={`/trips/${id}`} className="text-stone-400 hover:text-stone-700 text-sm">← {tripName || 'Trip'}</Link>
        <span className="font-bold text-stone-800">🗺️ Map</span>
        {waypoints.length > 0 && (
          <span className="ml-auto text-xs text-stone-400">
            {sorted.length} stop{sorted.length !== 1 ? 's' : ''}{totalKm > 0 && ` · ~${totalKm} km`}
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`shrink-0 flex flex-col border-r border-stone-200 bg-white overflow-hidden transition-all duration-200 ${panelCollapsed ? 'w-0' : 'w-72'}`}>
          {/* Tabs */}
          <div className="flex border-b border-stone-200 text-xs font-semibold">
            {(['stops', 'fuel', 'import'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 transition-colors ${tab === t ? 'bg-forest-50 text-forest-700 border-b-2 border-forest-600' : 'text-stone-500 hover:text-stone-700'}`}>
                {t === 'stops' ? `📍 ${waypoints.length}` : t === 'fuel' ? '⛽' : '⬇'}
              </button>
            ))}
          </div>

          {/* Stops tab */}
          {tab === 'stops' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              {sorted.length === 0 ? (
                <div className="p-4 text-center text-stone-400 text-sm flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="text-3xl">📍</div>
                  <p>No stops yet.</p>
                  <p className="text-xs">Right-click the map to add a stop,<br/>or search for a place above.</p>
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
                              <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5 cursor-pointer"
                                style={{ background: t.color }} onClick={() => panTo(wp)}>{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <input className="input text-sm w-full py-0.5" value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') { updateWaypoint(wp.id, { name: editName }); setEditingId(null) }
                                      if (e.key === 'Escape') setEditingId(null)
                                    }}
                                    onBlur={() => { updateWaypoint(wp.id, { name: editName }); setEditingId(null) }}
                                    autoFocus />
                                ) : (
                                  <button onClick={() => panTo(wp)}
                                    className="text-sm font-medium text-stone-800 text-left hover:text-forest-700 truncate w-full">{wp.name}</button>
                                )}
                                <select value={wp.type}
                                  onChange={e => updateWaypoint(wp.id, { type: e.target.value as WaypointType })}
                                  className="mt-0.5 text-xs border-0 bg-transparent text-stone-400 cursor-pointer focus:outline-none">
                                  {TYPES.map(tp => <option key={tp.value} value={tp.value}>{tp.icon} {tp.label}</option>)}
                                </select>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-xs text-stone-400">Nights:</span>
                                  <button onClick={() => updateWaypoint(wp.id, { nights: Math.max(0, nights - 1) })}
                                    className="w-5 h-5 rounded border border-stone-300 text-stone-500 hover:bg-stone-100 text-xs flex items-center justify-center">−</button>
                                  <span className="text-xs font-bold w-4 text-center text-stone-700">{nights}</span>
                                  <button onClick={() => updateWaypoint(wp.id, { nights: nights + 1 })}
                                    className="w-5 h-5 rounded border border-stone-300 text-stone-500 hover:bg-stone-100 text-xs flex items-center justify-center">+</button>
                                  {nights === 0 && <span className="text-xs text-stone-400 italic">transit</span>}
                                </div>
                                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                  <a href={nav.google} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium">Google</a>
                                  <a href={nav.waze} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-medium">Waze</a>
                                  <a href={nav.apple} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 font-medium">Apple</a>
                                </div>
                              </div>
                              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                                <button onClick={() => moveWaypoint(wp.id, -1)} disabled={idx === 0} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 text-xs">▲</button>
                                <button onClick={() => moveWaypoint(wp.id, 1)} disabled={idx === sorted.length - 1} className="text-stone-400 hover:text-stone-700 disabled:opacity-20 text-xs">▼</button>
                              </div>
                              <button onClick={() => { setEditingId(wp.id); setEditName(wp.name) }}
                                className="shrink-0 text-xs text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100">✏️</button>
                              <button onClick={() => deleteWaypoint(wp.id)}
                                className="shrink-0 text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">✕</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="shrink-0 p-3 border-t border-stone-200 bg-stone-50 space-y-2">
                    {homeLoc && !sorted.some(w => w.type === 'start') && (
                      <button onClick={() => addWaypointFn({ lat: homeLoc.lat, lng: homeLoc.lng, name: homeLoc.name.split(',')[0], type: 'start', nights: 0 })}
                        className="w-full flex items-center gap-2 text-sm text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-lg px-3 py-2">
                        <span>🏠</span><span className="font-medium">Add home as start</span>
                      </button>
                    )}
                    <div className="flex justify-between text-xs text-stone-500">
                      <span>{sorted.length} stops</span>
                      <span>{sorted.reduce((s, w) => s + (w.nights ?? 1), 0)} nights total</span>
                    </div>
                    {itinMsg && (
                      <p className={`text-xs rounded p-2 ${itinMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{itinMsg}</p>
                    )}
                    <button onClick={buildItinerary} disabled={buildingItin}
                      className="btn-primary w-full justify-center text-sm disabled:opacity-40">
                      {buildingItin ? 'Building…' : '📅 Build Trip Itinerary'}
                    </button>
                    <p className="text-xs text-stone-400 text-center">Replaces the current itinerary tab</p>
                  </div>
                </>
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
                  <Link href="/settings" className="text-xs text-forest-600 hover:underline">Set up in Settings →</Link>
                </div>
              ) : sorted.length < 2 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-stone-400">Add at least 2 stops to see the fuel plan.</p>
                </div>
              ) : (() => {
                const consumption = vehicle.isTowing ? vehicle.towingConsumptionL100km : vehicle.consumptionL100km
                const safeRangeKm = Math.round(vehicle.tankSizeL * 0.85 / consumption * 100)
                let tank = vehicle.tankSizeL
                let totalFuel = 0
                const segments = sorted.slice(1).map((wp, i) => {
                  const km   = roadSegments[i] ?? Math.round(haversineKm(sorted[i], wp) * 1.35)
                  const fuel = parseFloat(((km * consumption) / 100).toFixed(1))
                  tank -= fuel; totalFuel += fuel
                  const isFuelStop = wp.type === 'fuel'
                  const danger = tank < vehicle.tankSizeL * 0.15
                  const warn   = tank < vehicle.tankSizeL * 0.25 && !danger
                  if (isFuelStop) tank = vehicle.tankSizeL
                  return { wp, from: sorted[i], km, fuel, tankAfter: parseFloat(tank.toFixed(1)), isFuelStop, danger, warn }
                })
                const totalCost = vehicle.fuelPricePerL > 0 ? totalFuel * vehicle.fuelPricePerL : 0
                return (
                  <>
                    <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-stone-700">
                        {vehicle.isTowing ? '🚗+🏕️ Towing' : '🚗 Solo'} · {vehicle.fuelType.charAt(0).toUpperCase()+vehicle.fuelType.slice(1)} · {vehicle.tankSizeL}L
                      </p>
                      <p className="text-xs text-stone-500">{consumption} L/100km · safe range ~{safeRangeKm} km</p>
                      <div className="flex gap-3 mt-2 pt-2 border-t border-stone-200">
                        <div><p className="text-xs text-stone-400">Total fuel</p><p className="text-sm font-bold text-stone-800">~{Math.round(totalFuel)} L</p></div>
                        <div><p className="text-xs text-stone-400">Est. cost</p><p className="text-sm font-bold text-stone-800">{totalCost > 0 ? `~$${Math.round(totalCost)}` : '—'}</p></div>
                        <div><p className="text-xs text-stone-400">Total km</p><p className="text-sm font-bold text-stone-800">{totalKm > 0 ? `${totalKm} km` : '—'}</p></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 py-1.5 px-2">
                        <span className="text-lg">🏁</span>
                        <p className="text-xs font-semibold text-stone-700 truncate">{sorted[0].name}</p>
                        <span className="ml-auto text-xs text-stone-400">Full · {vehicle.tankSizeL}L</span>
                      </div>
                      {segments.map((seg, i) => (
                        <div key={i}>
                          <div className={`mx-4 border-l-2 border-dashed pl-3 py-1 ${seg.danger ? 'border-red-400' : seg.warn ? 'border-amber-400' : 'border-stone-300'}`}>
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-medium ${seg.danger ? 'text-red-600' : seg.warn ? 'text-amber-600' : 'text-stone-500'}`}>{seg.km} km · -{seg.fuel}L</span>
                              {seg.danger && <span className="text-red-600 font-bold text-xs bg-red-50 rounded px-1">⚠ Low fuel</span>}
                              {seg.warn   && <span className="text-amber-600 font-bold text-xs bg-amber-50 rounded px-1">⚡ Watch fuel</span>}
                            </div>
                            {vehicle.fuelPricePerL > 0 && <p className="text-xs text-stone-400">~${(seg.fuel * vehicle.fuelPricePerL).toFixed(0)} · {seg.tankAfter < 0 ? <span className="text-red-600">INSUFFICIENT RANGE</span> : `${Math.max(0, seg.tankAfter)}L left`}</p>}
                          </div>
                          <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${seg.isFuelStop ? 'bg-amber-50 border border-amber-200' : seg.danger ? 'bg-red-50' : ''}`}>
                            <span className="text-base">{seg.isFuelStop ? '⛽' : typeFor(seg.wp.type).icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-stone-700 truncate">{seg.wp.name}</p>
                              {seg.isFuelStop && <p className="text-xs text-amber-700">Refuel → {vehicle.tankSizeL}L</p>}
                            </div>
                            <span className={`text-xs font-medium shrink-0 ${seg.tankAfter < vehicle.tankSizeL * 0.15 && !seg.isFuelStop ? 'text-red-600' : 'text-stone-400'}`}>
                              {seg.isFuelStop ? `${vehicle.tankSizeL}L` : `${Math.max(0, seg.tankAfter)}L`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-stone-400 text-center">Mark a stop as ⛽ Fuel Stop to auto-refuel.</p>
                  </>
                )
              })()}
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
                  <button onClick={addSelectedLocs} disabled={addingAll || selectedLocs.size === 0}
                    className="btn-primary w-full justify-center disabled:opacity-40">
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
                  <button onClick={handleImport} disabled={importing || !importUrl.trim()}
                    className="btn-primary w-full justify-center disabled:opacity-40">
                    {importing ? 'Resolving…' : '⬇ Import'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="flex-1 relative overflow-hidden">

          {/* Panel toggle */}
          <button
            onClick={() => setPanelCollapsed(v => !v)}
            className="absolute top-3 left-3 z-[1000] bg-white rounded-full shadow-md w-9 h-9 flex items-center justify-center text-stone-600 hover:bg-stone-50 border border-stone-200 text-sm"
            title={panelCollapsed ? 'Show panel' : 'Hide panel'}
          >
            {panelCollapsed ? '▶' : '◀'}
          </button>

          {/* Floating search bar */}
          <div ref={searchRef} className="absolute top-3 z-[1000]" style={{ left: 52, right: 12 }}>
            <div className="relative">
              <div className="flex gap-1 bg-white rounded-xl shadow-md border border-stone-200 overflow-hidden">
                <input
                  className="flex-1 text-sm px-4 py-2.5 outline-none bg-transparent placeholder:text-stone-400"
                  placeholder="Search places or enter coordinates…"
                  value={searchQ}
                  onChange={e => { setSearchQ(e.target.value); if (!e.target.value) { setSearchResults([]); setShowResults(false); setNavTarget(null) } }}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
                />
                {searchQ && (
                  <button onClick={() => { setSearchQ(''); setSearchResults([]); setShowResults(false); setNavTarget(null) }}
                    className="px-2 text-stone-400 hover:text-stone-700 text-lg leading-none">×</button>
                )}
                <button onClick={doSearch} disabled={searching || !searchQ.trim()}
                  className="px-4 py-2.5 text-forest-700 hover:bg-forest-50 font-semibold text-sm border-l border-stone-200 disabled:opacity-40 transition-colors">
                  {searching ? '…' : '🔍'}
                </button>
              </div>

              {/* Search results dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-stone-200 overflow-hidden max-h-60 overflow-y-auto">
                  {navTarget && (
                    <div className="px-4 py-2 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-600 truncate">{navTarget.name.split(',')[0]}</p>
                      <button
                        onClick={() => { addWaypointFn({ lat: navTarget.lat, lng: navTarget.lng, name: navTarget.name.split(',')[0] }); setShowResults(false); setTab('stops') }}
                        className="text-xs text-forest-700 font-semibold hover:underline shrink-0 ml-2">+ Add stop</button>
                    </div>
                  )}
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => { setNavTarget(r); setShowResults(false) }}
                      className="w-full text-left px-4 py-2.5 hover:bg-stone-50 border-b border-stone-100 last:border-0">
                      <p className="text-sm font-medium text-stone-800 truncate">📍 {r.name.split(',')[0]}</p>
                      <p className="text-xs text-stone-400 truncate">{r.name.split(',').slice(1, 3).join(',').trim()}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Nav target action bar */}
              {navTarget && !showResults && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-stone-200 px-4 py-2.5 flex items-center gap-3">
                  <p className="text-sm font-medium text-stone-800 flex-1 truncate">📍 {navTarget.name.split(',')[0]}</p>
                  <button
                    onClick={() => { addWaypointFn({ lat: navTarget.lat, lng: navTarget.lng, name: navTarget.name.split(',')[0] }); setNavTarget(null); setSearchQ(''); setTab('stops') }}
                    className="text-xs bg-forest-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-forest-700 shrink-0">
                    + Add stop
                  </button>
                  <button onClick={() => { setNavTarget(null); setSearchQ('') }} className="text-xs text-stone-400 hover:text-stone-600 shrink-0">✕</button>
                </div>
              )}
            </div>
          </div>

          {/* Right-click context menu */}
          {ctxMenu && (
            <div
              className="absolute z-[1001] bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 min-w-[190px]"
              style={{ left: Math.min(ctxMenu.x, (mapRef.current?.clientWidth ?? 400) - 200), top: Math.min(ctxMenu.y, (mapRef.current?.clientHeight ?? 400) - 160) }}
            >
              <p className="px-4 py-1 text-xs text-stone-400 font-mono">
                {ctxMenu.lat.toFixed(4)}, {ctxMenu.lng.toFixed(4)}
              </p>
              <div className="border-t border-stone-100 mt-1 pt-1">
                <div className="px-3 py-1">
                  <input
                    className="w-full text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-forest-400"
                    placeholder="Stop name…"
                    value={ctxName}
                    onChange={e => setCtxName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCtxStop()}
                    autoFocus
                  />
                </div>
                <button onClick={addCtxStop}
                  className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-forest-50 hover:text-forest-700 font-medium flex items-center gap-2">
                  <span>➕</span> Add stop here
                </button>
                <button onClick={setHomeFromCtx}
                  className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2">
                  <span>🏠</span> Set as home
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${ctxMenu.lat.toFixed(6)}, ${ctxMenu.lng.toFixed(6)}`); setCtxMenu(null) }}
                  className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2">
                  <span>📋</span> Copy coordinates
                </button>
              </div>
            </div>
          )}

          {/* Map */}
          <div ref={mapRef} className="absolute inset-0" />
        </div>
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
