'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Trip, Waypoint, ItineraryDay } from '@/lib/types'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const TRIP_COLORS = [
  { bg: 'bg-forest-600', text: 'text-white', light: 'bg-forest-100', border: 'border-forest-300', hex: '#15803d' },
  { bg: 'bg-ember-500',  text: 'text-white', light: 'bg-ember-100',  border: 'border-ember-300',  hex: '#e05c1b' },
  { bg: 'bg-blue-600',   text: 'text-white', light: 'bg-blue-100',   border: 'border-blue-300',   hex: '#2563eb' },
  { bg: 'bg-purple-600', text: 'text-white', light: 'bg-purple-100', border: 'border-purple-300', hex: '#9333ea' },
  { bg: 'bg-amber-500',  text: 'text-white', light: 'bg-amber-100',  border: 'border-amber-300',  hex: '#f59e0b' },
  { bg: 'bg-cyan-600',   text: 'text-white', light: 'bg-cyan-100',   border: 'border-cyan-300',   hex: '#0891b2' },
]

const TYPE_ICONS: Record<string, string> = {
  start: '🚦', campsite: '🏕️', fuel: '⛽', food: '🛒',
  fishing: '🎣', attraction: '📸', end: '🏁', custom: '📍',
}

function colorFor(idx: number) { return TRIP_COLORS[idx % TRIP_COLORS.length] }

function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
function parseYmd(s: string): Date {
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y, m-1, d)
}
function addDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()+1)
}
function haversineKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number {
  const R = 6371, dLat = (b.lat-a.lat)*Math.PI/180, dLng = (b.lng-a.lng)*Math.PI/180
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x))
}

interface DayInfo {
  stopName: string
  stopType: string
  isTravel: boolean
  km: number
  travelFrom?: string
  nightNum?: number
  totalNights?: number
  itin?: ItineraryDay
}

function buildDayMap(trip: Trip, waypoints: Waypoint[], itinDays: ItineraryDay[], roadSegs: number[]): Record<string, DayInfo> {
  const sorted = [...waypoints].sort((a,b) => a.order - b.order)
  const result: Record<string, DayInfo> = {}
  const itinMap: Record<string, ItineraryDay> = {}
  for (const d of itinDays) itinMap[d.date] = d
  if (sorted.length === 0) return result

  let date = parseYmd(trip.startDate)
  const endStr = trip.endDate
  let segIdx = 0

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i]
    const prev = i > 0 ? sorted[i-1] : null
    const nights = Math.max(0, stop.nights ?? 1)

    if (prev) {
      // Travel day = you arrive here AND spend night 1 here.
      // So only nights-1 extra stay days follow — waking up on the last
      // night day means you're driving to the *next* stop that day.
      const km = roadSegs[segIdx] ?? Math.round(haversineKm(prev, stop) * 1.35)
      segIdx++
      const ds = ymd(date)
      if (ds <= endStr) result[ds] = { stopName: stop.name, stopType: stop.type, isTravel: true, km, travelFrom: prev.name, itin: itinMap[ds] }
      date = addDay(date)
      // Extra full days at this stop (nights 2…N)
      for (let n = 1; n < nights; n++) {
        const ds2 = ymd(date)
        if (ds2 <= endStr) result[ds2] = { stopName: stop.name, stopType: stop.type, isTravel: false, km: 0, nightNum: n+1, totalNights: nights, itin: itinMap[ds2] }
        date = addDay(date)
      }
    } else {
      // First stop — no incoming travel, just stay days
      for (let n = 0; n < nights; n++) {
        const ds = ymd(date)
        if (ds <= endStr) result[ds] = { stopName: stop.name, stopType: stop.type, isTravel: false, km: 0, nightNum: n+1, totalNights: nights, itin: itinMap[ds] }
        date = addDay(date)
      }
    }
  }
  return result
}

interface Tooltip {
  x: number; y: number
  trip: Trip; info: DayInfo | null
  dayStr: string; dayNum: number; totalDays: number
  colHex: string
}

export default function CalendarPage() {
  const [trips,            setTrips]            = useState<Trip[]>([])
  const [waypointsByTrip,  setWaypointsByTrip]  = useState<Record<string, Waypoint[]>>({})
  const [itinDays,         setItinDays]         = useState<ItineraryDay[]>([])
  const [roadDistByTrip,   setRoadDistByTrip]   = useState<Record<string, number[]>>({})
  const [today]                                 = useState(new Date())
  const [year,  setYear]                        = useState(today.getFullYear())
  const [month, setMonth]                       = useState(today.getMonth())
  const [tip,   setTip]                         = useState<Tooltip | null>(null)

  useEffect(() => {
    fetch('/api/calendar-data').then(r => r.json()).then(d => {
      setTrips(d.trips ?? [])
      setWaypointsByTrip(d.waypointsByTrip ?? {})
      setItinDays(d.itineraryDays ?? [])
      setRoadDistByTrip(d.roadDistByTrip ?? {})
    })
  }, [])

  const tripColors = Object.fromEntries(trips.map((t,i) => [t.id, colorFor(i)]))
  const tripDayMaps: Record<string, Record<string, DayInfo>> = {}
  for (const t of trips) {
    tripDayMaps[t.id] = buildDayMap(t, waypointsByTrip[t.id] ?? [], itinDays.filter(d => d.tripId === t.id), roadDistByTrip[t.id] ?? [])
  }

  function prevMonth() { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)]
  while (cells.length%7!==0) cells.push(null)

  const todayStr  = ymd(today)
  const monthEnd  = ymd(new Date(year, month, daysInMonth))
  const monthStart= ymd(new Date(year, month, 1))
  const monthTrips= trips.filter(t => t.startDate<=monthEnd && t.endDate>=monthStart)

  function tripsForDay(day: number) {
    const d = ymd(new Date(year, month, day))
    return trips.filter(t => t.startDate<=d && t.endDate>=d)
  }

  function onBarEnter(e: React.MouseEvent, trip: Trip, dayStr: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const info = tripDayMaps[trip.id]?.[dayStr] ?? null
    const tripStart = parseYmd(trip.startDate), tripEnd = parseYmd(trip.endDate)
    const dayNum   = Math.round((parseYmd(dayStr).getTime()-tripStart.getTime())/86400000)+1
    const totalDays= Math.round((tripEnd.getTime()-tripStart.getTime())/86400000)+1
    const col = tripColors[trip.id]
    setTip({ x: rect.left, y: rect.bottom+6, trip, info, dayStr, dayNum, totalDays, colHex: col?.hex ?? '#15803d' })
  }

  return (
    <div className="space-y-5" onMouseLeave={()=>setTip(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Calendar</h1>
          <p className="text-sm text-stone-500 mt-0.5">All your camping trips at a glance</p>
        </div>
        <Link href="/" className="btn-secondary text-sm">← Trips</Link>
      </div>

      <div className="card overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-stone-50">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-lg">‹</button>
          <h2 className="text-lg font-bold text-stone-900">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-lg">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stone-200">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-stone-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} className="min-h-[90px] border-b border-r border-stone-100 bg-stone-50/50" />
            const dayStr   = ymd(new Date(year, month, day))
            const dayTrips = tripsForDay(day)
            const isToday  = dayStr===todayStr
            const isPast   = dayStr<todayStr

            return (
              <div key={day} className={`min-h-[90px] border-b border-r border-stone-100 p-1.5 transition-colors
                ${isToday ? 'bg-forest-50' : isPast ? 'bg-stone-50/40' : 'bg-white hover:bg-stone-50/60'}`}>
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-forest-700 text-white' : isPast ? 'text-stone-300' : 'text-stone-700'}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayTrips.slice(0,3).map(t => {
                    const col   = tripColors[t.id]
                    const info  = tripDayMaps[t.id]?.[dayStr]
                    const isStart = t.startDate===dayStr
                    const isEnd   = t.endDate===dayStr
                    const name  = t.title || t.destination

                    let label: string
                    let icon = ''
                    if (info) {
                      icon = info.isTravel ? '🚗' : (TYPE_ICONS[info.stopType] ?? '📍')
                      if (info.isTravel) {
                        label = `${icon} ${info.stopName}${info.km>0 ? ` ·${info.km}km` : ''}`
                      } else {
                        const nightTag = info.totalNights && info.totalNights>1 ? ` N${info.nightNum}/${info.totalNights}` : ''
                        label = `${icon} ${info.stopName}${nightTag}`
                      }
                    } else {
                      label = isStart ? `▶ ${name}` : isEnd ? `■ ${name}` : `· ${name}`
                    }

                    return (
                      <div
                        key={t.id}
                        onMouseEnter={e => onBarEnter(e, t, dayStr)}
                        onMouseLeave={() => setTip(null)}
                      >
                        <Link
                          href={`/trips/${t.id}`}
                          className={`block text-xs px-1.5 py-0.5 rounded truncate font-medium leading-tight
                            ${col.bg} ${col.text} hover:opacity-90 transition-opacity`}
                        >
                          {label}
                        </Link>
                      </div>
                    )
                  })}
                  {dayTrips.length>3 && <p className="text-xs text-stone-400 px-1">+{dayTrips.length-3} more</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      {monthTrips.length>0 && (
        <div className="card p-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Trips this month</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {monthTrips.map((t,i) => {
              const col    = tripColors[t.id] ?? colorFor(i)
              const start  = parseYmd(t.startDate).toLocaleDateString('en-AU',{day:'numeric',month:'short'})
              const end    = parseYmd(t.endDate).toLocaleDateString('en-AU',{day:'numeric',month:'short'})
              const nights = Math.round((parseYmd(t.endDate).getTime()-parseYmd(t.startDate).getTime())/86400000)
              const segs   = roadDistByTrip[t.id] ?? []
              const totalKm= segs.length > 0 ? segs.reduce((s,d)=>s+d,0) : 0
              return (
                <Link key={t.id} href={`/trips/${t.id}`}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${col.light} ${col.border} hover:opacity-80 transition-opacity`}>
                  <span className={`w-3 h-3 rounded-sm shrink-0 ${col.bg}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{t.title||t.destination}</p>
                    <p className="text-xs text-stone-500">{start} – {end} · {nights===0?'Day trip':`${nights}n`}</p>
                    <p className="text-xs text-stone-400">📍 {t.destination}{totalKm>0?` · ~${totalKm}km`:''}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {trips.length===0 && (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-stone-500 text-sm">No trips yet — <Link href="/trips/new" className="text-forest-600 hover:underline">plan your first trip</Link></p>
        </div>
      )}

      {/* Hover tooltip */}
      {tip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: tip.y, left: Math.min(tip.x, (typeof window!=='undefined'?window.innerWidth:800)-272) }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-stone-200 p-3 w-64">
            {/* Trip header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: tip.colHex }} />
              <p className="text-sm font-bold text-stone-900 truncate">{tip.trip.title||tip.trip.destination}</p>
            </div>
            <p className="text-xs text-stone-400 mb-2">
              Day {tip.dayNum} of {tip.totalDays} · {parseYmd(tip.dayStr).toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'})}
            </p>

            {tip.info ? (
              <div className="space-y-1.5">
                {tip.info.isTravel ? (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5">
                    <p className="text-xs font-semibold text-amber-800">🚗 Travel day</p>
                    <p className="text-xs text-amber-700 mt-0.5">{tip.info.travelFrom} → {tip.info.stopName}</p>
                    {tip.info.km>0 && <p className="text-xs text-amber-600 font-medium mt-0.5">~{tip.info.km} km drive</p>}
                  </div>
                ) : (
                  <div className="rounded-lg bg-stone-50 border border-stone-200 px-2 py-1.5">
                    <p className="text-xs font-semibold text-stone-800">
                      {TYPE_ICONS[tip.info.stopType]??'📍'} {tip.info.stopName}
                    </p>
                    {tip.info.totalNights && tip.info.totalNights>0 && (
                      <p className="text-xs text-stone-500 mt-0.5">Night {tip.info.nightNum} of {tip.info.totalNights}</p>
                    )}
                  </div>
                )}
                {tip.info.itin && (
                  <>
                    {tip.info.itin.summary && (
                      <p className="text-xs text-stone-600 leading-relaxed">{tip.info.itin.summary}</p>
                    )}
                    {tip.info.itin.activities?.length>0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tip.info.itin.activities.slice(0,4).map((a,i) => (
                          <span key={i} className="text-xs bg-forest-50 text-forest-700 border border-forest-200 rounded px-1.5 py-0.5">{a}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-lg bg-stone-50 border border-stone-200 px-2 py-1.5">
                <p className="text-xs text-stone-600">📍 {tip.trip.destination}</p>
                <p className="text-xs text-stone-400 mt-0.5">Add stops on the map to see daily location details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
