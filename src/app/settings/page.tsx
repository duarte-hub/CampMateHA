'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { VehicleConfig } from '@/lib/types'

interface HomeLocation { name: string; lat: number; lng: number }

const DEFAULT_VEHICLE: VehicleConfig = {
  fuelType: 'diesel',
  tankSizeL: 80,
  consumptionL100km: 12,
  towingConsumptionL100km: 18,
  isTowing: true,
  fuelPricePerL: 2.10,
}

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
  'Nut-free', 'Halal', 'Kosher', 'Low-carb', 'No seafood', 'No pork',
]

function SettingsContent() {
  const [loading,       setLoading]       = useState(true)
  // Home location
  const [homeLoc,       setHomeLoc]       = useState<HomeLocation | null>(null)
  const [homeQ,         setHomeQ]         = useState('')
  const [homeResults,   setHomeResults]   = useState<HomeLocation[]>([])
  const [homeSearching, setHomeSearching] = useState(false)
  const [homeSaved,     setHomeSaved]     = useState(false)
  // Vehicle config
  const [vehicle,       setVehicle]       = useState<VehicleConfig>(DEFAULT_VEHICLE)
  const [vehicleSaved,  setVehicleSaved]  = useState(false)
  // AI + dietary
  const [anthropicKey,  setAnthropicKey]  = useState('')
  const [aiSaved,       setAiSaved]       = useState(false)
  const [dietary,       setDietary]       = useState<string[]>([])
  const [dietarySaved,  setDietarySaved]  = useState(false)
  // Google Drive
  const [driveConfigured,   setDriveConfigured]   = useState(false)
  const [driveConnected,    setDriveConnected]     = useState(false)
  const [driveLastBackup,   setDriveLastBackup]    = useState<string | null>(null)
  const [backupBusy,        setBackupBusy]         = useState(false)
  const [backupMsg,         setBackupMsg]          = useState('')
  const [backupFiles,       setBackupFiles]        = useState<{ id: string; name: string; createdTime: string }[]>([])
  const [showBackups,       setShowBackups]        = useState(false)
  const [restoring,         setRestoring]          = useState(false)

  const searchParams = useSearchParams()

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setHomeLoc(d.homeLocation ?? null)
      if (d.vehicleConfig) setVehicle(d.vehicleConfig)
      if (d.anthropicApiKey) setAnthropicKey(d.anthropicApiKey)
      setDietary(d.dietaryRestrictions ?? [])
      setDriveConfigured(d.drive?.configured ?? false)
      setDriveConnected(d.drive?.connected ?? false)
      setDriveLastBackup(d.drive?.lastBackup ?? null)
      setLoading(false)
    })
    const status = searchParams.get('drive')
    if (status === 'connected') setBackupMsg('✓ Google Drive connected')
    if (status === 'error')     setBackupMsg('✗ Drive connection failed — check credentials and try again')
    if (status === 'nocreds')   setBackupMsg('✗ Enter Client ID and Secret first')
  }, [])

  async function searchHome() {
    if (!homeQ.trim()) return
    const m = homeQ.trim().match(/^(-?\d+\.?\d+)[,\s]+(-?\d+\.?\d+)$/)
    if (m) {
      const lat = parseFloat(m[1]), lng = parseFloat(m[2])
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) { saveHome({ name: homeQ.trim(), lat, lng }); return }
    }
    setHomeSearching(true)
    try {
      const res = await fetch(`/api/trips/placeholder/waypoints/search?q=${encodeURIComponent(homeQ)}`)
      setHomeResults((await res.json()).slice(0, 5))
    } catch { setHomeResults([]) }
    finally { setHomeSearching(false) }
  }

  async function saveHome(loc: HomeLocation) {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ homeLocation: loc }) })
    setHomeLoc(loc); setHomeResults([]); setHomeQ(''); setHomeSaved(true)
    setTimeout(() => setHomeSaved(false), 3000)
  }

  async function clearHome() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ homeLocation: null }) })
    setHomeLoc(null)
  }

  async function saveVehicle() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicleConfig: vehicle }) })
    setVehicleSaved(true)
    setTimeout(() => setVehicleSaved(false), 3000)
  }

  async function saveAiKey() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ anthropicApiKey: anthropicKey }) })
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 3000)
  }

  async function saveDietary() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dietaryRestrictions: dietary }) })
    setDietarySaved(true)
    setTimeout(() => setDietarySaved(false), 3000)
  }

  function toggleDietary(opt: string) {
    setDietary(prev => prev.includes(opt) ? prev.filter(d => d !== opt) : [...prev, opt])
  }

  async function disconnectDrive() {
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disconnectDrive: true }) })
    setDriveConnected(false)
    setBackupMsg('')
  }

  async function runBackup() {
    setBackupBusy(true); setBackupMsg('')
    try {
      const res = await fetch('/api/drive/backup', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setBackupMsg(`✓ Backed up: ${data.fileName}`)
        setDriveLastBackup(data.timestamp)
      } else { setBackupMsg(`✗ ${data.error}`) }
    } catch { setBackupMsg('✗ Backup failed') }
    setBackupBusy(false)
  }

  async function loadBackupFiles() {
    setShowBackups(true)
    const res = await fetch('/api/drive/restore')
    const data = await res.json()
    setBackupFiles(data.files ?? [])
  }

  async function restoreFrom(fileId: string) {
    if (!confirm('Restore this backup? This will overwrite your current data.')) return
    setRestoring(true); setBackupMsg('')
    try {
      const res = await fetch('/api/drive/restore', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }) })
      const data = await res.json()
      setBackupMsg(data.ok ? '✓ Restored — reload the app to see changes' : `✗ ${data.error}`)
    } catch { setBackupMsg('✗ Restore failed') }
    setRestoring(false)
    setShowBackups(false)
  }

  function setV<K extends keyof VehicleConfig>(k: K, v: VehicleConfig[K]) {
    setVehicle(prev => ({ ...prev, [k]: v }))
  }

  const maxRangeKm = vehicle.tankSizeL > 0 && vehicle.consumptionL100km > 0
    ? Math.round((vehicle.tankSizeL * 0.85 / (vehicle.isTowing ? vehicle.towingConsumptionL100km : vehicle.consumptionL100km)) * 100)
    : 0

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-stone-400 hover:text-stone-600 text-sm">← Home</Link>
        <h1 className="text-xl font-bold text-stone-900">Settings</h1>
      </div>

      {/* Home Location */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-bold text-stone-800 mb-1">🏠 Home Location</h2>
          <p className="text-sm text-stone-500 mb-4">Your starting point for trip maps.</p>
          {loading ? <div className="text-sm text-stone-400">Loading…</div>
          : homeLoc ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-forest-50 border border-forest-200 p-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-forest-800">🏠 {homeLoc.name.split(',')[0]}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{homeLoc.lat.toFixed(5)}, {homeLoc.lng.toFixed(5)}</p>
                </div>
                <button onClick={clearHome} className="text-xs text-red-400 hover:text-red-600 shrink-0">Remove</button>
              </div>
              {homeSaved && <p className="text-xs text-forest-700">✓ Saved</p>}
              <button onClick={() => setHomeLoc(null)} className="text-xs text-stone-400 hover:text-stone-600">Change location</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input className="input text-sm flex-1" placeholder="Search suburb or -25.3, 153.1"
                  value={homeQ} onChange={e => { setHomeQ(e.target.value); setHomeResults([]) }}
                  onKeyDown={e => e.key==='Enter' && searchHome()} />
                <button onClick={searchHome} disabled={homeSearching||!homeQ.trim()} className="btn-primary text-sm px-3 disabled:opacity-40">
                  {homeSearching ? '…' : '🔍'}
                </button>
              </div>
              {homeResults.length > 0 && (
                <div className="space-y-1">
                  {homeResults.map((r,i) => (
                    <button key={i} onClick={() => saveHome(r)}
                      className="w-full text-left p-2 rounded-lg border border-stone-200 hover:border-forest-400 hover:bg-forest-50 text-sm">
                      <p className="font-medium text-stone-800 truncate">{r.name.split(',')[0]}</p>
                      <p className="text-xs text-stone-400 truncate">{r.name.split(',').slice(1,3).join(',')}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Config */}
      <div className="card p-6 space-y-5">
        <div>
          <h2 className="font-bold text-stone-800 mb-1">🚗 Vehicle & Fuel</h2>
          <p className="text-sm text-stone-500 mb-4">Used to calculate fuel needs and range on your route.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Fuel type</label>
            <select className="input text-sm" value={vehicle.fuelType} onChange={e => setV('fuelType', e.target.value as VehicleConfig['fuelType'])}>
              <option value="diesel">Diesel</option>
              <option value="petrol">Petrol (ULP)</option>
              <option value="lpg">LPG</option>
            </select>
          </div>
          <div>
            <label className="label">Tank size (L)</label>
            <input type="number" className="input text-sm" min={10} max={400} step={5}
              value={vehicle.tankSizeL} onChange={e => setV('tankSizeL', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Consumption — solo (L/100km)</label>
            <input type="number" className="input text-sm" min={4} max={50} step={0.5}
              value={vehicle.consumptionL100km} onChange={e => setV('consumptionL100km', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Consumption — towing (L/100km)</label>
            <input type="number" className="input text-sm" min={4} max={60} step={0.5}
              value={vehicle.towingConsumptionL100km} onChange={e => setV('towingConsumptionL100km', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Fuel price ($/L)</label>
            <input type="number" className="input text-sm" min={0.5} max={5} step={0.01}
              value={vehicle.fuelPricePerL} onChange={e => setV('fuelPricePerL', Number(e.target.value))} />
          </div>
          <div className="flex flex-col justify-end">
            <label className="label">Currently towing?</label>
            <div className="flex items-center gap-3 mt-1">
              <button
                onClick={() => setV('isTowing', !vehicle.isTowing)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                  ${vehicle.isTowing ? 'bg-forest-600' : 'bg-stone-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow
                  ${vehicle.isTowing ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm text-stone-600">{vehicle.isTowing ? 'Yes — using tow rate' : 'No — using solo rate'}</span>
            </div>
          </div>
        </div>

        {/* Range preview */}
        {maxRangeKm > 0 && (
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm">
            <p className="font-semibold text-stone-700">
              Estimated safe range: <span className="text-forest-700">{maxRangeKm} km</span>
              <span className="text-xs text-stone-400 font-normal ml-1">(85% of tank)</span>
            </p>
            <p className="text-xs text-stone-500 mt-0.5">
              Using {vehicle.isTowing ? vehicle.towingConsumptionL100km : vehicle.consumptionL100km} L/100km
              · {vehicle.tankSizeL}L tank
              · ${vehicle.fuelPricePerL.toFixed(2)}/L
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={saveVehicle} className="btn-primary text-sm">Save vehicle config</button>
          {vehicleSaved && <p className="text-xs text-forest-700">✓ Saved</p>}
        </div>
      </div>

      {/* Dietary restrictions */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-stone-800 mb-1">🥗 Dietary Restrictions</h2>
          <p className="text-sm text-stone-500 mb-4">Applied when generating AI meal plans for any trip.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => toggleDietary(opt)}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors font-medium
                ${dietary.includes(opt)
                  ? 'bg-forest-600 text-white border-forest-600'
                  : 'bg-white text-stone-600 border-stone-300 hover:border-forest-400 hover:text-forest-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
        {dietary.length > 0 && (
          <p className="text-xs text-stone-500">Selected: {dietary.join(', ')}</p>
        )}
        <div className="flex items-center gap-3">
          <button onClick={saveDietary} className="btn-primary text-sm">Save preferences</button>
          {dietarySaved && <p className="text-xs text-forest-700">✓ Saved</p>}
        </div>
      </div>

      {/* Google Drive Backup */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-stone-800 dark:text-stone-100 mb-1">☁️ Google Drive Backup</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Back up all your trip data to Google Drive.
          </p>
        </div>

        {driveConnected ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-forest-50 dark:bg-forest-900/30 border border-forest-200 dark:border-forest-800 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-forest-800 dark:text-forest-300">✓ Connected to Google Drive</p>
                {driveLastBackup && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    Last backup: {new Date(driveLastBackup).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                )}
              </div>
              <button onClick={disconnectDrive} className="text-xs text-red-400 hover:text-red-600 shrink-0">Disconnect</button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={runBackup} disabled={backupBusy} className="btn-primary text-sm disabled:opacity-40">
                {backupBusy ? '⏳ Backing up…' : '☁️ Backup now'}
              </button>
              <button onClick={loadBackupFiles} className="btn-secondary text-sm">
                🔄 Restore from backup
              </button>
            </div>

            {backupMsg && (
              <p className={`text-sm font-medium ${backupMsg.startsWith('✓') ? 'text-forest-700 dark:text-forest-400' : 'text-red-600 dark:text-red-400'}`}>
                {backupMsg}
              </p>
            )}

            {showBackups && (
              <div className="card overflow-hidden">
                <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">Drive backups</p>
                  <button onClick={() => setShowBackups(false)} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
                </div>
                {backupFiles.length === 0 ? (
                  <p className="text-sm text-stone-400 px-4 py-3">No backups found in Drive.</p>
                ) : (
                  <div className="divide-y divide-stone-100 dark:divide-stone-800">
                    {backupFiles.map(f => (
                      <div key={f.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                        <div>
                          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{f.name}</p>
                          <p className="text-xs text-stone-400">{new Date(f.createdTime).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        </div>
                        <button onClick={() => restoreFrom(f.id)} disabled={restoring}
                          className="btn-secondary text-xs disabled:opacity-40">
                          {restoring ? 'Restoring…' : 'Restore'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {backupMsg && (
              <p className={`text-sm font-medium ${backupMsg.startsWith('✓') ? 'text-forest-700 dark:text-forest-400' : 'text-red-600 dark:text-red-400'}`}>
                {backupMsg}
              </p>
            )}
            {driveConfigured ? (
              <a href="/api/drive/auth" className="btn-primary text-sm inline-flex">
                Authorise Google Drive
              </a>
            ) : (
              <p className="text-sm text-stone-400 dark:text-stone-500">
                Set <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">GOOGLE_CLIENT_ID</code> and{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">GOOGLE_CLIENT_SECRET</code> in{' '}
                <code className="text-xs bg-stone-100 dark:bg-stone-800 px-1 rounded">.env.local</code> to enable Drive backup.
              </p>
            )}
          </div>
        )}
      </div>

      {/* AI / Anthropic key */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-stone-800 mb-1">🤖 AI Meal Planner</h2>
          <p className="text-sm text-stone-500 mb-1">
            Optional: add an Anthropic API key to generate personalised meal plans with Claude.
            Without a key, smart local templates are used instead.
          </p>
          <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer"
            className="text-xs text-forest-600 hover:underline">Get an API key from console.anthropic.com →</a>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            className="input text-sm flex-1 font-mono"
            placeholder="sk-ant-…"
            value={anthropicKey}
            onChange={e => setAnthropicKey(e.target.value)}
          />
          <button onClick={saveAiKey} disabled={!anthropicKey.trim()} className="btn-primary text-sm px-4 disabled:opacity-40">
            Save
          </button>
        </div>
        {aiSaved && <p className="text-xs text-forest-700">✓ API key saved</p>}
        {anthropicKey && (
          <div className="rounded-lg bg-forest-50 border border-forest-200 p-2.5 flex items-center gap-2">
            <span className="text-forest-700 text-sm">✓</span>
            <p className="text-xs text-forest-700 font-medium">API key configured — AI meal planning enabled</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
