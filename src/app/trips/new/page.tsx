'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import type { CampingStyle, VehicleType, ExperienceLevel, ActivityType } from '@/lib/types'

interface WizardData {
  title: string
  destination: string
  startDate: string
  endDate: string
  adults: number
  kids: number
  campingStyle: CampingStyle
  vehicleType: VehicleType
  experienceLevel: ExperienceLevel
  activities: ActivityType[]
  notes: string
}

const ACTIVITIES: { value: ActivityType; label: string; icon: string }[] = [
  { value: 'beach', label: 'Beach', icon: '🏖️' },
  { value: 'fishing', label: 'Fishing', icon: '🎣' },
  { value: 'hiking', label: 'Hiking', icon: '🥾' },
  { value: '4wd', label: '4WD Tracks', icon: '🚙' },
  { value: 'campfire', label: 'Campfire', icon: '🔥' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'kayaking', label: 'Kayaking', icon: '🛶' },
]

const STEPS = ['Trip Details', 'Your Group', 'Trip Style', 'Activities', 'Review']

export default function NewTripPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  const nextWeekEnd = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0]

  const [data, setData] = useState<WizardData>({
    title: '',
    destination: '',
    startDate: nextWeek,
    endDate: nextWeekEnd,
    adults: 2,
    kids: 0,
    campingStyle: 'tent',
    vehicleType: '2wd',
    experienceLevel: 'regular',
    activities: ['campfire'],
    notes: '',
  })

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData(d => ({ ...d, [key]: value }))
  }

  function toggleActivity(a: ActivityType) {
    set('activities', data.activities.includes(a)
      ? data.activities.filter(x => x !== a)
      : [...data.activities, a])
  }

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save trip')
      const trip = await res.json()
      await fetch(`/api/trips/${trip.id}/generate`, { method: 'POST' })
      router.push(`/trips/${trip.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const nights = data.startDate && data.endDate
    ? Math.max(0, Math.round((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000))
    : 0

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="mb-7">
        <div className="flex items-start">
          {STEPS.map((s, i) => (
            <Fragment key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex flex-col items-center gap-1.5 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i === step
                    ? 'bg-forest-700 dark:bg-forest-600 text-white ring-2 ring-forest-300 dark:ring-forest-800'
                    : i < step
                      ? 'bg-forest-600 dark:bg-forest-700 text-white'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs hidden sm:block leading-none transition-colors ${
                  i === step ? 'text-forest-700 dark:text-forest-400 font-semibold' :
                  i < step ? 'text-stone-500 dark:text-stone-400' :
                  'text-stone-300 dark:text-stone-600'
                }`}>
                  {s}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 mx-1 transition-all ${i < step ? 'bg-forest-600 dark:bg-forest-700' : 'bg-stone-200 dark:bg-stone-700'}`} />
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="card p-6">
        {/* Step 0: Trip Details */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Where are you going?</h2>
            <div>
              <label className="label">Destination *</label>
              <input
                className="input"
                placeholder="e.g. K'gari (Fraser Island), Grampians, Cape York"
                value={data.destination}
                onChange={e => set('destination', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Trip name (optional)</label>
              <input
                className="input"
                placeholder={data.destination ? `${data.destination} Trip` : 'Give your trip a name'}
                value={data.title}
                onChange={e => set('title', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Departure date</label>
                <input
                  type="date"
                  className="input"
                  min={today}
                  value={data.startDate}
                  onChange={e => set('startDate', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Return date</label>
                <input
                  type="date"
                  className="input"
                  min={data.startDate || today}
                  value={data.endDate}
                  onChange={e => set('endDate', e.target.value)}
                />
              </div>
            </div>
            {nights === 0 && data.startDate && data.endDate && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-800 dark:text-amber-300 font-medium">
                ☀️ Day trip — depart and return on the same day
              </div>
            )}
            {nights > 0 && (
              <p className="text-sm text-forest-700 dark:text-forest-400 font-medium">
                🌙 {nights} night{nights !== 1 ? 's' : ''} away
              </p>
            )}
          </div>
        )}

        {/* Step 1: Your Group */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Who is coming?</h2>
            <div className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-stone-700">
              <div>
                <p className="font-medium text-stone-800 dark:text-stone-200">Adults</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Age 13+</p>
              </div>
              <Counter value={data.adults} min={1} max={12} onChange={v => set('adults', v)} />
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-stone-800 dark:text-stone-200">Kids</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Under 13</p>
              </div>
              <Counter value={data.kids} min={0} max={10} onChange={v => set('kids', v)} />
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800 rounded-lg p-3">
              👥 {data.adults + data.kids} people total — packing lists and budgets will be sized for your group.
            </p>
          </div>
        )}

        {/* Step 2: Trip Style */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">How are you camping?</h2>
            <div>
              <label className="label">Camping style</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['tent', '🏕️', 'Tent'],
                  ['camper_trailer', '🚐', 'Camper Trailer'],
                  ['caravan', '🚌', 'Caravan'],
                  ['cabin', '🏠', 'Cabin / Hut'],
                ] as const).map(([val, icon, label]) => (
                  <button
                    key={val}
                    onClick={() => set('campingStyle', val)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      data.campingStyle === val
                        ? 'border-forest-600 dark:border-forest-500 bg-forest-50 dark:bg-forest-900/40'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 dark:bg-stone-800/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Vehicle</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['2wd', '🚗', '2WD / Standard'],
                  ['4wd', '🚙', '4WD'],
                  ['suv', '🚕', 'SUV / AWD'],
                  ['van', '🚐', 'Van / Ute'],
                ] as const).map(([val, icon, label]) => (
                  <button
                    key={val}
                    onClick={() => set('vehicleType', val)}
                    className={`rounded-xl border-2 p-3 text-left transition-all ${
                      data.vehicleType === val
                        ? 'border-forest-600 dark:border-forest-500 bg-forest-50 dark:bg-forest-900/40'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 dark:bg-stone-800/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">{label}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Experience level</label>
              <div className="flex gap-2">
                {([
                  ['beginner', '🌱', 'Beginner'],
                  ['regular', '🏕️', 'Regular'],
                  ['experienced', '⛰️', 'Experienced'],
                ] as const).map(([val, icon, label]) => (
                  <button
                    key={val}
                    onClick={() => set('experienceLevel', val)}
                    className={`flex-1 rounded-xl border-2 p-3 text-center text-sm transition-all ${
                      data.experienceLevel === val
                        ? 'border-forest-600 dark:border-forest-500 bg-forest-50 dark:bg-forest-900/40 font-semibold'
                        : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 dark:bg-stone-800/50'
                    }`}
                  >
                    <div className="text-xl mb-0.5">{icon}</div>
                    <div className="text-stone-800 dark:text-stone-200">{label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Activities */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">What are you planning to do?</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">Select all that apply — your packing list and itinerary will be tailored to these.</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITIES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => toggleActivity(value)}
                  className={`rounded-xl border-2 p-3 text-left transition-all relative ${
                    data.activities.includes(value)
                      ? 'border-forest-600 dark:border-forest-500 bg-forest-50 dark:bg-forest-900/40'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 dark:bg-stone-800/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{icon}</div>
                  <div className="text-sm font-semibold text-stone-800 dark:text-stone-200">{label}</div>
                  {data.activities.includes(value) && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-forest-600 dark:bg-forest-500 text-white flex items-center justify-center text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
            <div>
              <label className="label">Any other notes?</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Dogs coming, need powered site, no driving on sand..."
                value={data.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100">Ready to generate your trip plan?</h2>
            <div className="rounded-xl border border-stone-100 dark:border-stone-700 overflow-hidden text-sm">
              <ReviewRow label="Destination" value={data.destination || '—'} />
              <ReviewRow
                label="Dates"
                value={nights === 0
                  ? `${fmtDate(data.startDate)} (Day trip)`
                  : `${fmtDate(data.startDate)} → ${fmtDate(data.endDate)} (${nights} night${nights !== 1 ? 's' : ''})`}
              />
              <ReviewRow label="Group" value={`${data.adults} adults${data.kids > 0 ? `, ${data.kids} kids` : ''}`} />
              <ReviewRow label="Style" value={styleLabel(data.campingStyle)} />
              <ReviewRow label="Vehicle" value={vehicleLabel(data.vehicleType)} />
              <ReviewRow label="Experience" value={data.experienceLevel} />
              <ReviewRow
                label="Activities"
                value={data.activities.length > 0 ? data.activities.join(', ') : 'None selected'}
                last
              />
              {data.notes && <ReviewRow label="Notes" value={data.notes} last />}
            </div>
            <div className="rounded-xl bg-forest-50 dark:bg-forest-900/30 border border-forest-200 dark:border-forest-800 p-3 text-sm text-forest-800 dark:text-forest-300">
              <strong>What gets generated:</strong> day-by-day itinerary, full packing list,
              meal plan, budget estimate, and key reminders — all tailored to your trip.
            </div>
            {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-stone-100 dark:border-stone-700">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !data.destination}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={saving || !data.destination}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Generating...' : '⛺ Generate Trip Plan'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Counter({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-full border-2 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-lg hover:border-forest-500 dark:hover:border-forest-500 hover:text-forest-700 dark:hover:text-forest-400 transition-colors"
      >
        −
      </button>
      <span className="w-7 text-center font-bold text-xl text-stone-900 dark:text-stone-100">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-full border-2 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 flex items-center justify-center font-bold text-lg hover:border-forest-500 dark:hover:border-forest-500 hover:text-forest-700 dark:hover:text-forest-400 transition-colors"
      >
        +
      </button>
    </div>
  )
}

function ReviewRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex gap-2 px-3 py-2.5 ${last ? '' : 'border-b border-stone-100 dark:border-stone-700'}`}>
      <span className="w-24 text-stone-400 dark:text-stone-500 shrink-0 text-xs uppercase tracking-wide font-semibold pt-0.5">{label}</span>
      <span className="font-medium text-stone-800 dark:text-stone-200 capitalize">{value}</span>
    </div>
  )
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function styleLabel(s: CampingStyle) {
  return { tent: 'Tent', camper_trailer: 'Camper Trailer', caravan: 'Caravan', cabin: 'Cabin' }[s]
}

function vehicleLabel(v: VehicleType) {
  return { '2wd': '2WD', '4wd': '4WD', suv: 'SUV / AWD', van: 'Van / Ute' }[v]
}
