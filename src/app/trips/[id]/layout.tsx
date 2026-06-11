'use client'

import { useState, useEffect, useRef, use, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import type { Trip } from '@/lib/types'
import ImageEditor from './ImageEditor'

const STYLE_GRADIENT: Record<string, string> = {
  tent:           'from-forest-700 via-forest-800 to-forest-900',
  camper_trailer: 'from-amber-600 via-amber-700 to-amber-900',
  caravan:        'from-blue-700 via-blue-800 to-blue-900',
  cabin:          'from-indigo-700 via-indigo-800 to-indigo-900',
}
const STYLE_ICON: Record<string, string> = {
  tent: '⛺', camper_trailer: '🚐', caravan: '🚌', cabin: '🏠',
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

const TABS = [
  { key: 'overview',  label: '📋 Overview',  href: (id: string) => `/trips/${id}?tab=overview` },
  { key: 'itinerary', label: '📅 Itinerary',  href: (id: string) => `/trips/${id}?tab=itinerary` },
  { key: 'packing',   label: '🎒 Packing',    href: (id: string) => `/trips/${id}?tab=packing` },
  { key: 'meals',     label: '🍳 Meals',      href: (id: string) => `/trips/${id}?tab=meals` },
  { key: 'budget',    label: '💰 Budget',     href: (id: string) => `/trips/${id}?tab=budget` },
  { key: 'map',       label: '🗺️ Map',        href: (id: string) => `/trips/${id}/map` },
  { key: 'log',       label: '⛽ Log',         href: (id: string) => `/trips/${id}/log` },
]

function TabBar({ id }: { id: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const active = pathname.endsWith('/map') ? 'map'
    : pathname.endsWith('/log') ? 'log'
    : pathname.endsWith('/share') ? ''
    : (searchParams.get('tab') ?? 'overview')

  return (
    <div className="flex border-b border-stone-200 dark:border-stone-700 gap-1 overflow-x-auto -mx-4 px-4">
      {TABS.map(t => (
        <Link
          key={t.key}
          href={t.href(id)}
          className={`pb-2 pt-1 px-1 text-sm font-medium whitespace-nowrap transition-all min-h-[44px] inline-flex items-center ${active === t.key ? 'tab-active' : 'tab-inactive'}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}

export default function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const headerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [trip,           setTrip]           = useState<Trip | null>(null)
  const [editingHero,    setEditingHero]    = useState(false)
  const [editColor,      setEditColor]      = useState('')
  const [editImage,      setEditImage]      = useState('')
  const [savingHero,     setSavingHero]     = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [imageEditorSrc, setImageEditorSrc] = useState<string | null>(null)

  useEffect(() => {
    function fetchTrip() {
      fetch(`/api/trips/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setTrip(data) })
    }
    fetchTrip()
    // Re-fetch when the trip page saves changes (dates, title, etc.)
    window.addEventListener('campmate-trip-updated', fetchTrip)
    return () => window.removeEventListener('campmate-trip-updated', fetchTrip)
  }, [id])

  // Expose header height as a CSS variable so the map page can fill remaining viewport
  useEffect(() => {
    function measure() {
      if (!headerRef.current) return
      document.documentElement.style.setProperty(
        '--trip-header-height',
        `${headerRef.current.offsetHeight}px`
      )
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [trip, editingHero])

  async function saveHero() {
    setSavingHero(true)
    await fetch(`/api/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroColor: editColor, heroImage: editImage }),
    })
    setTrip(t => t ? { ...t, heroColor: editColor, heroImage: editImage } : t)
    setEditingHero(false)
    setSavingHero(false)
  }

  async function deleteTrip() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/trips/${id}`, { method: 'DELETE' })
    router.push('/')
  }

  const nights = trip
    ? Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
    : 0

  return (
    <div>
      {/* Measured header area — banner + edit panel + tabs */}
      <div ref={headerRef} className="space-y-4 pb-4">
        {/* Hero banner */}
        {!trip ? (
          <div className="animate-pulse rounded-2xl px-5 py-5 bg-gradient-to-br from-stone-200 to-stone-300 dark:from-stone-700 dark:to-stone-800 shadow-md">
            <div className="h-2.5 w-12 bg-stone-300 dark:bg-stone-600 rounded mb-3" />
            <div className="h-6 w-48 bg-stone-300 dark:bg-stone-600 rounded mb-2" />
            <div className="h-4 w-64 bg-stone-200 dark:bg-stone-700 rounded" />
          </div>
        ) : (
          <div
            className={`rounded-2xl px-5 py-4 text-white shadow-md relative overflow-hidden ${!trip.heroColor && !trip.heroImage ? `bg-gradient-to-br ${STYLE_GRADIENT[trip.campingStyle] ?? 'from-forest-700 to-forest-900'}` : ''}`}
            style={
              trip.heroImage
                ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.55)),url(${trip.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : trip.heroColor
                  ? { backgroundColor: trip.heroColor, backgroundImage: 'linear-gradient(135deg,rgba(0,0,0,0.05),rgba(0,0,0,0.38))' }
                  : {}
            }
          >
            {!trip.heroImage && (
              <div className="absolute right-2 top-0 text-[90px] leading-none opacity-[0.08] select-none pointer-events-none">
                {STYLE_ICON[trip.campingStyle]}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href="/" className="text-xs font-medium text-white/50 hover:text-white/80 transition-colors">
                  ← All trips
                </Link>
                <h1 className="text-xl font-bold mt-0.5 leading-tight">{trip.title || trip.destination}</h1>
                <p className="text-white/70 text-sm mt-0.5 truncate">
                  📍 {trip.destination} · {fmtDate(trip.startDate)}{nights > 0 ? ` – ${fmtDate(trip.endDate)} · ${nights} night${nights !== 1 ? 's' : ''}` : ' · Day trip'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/trips/${id}/share`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                  Share
                </Link>
                <button onClick={deleteTrip} disabled={deleting} className="text-xs font-semibold text-white/50 hover:text-white/80 transition-colors px-2 py-1.5">
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => { setEditColor(trip.heroColor ?? ''); setEditImage(trip.heroImage ?? ''); setEditingHero(e => !e) }}
              className="absolute bottom-2 right-3 text-[10px] font-medium text-white/35 hover:text-white/70 transition-colors"
            >
              ✎ Customise
            </button>
          </div>
        )}

        {/* Hero edit panel */}
        {editingHero && trip && (
          <div className="card p-4 space-y-3 -mt-2">
            {imageEditorSrc ? (
              <ImageEditor
                src={imageEditorSrc}
                onApply={url => { setEditImage(url); setImageEditorSrc(null) }}
                onCancel={() => setImageEditorSrc(null)}
              />
            ) : (
              <>
                <div className="flex gap-4 flex-wrap">
                  <div className="space-y-1">
                    <label className="label text-xs">Banner colour</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editColor || '#15803d'} onChange={e => setEditColor(e.target.value)}
                        className="h-9 w-14 rounded border border-stone-300 dark:border-stone-600 cursor-pointer p-0.5 bg-white dark:bg-stone-800" />
                      {editColor && (
                        <button onClick={() => setEditColor('')} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-48 space-y-1">
                    <label className="label text-xs">Background image</label>
                    <div className="flex gap-2">
                      <input className="input text-sm flex-1 min-w-0" placeholder="https://example.com/photo.jpg"
                        value={editImage.startsWith('data:') ? '' : editImage}
                        onChange={e => setEditImage(e.target.value)} />
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="btn-secondary text-xs shrink-0">
                        Upload
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const result = ev.target?.result
                            if (typeof result === 'string') setImageEditorSrc(result)
                          }
                          reader.readAsDataURL(file)
                          e.target.value = ''
                        }} />
                    </div>
                    {editImage && (
                      <div className="flex items-center gap-2">
                        {editImage.startsWith('data:') && (
                          <button onClick={() => setImageEditorSrc(editImage)}
                            className="text-xs text-forest-600 dark:text-forest-400 hover:underline">
                            ✎ Re-edit crop
                          </button>
                        )}
                        <button onClick={() => setEditImage('')} className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingHero(false)} className="btn-secondary text-xs">Cancel</button>
                  <button onClick={saveHero} disabled={savingHero} className="btn-primary text-xs disabled:opacity-40">
                    {savingHero ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab bar */}
        <Suspense fallback={
          <div className="flex gap-4 border-b border-stone-200 dark:border-stone-700 pb-2.5 -mx-4 px-4">
            {[60, 72, 88, 56, 64, 44, 44].map((w, i) => (
              <div key={i} className="h-3.5 rounded bg-stone-200 dark:bg-stone-700 animate-pulse" style={{ width: w }} />
            ))}
          </div>
        }>
          <TabBar id={id} />
        </Suspense>
      </div>

      {children}
    </div>
  )
}
