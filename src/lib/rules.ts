import type {
  Trip, PackingItem, ItineraryDay, Meal, BudgetItem, Reminder, Waypoint, AppSettings, MealType,
} from './types'

function uid() { return crypto.randomUUID() }

export function nightsBetween(start: string, end: string): number {
  return Math.max(0, Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  ))
}

export function isDayTrip(start: string, end: string): boolean {
  return nightsBetween(start, end) === 0
}

function addDays(base: string, n: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── Packing ────────────────────────────────────────────────────────────────

export function generatePackingList(trip: Trip): PackingItem[] {
  const t = trip
  const nights = nightsBetween(t.startDate, t.endDate)
  const dayOnly = nights === 0
  const people = t.adults + t.kids
  const isTent = t.campingStyle === 'tent'
  const isMobile = t.campingStyle === 'camper_trailer' || t.campingStyle === 'caravan'
  const is4WD = t.vehicleType === '4wd'
  const hasFish = t.activities.includes('fishing')
  const hasBeach = t.activities.includes('beach') || t.activities.includes('swimming')
  const hasHike = t.activities.includes('hiking')
  const hasFire = t.activities.includes('campfire')
  const hasKids = t.kids > 0
  const isBeginner = t.experienceLevel === 'beginner'

  function item(category: string, name: string, quantity = 1): PackingItem {
    return { id: uid(), tripId: t.id, category, name, quantity, assignedTo: '', checked: false, isCustom: false }
  }

  const list: PackingItem[] = []

  if (!dayOnly) {
    // Shelter
    if (isTent) {
      list.push(item('Shelter', 'Tent'))
      list.push(item('Shelter', 'Extra tent pegs'))
      list.push(item('Shelter', 'Ground sheet'))
      list.push(item('Shelter', 'Tarp / shade shelter'))
      list.push(item('Shelter', 'Rubber mallet'))
    }
    if (isMobile) {
      list.push(item('Shelter', 'Awning / annex'))
      list.push(item('Shelter', 'Levelling blocks', 4))
      list.push(item('Shelter', 'Chocks / wheel stops', 2))
    }

    // Sleeping
    list.push(item('Sleeping', 'Sleeping bag', people))
    list.push(item('Sleeping', 'Sleeping mat / pad', people))
    list.push(item('Sleeping', 'Pillow', people))
    if (nights > 2) list.push(item('Sleeping', 'Extra blanket', Math.ceil(people / 2)))

    // Cooking
    list.push(item('Cooking', 'Camp stove'))
    list.push(item('Cooking', 'Gas canisters', Math.ceil(nights / 2) + 1))
    list.push(item('Cooking', 'Pot & pan set'))
    list.push(item('Cooking', 'Kettle'))
    list.push(item('Cooking', 'Plates, bowls, cutlery', people))
    list.push(item('Cooking', 'Cups / mugs', people))
    list.push(item('Cooking', 'Cutting board & knife'))
    list.push(item('Cooking', 'Washing-up basin & soap'))
    list.push(item('Cooking', 'Cooking oil & spices'))
    list.push(item('Cooking', 'Aluminium foil'))
    list.push(item('Cooking', 'Ziplock / food storage bags', 6))
    if (hasFire) {
      list.push(item('Cooking', 'Camp oven / cast iron'))
      list.push(item('Cooking', 'Fire starters / lighters', 2))
      list.push(item('Cooking', 'Firewood & kindling', nights))
      list.push(item('Cooking', 'Long oven gloves'))
      list.push(item('Cooking', 'Campfire grill grate'))
    }
  }

  // Food & Water (lighter for day trip)
  if (dayOnly) {
    list.push(item('Food & Water', 'Cooler / esky for food & drinks'))
    list.push(item('Food & Water', 'Packed lunch & snacks'))
    list.push(item('Food & Water', 'Water bottle per person', people))
    list.push(item('Food & Water', 'Rubbish bag', 1))
  } else {
    list.push(item('Food & Water', 'Portable fridge / cooler'))
    list.push(item('Food & Water', 'Ice (bags)', Math.ceil(nights * 1.5)))
    list.push(item('Food & Water', '20L water container', nights > 2 ? 2 : 1))
    list.push(item('Food & Water', 'Water bottle per person', people))
    list.push(item('Food & Water', 'Rubbish bags', nights))
  }

  // Clothing
  list.push(item('Clothing', 'Warm jacket', people))
  list.push(item('Clothing', 'Rain jacket', people))
  if (!dayOnly) list.push(item('Clothing', 'Thermal layers', people))
  list.push(item('Clothing', 'Sturdy shoes / boots', people))
  if (!dayOnly) list.push(item('Clothing', 'Camp sandals / thongs', people))
  list.push(item('Clothing', 'Sun hat', people))
  if (hasBeach) {
    list.push(item('Clothing', 'Swimwear', people))
    list.push(item('Clothing', 'Rash vest / sun shirt', people))
    list.push(item('Clothing', 'Towel', people))
  }

  if (!dayOnly) {
    // Lighting & Power
    list.push(item('Lighting & Power', 'Headtorch', people))
    list.push(item('Lighting & Power', 'Spare batteries / charging cable'))
    list.push(item('Lighting & Power', 'Camp lantern'))
    if (nights > 2) {
      list.push(item('Lighting & Power', 'Portable power bank'))
      list.push(item('Lighting & Power', 'Solar panel'))
    }
  }

  // Safety & First Aid
  list.push(item('Safety & First Aid', 'First aid kit'))
  list.push(item('Safety & First Aid', 'Sunscreen SPF50+'))
  list.push(item('Safety & First Aid', 'Insect repellent'))
  list.push(item('Safety & First Aid', 'Snake bite bandage', 2))
  list.push(item('Safety & First Aid', 'Emergency whistle'))
  list.push(item('Safety & First Aid', 'Offline maps / navigation app'))
  list.push(item('Safety & First Aid', 'Emergency contact list'))
  if (!dayOnly && (isBeginner || nights > 3)) {
    list.push(item('Safety & First Aid', 'PLB / EPIRB emergency beacon'))
  }

  // Kids
  if (hasKids) {
    if (!dayOnly) list.push(item('Kids', 'Kids sleeping bag', t.kids))
    list.push(item('Kids', 'Extra clothing sets for kids', t.kids * 2))
    if (!dayOnly) list.push(item('Kids', 'Kids headtorch', t.kids))
    list.push(item('Kids', 'Kids sunscreen'))
    list.push(item('Kids', 'Wipes / hand sanitiser', 2))
    list.push(item('Kids', 'Books, games, activities'))
    if (!dayOnly) list.push(item('Kids', 'Glow sticks for evening'))
  }

  // 4WD & Recovery
  if (is4WD) {
    list.push(item('4WD & Recovery', 'Tyre pressure gauge'))
    list.push(item('4WD & Recovery', 'Portable air compressor'))
    list.push(item('4WD & Recovery', 'Snatch strap'))
    list.push(item('4WD & Recovery', 'Recovery boards (MaxTrax)', 2))
    list.push(item('4WD & Recovery', 'High-lift jack'))
    list.push(item('4WD & Recovery', 'Jumper cables / jump pack'))
    list.push(item('4WD & Recovery', 'Jerry cans (extra fuel)', 2))
    if (hasBeach) list.push(item('4WD & Recovery', 'Tyre deflators', 4))
  }

  // Fishing
  if (hasFish) {
    list.push(item('Fishing', 'Fishing rods', t.adults))
    list.push(item('Fishing', 'Tackle box (lures, hooks, sinkers)'))
    list.push(item('Fishing', 'Bait (fresh or frozen)'))
    list.push(item('Fishing', 'Landing net'))
    list.push(item('Fishing', 'Measuring tape / brag mat'))
    list.push(item('Fishing', 'Esky / cooler for catch'))
    list.push(item('Fishing', 'Fishing licence (check your state)'))
    list.push(item('Fishing', 'Polarised sunglasses', t.adults))
    list.push(item('Fishing', 'Fillet knife'))
  }

  // Hiking
  if (hasHike) {
    list.push(item('Hiking', 'Day pack', people))
    list.push(item('Hiking', 'Trekking poles', t.adults))
    list.push(item('Hiking', 'Trail map / compass'))
    list.push(item('Hiking', 'Water filter / purification tabs'))
  }

  if (!dayOnly) {
    // Toiletries
    list.push(item('Toiletries', 'Toilet paper', nights + 1))
    list.push(item('Toiletries', 'Toothbrush & toothpaste', people))
    list.push(item('Toiletries', 'Biodegradable soap & shampoo'))
    list.push(item('Toiletries', 'Trowel (bush toileting)'))

    // Camp Setup
    list.push(item('Camp Setup', 'Camp chairs', people))
    list.push(item('Camp Setup', 'Camp table'))
    list.push(item('Camp Setup', 'Clothesline & pegs'))
    list.push(item('Camp Setup', 'Multi-tool / pocket knife'))
    list.push(item('Camp Setup', 'Duct tape'))
    list.push(item('Camp Setup', 'Cable ties', 10))
    list.push(item('Camp Setup', 'Outdoor mat / rug'))
  } else {
    // Day trip — just the basics
    list.push(item('Essentials', 'Picnic blanket / folding chairs'))
    list.push(item('Essentials', 'Multi-tool / pocket knife'))
    list.push(item('Essentials', 'Portable power bank'))
  }

  return list
}

// ─── Itinerary ───────────────────────────────────────────────────────────────

const BREAKFAST = [
  'Bacon & eggs on the camp stove',
  'Oats with fruit',
  'Pancakes with maple syrup',
  'French toast',
  'Toasted sandwiches',
]
const LUNCH = [
  'Sandwiches & snacks',
  'Wraps with salad',
  'Crackers, cheese & cold meats',
  'Noodle soup',
  'Leftovers from last night',
]
const DINNER_BASE = [
  'Camp oven roast with vegies',
  'Spaghetti bolognese',
  'BBQ sausages & salad',
  'Beef & vegie curry with rice',
  'Tacos with seasoned beef',
  'Chicken stir-fry with noodles',
]
const DINNER_FISH = [
  'Freshly caught fish — battered & fried',
  'Garlic butter fish with potato',
  'Fish tacos with slaw',
  ...DINNER_BASE,
]

export function generateItinerary(trip: Trip): ItineraryDay[] {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const acts = trip.activities
  const hasFire = acts.includes('campfire')
  const days: ItineraryDay[] = []

  // Day trip — single entry
  if (nights === 0) {
    const primary = acts[0]
    let summary = `Day trip to ${trip.destination}`
    let activities: string[]

    if (primary === 'fishing') {
      summary = `Fishing day trip to ${trip.destination}`
      activities = ['Depart early — morning bite is best', 'Check tide & spot conditions', 'Morning fishing session', 'Packed lunch at the water', 'Afternoon fishing or explore', 'Pack up and head home']
    } else if (primary === 'hiking') {
      summary = `Day hike at ${trip.destination}`
      activities = ['Early departure — beat the heat', 'Check trail conditions & weather', 'Morning hike (bring plenty of water)', 'Lunch at a viewpoint or trailhead', 'Afternoon: easier walk or head back', 'Return home']
    } else if (primary === 'beach' || primary === 'swimming') {
      summary = `Beach day at ${trip.destination}`
      activities = ['Depart early to get a good spot', 'Swim, surf, or explore the beach', 'Packed lunch on the sand', 'Afternoon beach activities', 'Rinse off and pack up', 'Return home']
    } else if (primary === '4wd') {
      summary = `4WD day trip to ${trip.destination}`
      activities = ['Lower tyre pressures before hitting tracks', 'Check track conditions & fuel level', 'Morning 4WD exploration', 'Lunch at a scenic stop', 'Afternoon tracks or head back', 'Re-inflate tyres on sealed road']
    } else {
      activities = ['Depart in the morning', `Arrive at ${trip.destination}`, 'Explore and enjoy activities', 'Packed lunch or find a café', 'Afternoon activities', 'Pack up and return home']
    }

    days.push({ id: uid(), tripId: trip.id, date: trip.startDate, dayNumber: 1, summary, activities, notes: `Depart: ${formatDate(trip.startDate)}` })
    return days
  }

  for (let i = 0; i <= nights; i++) {
    const date = addDays(trip.startDate, i)
    const dayNum = i + 1
    let summary: string
    let activities: string[]

    if (i === 0) {
      summary = `Departure — drive to ${trip.destination} and set up camp`
      activities = [
        'Final gear & vehicle check',
        'Depart early to beat traffic',
        `Arrive ${trip.destination}`,
        'Set up camp before dark',
        'Quick & easy first-night dinner',
        'Settle in and relax',
      ]
    } else if (i === nights) {
      summary = `Pack-down day — clean camp and head home`
      activities = [
        'Early breakfast',
        'Pack down camp systematically',
        'Leave site clean — pack in, pack out',
        'Final vehicle check',
        'Depart for home',
        'Fuel stop & debrief on the road',
      ]
    } else {
      const primary = acts[(i - 1) % Math.max(acts.length, 1)]
      if (primary === 'fishing') {
        summary = `Fishing day at ${trip.destination}`
        activities = [
          'Early morning fishing session',
          'Check tide times & best spots',
          hasBeach(trip) ? 'Midday beach walk & explore' : 'Lunch at camp',
          'Afternoon fishing or river swim',
          'Cook catch of the day for dinner',
          hasFire ? 'Campfire and star gazing' : 'Relax and unwind at camp',
        ]
      } else if (primary === 'hiking') {
        summary = `Hiking day — explore the trails around ${trip.destination}`
        activities = [
          'Early breakfast, pack day bags',
          'Morning hike (check trail conditions first)',
          'Lunch on trail or at a viewpoint',
          'Afternoon: easier walk or rest at camp',
          'Hot wash and freshen up',
          hasFire ? 'Campfire evening' : 'Cook dinner & relax',
        ]
      } else if (primary === 'beach' || primary === 'swimming') {
        summary = `Beach day at ${trip.destination}`
        activities = [
          'Early beach walk at low tide',
          'Check surf conditions & tide chart',
          'Swim, snorkel, or fish the beach',
          'Beach picnic lunch',
          'Afternoon explore — different spot',
          'Rinse off, cook dinner, stories at camp',
        ]
      } else if (primary === '4wd') {
        summary = `4WD exploration around ${trip.destination}`
        activities = [
          'Lower tyre pressures (20–25 PSI for tracks)',
          'Morning: choose & check track conditions',
          'Explore 4WD tracks — stay on marked routes',
          'Lunch at a scenic stop on the track',
          'Afternoon: easier tracks or return to camp',
          'Re-inflate tyres on sealed road return',
        ]
      } else if (primary === 'campfire') {
        summary = `Slow day — relaxed camp activities at ${trip.destination}`
        activities = [
          'Slow morning coffee & sunrise',
          'Short walk or camp explore',
          'Camp cooking lunch together',
          'Afternoon: read, nap, card games',
          'Start campfire in late afternoon',
          'Slow-cook over the fire for dinner, long evening',
        ]
      } else if (primary === 'kayaking') {
        summary = `Kayaking & water activities at ${trip.destination}`
        activities = [
          'Check water conditions & weather',
          'Morning kayak session',
          'Lunch at camp or a riverbank',
          'Afternoon paddle or rest',
          'Cook dinner',
          hasFire ? 'Campfire & stories' : 'Relax and star gaze',
        ]
      } else {
        summary = `Full day at ${trip.destination}`
        activities = [
          'Breakfast at camp',
          `Explore ${trip.destination}`,
          'Picnic lunch',
          'Afternoon activities',
          'Cook dinner',
          hasFire ? 'Campfire evening' : 'Relax',
        ]
      }
    }

    days.push({
      id: uid(),
      tripId: trip.id,
      date,
      dayNumber: dayNum,
      summary,
      activities,
      notes: i === 0 ? `Depart: ${formatDate(trip.startDate)}` : '',
    })
  }

  return days
}

function hasBeach(trip: Trip): boolean {
  return trip.activities.includes('beach') || trip.activities.includes('swimming')
}

// ─── Meals ───────────────────────────────────────────────────────────────────

export function generateMeals(trip: Trip): Meal[] {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const hasFish = trip.activities.includes('fishing')
  const hasFire = trip.activities.includes('campfire')
  const dinners = hasFish ? DINNER_FISH : DINNER_BASE
  const meals: Meal[] = []

  function meal(date: string, mealType: Meal['mealType'], title: string, notes = ''): Meal {
    return { id: uid(), tripId: trip.id, date, mealType, title, notes }
  }

  // Day trip — just a packed lunch and snacks
  if (nights === 0) {
    meals.push(meal(trip.startDate, 'lunch', 'Packed lunch (sandwiches, wraps, or rolls)', 'Prepare before leaving'))
    meals.push(meal(trip.startDate, 'snack', 'Trail mix, fruit, muesli bars, drinks'))
    return meals
  }

  for (let i = 0; i <= nights; i++) {
    const date = addDays(trip.startDate, i)

    if (i === 0) {
      meals.push(meal(date, 'lunch', 'Packed lunch for the drive', 'Prepare before leaving'))
      meals.push(meal(date, 'dinner', dinners[0], 'Quick easy dinner after camp setup'))
    } else if (i === nights) {
      meals.push(meal(date, 'breakfast', BREAKFAST[1], 'Quick breakfast before pack-down'))
      meals.push(meal(date, 'lunch', 'Clear the fridge — use remaining food', 'Use up all perishables'))
    } else {
      meals.push(meal(date, 'breakfast', BREAKFAST[i % BREAKFAST.length]))
      meals.push(meal(date, 'lunch', LUNCH[i % LUNCH.length]))
      meals.push(meal(date, 'dinner', dinners[i % dinners.length], hasFire ? 'Can cook over the campfire' : ''))
      meals.push(meal(date, 'snack', 'Trail mix, fruit, muesli bars'))
    }
  }

  return meals
}

// ─── Budget ──────────────────────────────────────────────────────────────────

// Fishing licence requirements by Australian state
const FISHING_LICENCE: Record<string, { cost: number; note: string }> = {
  QLD: { cost: 0,  note: 'No recreational fishing licence required in QLD' },
  NSW: { cost: 0,  note: 'No recreational fishing licence required in NSW' },
  VIC: { cost: 42, note: 'VIC Recreational Fishing Licence (~$42/adult/year)' },
  SA:  { cost: 27, note: 'SA Recreational Fishing Licence (~$27/adult/year)' },
  WA:  { cost: 0,  note: 'No recreational fishing licence required in WA' },
  TAS: { cost: 30, note: 'TAS Inland Angling Licence (~$30/adult/year)' },
  NT:  { cost: 0,  note: 'No recreational fishing licence required in NT' },
  ACT: { cost: 15, note: 'ACT Fishing Licence (~$15/adult/year)' },
}

function detectState(destination: string): string | null {
  const d = destination.toUpperCase()
  if (d.includes('QLD') || d.includes('QUEENSLAND'))         return 'QLD'
  if (d.includes(' NSW') || d.includes('NEW SOUTH WALES'))   return 'NSW'
  if (d.includes(' VIC') || d.includes('VICTORIA'))          return 'VIC'
  if (d.includes(' SA') || d.includes('SOUTH AUSTRALIA'))    return 'SA'
  if (d.includes(' WA') || d.includes('WESTERN AUSTRALIA'))  return 'WA'
  if (d.includes('TAS') || d.includes('TASMANIA'))           return 'TAS'
  if (d.includes(' NT') || d.includes('NORTHERN TERRITORY')) return 'NT'
  if (d.includes('ACT') || d.includes('CAPITAL TERRITORY'))  return 'ACT'
  return null
}

const MEAL_RATE: Record<string, number> = { breakfast: 8, lunch: 10, dinner: 20, snack: 5 }

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function estimateTripKm(waypoints: Waypoint[], home?: { lat: number; lng: number }): number {
  const pts = [...waypoints].sort((a, b) => a.order - b.order).filter(w => w.lat && w.lng)
  if (pts.length === 0) return 0
  const chain: { lat: number; lng: number }[] = []
  if (home) chain.push(home)
  chain.push(...pts)
  if (home) chain.push(home)
  let km = 0
  for (let i = 0; i < chain.length - 1; i++) {
    km += haversineKm(chain[i].lat, chain[i].lng, chain[i + 1].lat, chain[i + 1].lng)
  }
  return Math.round(km * 1.35)
}

export function generateBudget(
  trip: Trip,
  settings?: AppSettings,
  waypoints?: Waypoint[],
  meals?: Meal[],
  roadDistanceKm?: number,   // pre-fetched OSRM distance
): BudgetItem[] {
  const nights  = nightsBetween(trip.startDate, trip.endDate)
  const dayOnly = nights === 0
  const adults  = trip.adults
  const kids    = trip.kids
  const people  = adults + kids
  const vc      = settings?.vehicleConfig
  const state   = detectState(trip.destination)

  // ── Vehicle & fuel ──────────────────────────────────────────────────────
  const defaultL100: Record<string, number> = { '2wd': 9, 'suv': 11, 'van': 12, '4wd': 14 }
  const baseL100   = vc?.consumptionL100km ?? defaultL100[trip.vehicleType] ?? 11
  const towL100    = vc?.towingConsumptionL100km ?? Math.round(baseL100 * 1.3)
  const l100       = vc?.isTowing ? towL100 : baseL100
  const fuelPriceL = vc?.fuelPricePerL ?? 2.10

  const wps = waypoints ?? []
  const distanceKm = roadDistanceKm
    ?? (wps.length > 0 ? estimateTripKm(wps, settings?.homeLocation) : dayOnly ? 200 : Math.max(300, nights * 200))
  const distSource = roadDistanceKm ? 'road' : wps.length > 0 ? 'est.' : 'est.'
  const fuelCost   = Math.round((distanceKm / 100) * l100 * fuelPriceL)
  const fuelLabel  = `Fuel — ~${distanceKm.toLocaleString()} km (${distSource}) · ${l100.toFixed(1)} L/100 · $${fuelPriceL.toFixed(2)}/L`

  function item(category: string, name: string, estimatedCost: number): BudgetItem {
    return { id: uid(), tripId: trip.id, category, name, estimatedCost: Math.max(0, Math.round(estimatedCost)) }
  }

  // ── Fishing licence (state-aware) ────────────────────────────────────────
  function fishingItems(): BudgetItem[] {
    if (!trip.activities.includes('fishing')) return []
    const licence = state ? FISHING_LICENCE[state] : null
    const licenceCost = licence?.cost ?? 25
    const licenceNote = licence?.note ?? `Fishing licence × ${adults} adults (check state requirements)`
    return [
      item('Activities', licence ? licence.note : licenceNote, adults * licenceCost),
      item('Activities', 'Bait & tackle', dayOnly ? 25 : 35),
    ]
  }

  // ── Day trip ─────────────────────────────────────────────────────────────
  if (dayOnly) {
    const lunchCost = Math.round(adults * 10 + kids * 7)
    const snackCost = Math.round(people * 8)
    const subtotal  = fuelCost + lunchCost + snackCost
    return [
      item('Transport', fuelLabel, fuelCost),
      item('Food', 'Packed lunch', lunchCost),
      item('Food', 'Snacks & drinks', snackCost),
      ...fishingItems(),
      ...(trip.activities.includes('4wd')     ? [item('Activities', 'National park / track entry', 25)] : []),
      ...(trip.activities.includes('kayaking')? [item('Activities', `Kayak hire × ${people}`, people * 50)] : []),
      item('Miscellaneous', 'Contingency (10%)', Math.round(subtotal * 0.10)),
    ]
  }

  // ── Multi-night trip ─────────────────────────────────────────────────────
  // Campsite: use trip's custom rate if set, otherwise style defaults
  const defaultRates: Record<string, number> = { tent: 40, camper_trailer: 50, caravan: 55, cabin: 120 }
  const campsiteRate = trip.campsiteRatePerNight ?? defaultRates[trip.campingStyle] ?? 45
  const campsiteCost = campsiteRate * nights

  // Food: use actual planned meals when available, otherwise estimate
  const kidFactor = 0.65
  let groceryCost: number
  let groceryLabel: string

  if (meals && meals.length > 0) {
    groceryCost  = Math.round(
      meals.reduce((sum, m) => {
        const rate = MEAL_RATE[m.mealType as MealType] ?? 10
        return sum + adults * rate + kids * rate * kidFactor
      }, 0)
    )
    const mealCounts = meals.reduce<Record<string, number>>((acc, m) => {
      acc[m.mealType] = (acc[m.mealType] ?? 0) + 1
      return acc
    }, {})
    const parts = Object.entries(mealCounts).map(([t, n]) => `${n} ${t}`).join(', ')
    groceryLabel = `Groceries — ${meals.length} planned meals (${parts})`
  } else {
    const day1Food  = Math.round(adults * (10 + 20) + kids * (10 + 20) * kidFactor)
    const fullDayF  = Math.round(adults * (8 + 10 + 20 + 5) + kids * (8 + 10 + 20 + 5) * kidFactor)
    const lastDFood = Math.round(adults * (8 + 10) + kids * (8 + 10) * kidFactor)
    groceryCost  = day1Food + fullDayF * Math.max(0, nights - 1) + lastDFood
    groceryLabel = `Groceries — ${people} people · ${nights + 1} days (estimated)`
  }

  const drinksCost = Math.round(people * 8 * (nights + 1))
  const iceCost    = nights * 8
  const gasCans    = Math.ceil(nights / 2) + 1
  const gasCost    = gasCans * 12
  const subtotal   = campsiteCost + fuelCost + groceryCost + drinksCost + iceCost + gasCost
  const contingency = Math.round(subtotal * 0.10)

  return [
    item('Campsite', `${trip.campingStyle.replace('_', ' ')} × ${nights} nights @ $${campsiteRate}/night`, campsiteCost),
    item('Transport', fuelLabel, fuelCost),
    item('Transport', 'Ferry / barge (if applicable)', 0),
    item('Food', groceryLabel, groceryCost),
    item('Food', 'Drinks & snacks', drinksCost),
    item('Food', 'Ice', iceCost),
    item('Camp Supplies', `Gas canisters × ${gasCans}`, gasCost),
    ...(trip.activities.includes('campfire')  ? [item('Camp Supplies', `Firewood × ${nights} nights`, nights * 15)] : []),
    ...fishingItems(),
    ...(trip.activities.includes('4wd')     ? [item('Activities', 'National park / track entry', 25)] : []),
    ...(trip.activities.includes('kayaking')? [item('Activities', `Kayak hire × ${people}`, people * 50)] : []),
    item('Miscellaneous', 'Contingency (10%)', contingency),
  ]
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export function generateReminders(trip: Trip): Reminder[] {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const dayOnly = nights === 0
  const is4WD = trip.vehicleType === '4wd'

  function rem(type: string, message: string, severity: Reminder['severity']): Reminder {
    return { id: uid(), tripId: trip.id, type, message, severity }
  }

  const list: Reminder[] = [
    rem('weather', 'Check the forecast the night before departure', dayOnly ? 'info' : 'info'),
    rem('safety', 'Tell someone where you are going and your expected return time', 'critical'),
  ]

  if (!dayOnly) {
    list.push(rem('booking', 'Book your campsite early — popular spots fill fast, especially in school holidays', 'warning'))
    list.push(rem('vehicle', 'Service vehicle before a long trip — check tyres, oil, and cooling', 'warning'))
  }

  if (nights > 3) {
    list.push(rem('supplies', 'Longer trip: carry extra water, food, and a fuel reserve', 'warning'))
    list.push(rem('power', 'Bring solar panel or secondary battery for extended trips', 'info'))
  }

  if (is4WD) {
    list.push(rem('4wd', 'Lower tyre pressures to 20–25 PSI for sand & tracks — re-inflate on sealed road', 'warning'))
    list.push(rem('4wd', 'Carry full recovery kit: snatch strap, boards, compressor', 'warning'))
    list.push(rem('4wd', 'Know your vehicle limits and check track conditions before entry', 'critical'))
  }

  if (trip.activities.includes('fishing')) {
    list.push(rem('fishing', 'Check fishing licence requirements for your destination state', 'warning'))
    list.push(rem('fishing', 'Check bag and size limits — keep only what you need', 'info'))
    list.push(rem('fishing', 'Research tide charts for your target spots', 'info'))
  }

  if (trip.activities.includes('beach') || trip.activities.includes('swimming')) {
    list.push(rem('beach', 'Check surf conditions and rip warnings at your beach', 'warning'))
    list.push(rem('beach', 'Reapply SPF50+ sunscreen every 2 hours', 'info'))
    if (is4WD) list.push(rem('4wd', 'Beach driving: drive at low tide, check conditions', 'warning'))
  }

  if (trip.activities.includes('campfire')) {
    list.push(rem('fire', 'Check total fire bans and restrictions before departure — they change seasonally', 'critical'))
    list.push(rem('fire', 'Keep a bucket of water or sand beside your campfire at all times', 'warning'))
    list.push(rem('fire', 'Fully extinguish before sleeping — never leave unattended', 'critical'))
  }

  if (trip.activities.includes('hiking')) {
    list.push(rem('hiking', 'Carry at least 1L of water per person per hour of walking', 'warning'))
    list.push(rem('hiking', 'Register your walking route at the park if a registry is available', 'info'))
    list.push(rem('hiking', 'Confirm trail difficulty matches your group ability', 'warning'))
  }

  if (trip.kids > 0) {
    list.push(rem('kids', 'Bring kids headtorches — they will wander at night', 'info'))
    list.push(rem('kids', 'Pack extra clothing for kids — they will get wet and muddy', 'info'))
    list.push(rem('kids', 'Set campsite rules with kids on arrival: stay close, no running near vehicles', 'warning'))
  }

  if (trip.experienceLevel === 'beginner') {
    list.push(rem('beginner', 'First trip? Start with a powered or well-serviced campsite', 'info'))
    list.push(rem('beginner', 'Do a full gear check at home — test any unfamiliar equipment', 'warning'))
  }

  return list
}

// ─── Itinerary from map waypoints ────────────────────────────────────────────

export function generateItineraryFromWaypoints(trip: Trip, waypoints: Waypoint[]): ItineraryDay[] {
  const stops = [...waypoints].sort((a, b) => a.order - b.order).filter(w => w.nights > 0)
  if (stops.length === 0) return generateItinerary(trip)

  const hasFire = trip.activities.includes('campfire')
  const days: ItineraryDay[] = []
  let dayNum = 1
  let date = trip.startDate

  for (let i = 0; i < stops.length; i++) {
    const wp = stops[i]
    const prev = stops[i - 1]

    for (let n = 0; n < wp.nights; n++) {
      const isArrival = n === 0
      const isLastNight = n === wp.nights - 1
      const hasNext = i < stops.length - 1

      let summary: string
      let activities: string[]

      if (isArrival && i === 0) {
        summary = `Depart — drive to ${wp.name}`
        activities = ['Final gear & vehicle check', 'Early departure', `Drive to ${wp.name}`, `Arrive ${wp.name}`, 'Set up camp / check in', 'Easy first-night dinner']
      } else if (isArrival) {
        summary = `Drive from ${prev.name} to ${wp.name}`
        activities = [`Pack up at ${prev.name}`, 'Quick breakfast before leaving', `Drive to ${wp.name}`, `Arrive ${wp.name}`, 'Set up / check in', 'Relax and explore']
      } else if (isLastNight && hasNext) {
        summary = `Last day at ${wp.name} — prepare to move on`
        activities = ['Morning activity', `Explore ${wp.name}`, 'Pack non-essentials', `Prepare for drive to ${stops[i + 1].name} tomorrow`, 'Dinner at camp', hasFire ? 'Final campfire' : 'Early night']
      } else {
        const act = trip.activities[(n - 1) % Math.max(trip.activities.length, 1)]
        summary = buildDaySummary(wp, act)
        activities = buildDayActivities(wp, act, hasFire)
      }

      days.push({ id: uid(), tripId: trip.id, date, dayNumber: dayNum++, summary, activities, notes: isArrival ? `Arrive: ${wp.name}` : '' })
      date = addDays(date, 1)
    }
  }

  // Final return-home day
  const last = stops[stops.length - 1]
  days.push({
    id: uid(), tripId: trip.id, date, dayNumber: dayNum,
    summary: `Pack down at ${last.name} — return home`,
    activities: ['Early breakfast', 'Pack down camp systematically', 'Leave site clean — pack in, pack out', 'Final vehicle check', 'Depart for home', 'Fuel stop & debrief on the road'],
    notes: `Return from ${last.name}`,
  })

  return days
}

function buildDaySummary(wp: Waypoint, act: string | undefined): string {
  if (wp.type === 'fishing' || act === 'fishing') return `Fishing day at ${wp.name}`
  if (act === 'beach' || act === 'swimming') return `Beach day at ${wp.name}`
  if (act === 'hiking') return `Hiking day around ${wp.name}`
  if (act === '4wd') return `4WD exploration around ${wp.name}`
  if (wp.type === 'attraction') return `Explore ${wp.name}`
  return `Full day at ${wp.name}`
}

function buildDayActivities(wp: Waypoint, act: string | undefined, hasFire: boolean): string[] {
  if (act === 'fishing' || wp.type === 'fishing') {
    return ['Early morning fishing session', 'Check tide & spot conditions', 'Lunch at camp or waterside', 'Afternoon fishing', 'Cook catch of the day for dinner', hasFire ? 'Campfire evening' : 'Relax at camp']
  }
  if (act === 'hiking') {
    return ['Early breakfast, pack day bags', 'Morning hike (check conditions first)', 'Lunch on trail or at viewpoint', 'Afternoon walk or rest at camp', 'Hot wash and freshen up', hasFire ? 'Campfire evening' : 'Cook dinner & relax']
  }
  if (act === 'beach' || act === 'swimming') {
    return ['Early beach walk at low tide', 'Swim, snorkel, or surf', 'Beach picnic lunch', 'Afternoon explore', 'Rinse off', 'Dinner at camp']
  }
  if (act === '4wd') {
    return ['Lower tyre pressures (20–25 PSI)', 'Morning 4WD tracks', 'Lunch at a scenic stop', 'Afternoon tracks or explore', 'Re-inflate tyres on return', 'Camp dinner']
  }
  return ['Slow morning coffee', `Explore ${wp.name}`, 'Lunch', 'Afternoon activities', 'Cook dinner', hasFire ? 'Campfire evening' : 'Relax and unwind']
}
