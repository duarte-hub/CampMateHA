import type {
  Trip, PackingItem, ItineraryDay, Meal, BudgetItem, Reminder,
} from './types'

function uid() { return crypto.randomUUID() }

export function nightsBetween(start: string, end: string): number {
  return Math.max(1, Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
  ))
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

  // Food & Water
  list.push(item('Food & Water', 'Portable fridge / cooler'))
  list.push(item('Food & Water', 'Ice (bags)', Math.ceil(nights * 1.5)))
  list.push(item('Food & Water', '20L water container', nights > 2 ? 2 : 1))
  list.push(item('Food & Water', 'Water bottle per person', people))
  list.push(item('Food & Water', 'Rubbish bags', nights))

  // Clothing
  list.push(item('Clothing', 'Warm jacket', people))
  list.push(item('Clothing', 'Rain jacket', people))
  list.push(item('Clothing', 'Thermal layers', people))
  list.push(item('Clothing', 'Sturdy shoes / boots', people))
  list.push(item('Clothing', 'Camp sandals / thongs', people))
  list.push(item('Clothing', 'Sun hat', people))
  if (hasBeach) {
    list.push(item('Clothing', 'Swimwear', people))
    list.push(item('Clothing', 'Rash vest / sun shirt', people))
    list.push(item('Clothing', 'Towel', people))
  }

  // Lighting & Power
  list.push(item('Lighting & Power', 'Headtorch', people))
  list.push(item('Lighting & Power', 'Spare batteries / charging cable'))
  list.push(item('Lighting & Power', 'Camp lantern'))
  if (nights > 2) {
    list.push(item('Lighting & Power', 'Portable power bank'))
    list.push(item('Lighting & Power', 'Solar panel'))
  }

  // Safety & First Aid
  list.push(item('Safety & First Aid', 'First aid kit'))
  list.push(item('Safety & First Aid', 'Sunscreen SPF50+'))
  list.push(item('Safety & First Aid', 'Insect repellent'))
  list.push(item('Safety & First Aid', 'Snake bite bandage', 2))
  list.push(item('Safety & First Aid', 'Emergency whistle'))
  list.push(item('Safety & First Aid', 'Offline maps / navigation app'))
  list.push(item('Safety & First Aid', 'Emergency contact list'))
  if (isBeginner || nights > 3) {
    list.push(item('Safety & First Aid', 'PLB / EPIRB emergency beacon'))
  }

  // Kids
  if (hasKids) {
    list.push(item('Kids', 'Kids sleeping bag', t.kids))
    list.push(item('Kids', 'Extra clothing sets for kids', t.kids * 2))
    list.push(item('Kids', 'Kids headtorch', t.kids))
    list.push(item('Kids', 'Kids sunscreen'))
    list.push(item('Kids', 'Wipes / hand sanitiser', 2))
    list.push(item('Kids', 'Books, games, activities'))
    list.push(item('Kids', 'Glow sticks for evening'))
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

export function generateBudget(trip: Trip): BudgetItem[] {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const people = trip.adults + trip.kids
  const is4WD = trip.vehicleType === '4wd'

  function item(category: string, name: string, estimatedCost: number): BudgetItem {
    return { id: uid(), tripId: trip.id, category, name, estimatedCost }
  }

  return [
    item('Campsite', 'Campsite / permit fees', nights * 45),
    item('Transport', 'Fuel (estimate)', nights * (is4WD ? 90 : 55)),
    item('Transport', 'Ferry / barge (if applicable)', 0),
    item('Food & Supplies', 'Groceries & food', people * 25 * nights),
    item('Food & Supplies', 'Ice (bags)', nights * 8),
    item('Food & Supplies', 'Drinks & snacks', people * 10 * nights),
    item('Camp Supplies', 'Gas canisters', Math.ceil(nights / 2) * 10),
    ...(trip.activities.includes('campfire') ? [item('Camp Supplies', 'Firewood', nights * 15)] : []),
    ...(trip.activities.includes('fishing') ? [
      item('Activities', 'Fishing licence / permits', trip.adults * 12),
      item('Activities', 'Bait & tackle top-up', 30),
    ] : []),
    ...(trip.activities.includes('4wd') ? [item('Activities', 'National park / 4WD track entry', 25)] : []),
    item('Miscellaneous', 'Contingency fund', 100),
  ]
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export function generateReminders(trip: Trip): Reminder[] {
  const nights = nightsBetween(trip.startDate, trip.endDate)
  const is4WD = trip.vehicleType === '4wd'

  function rem(type: string, message: string, severity: Reminder['severity']): Reminder {
    return { id: uid(), tripId: trip.id, type, message, severity }
  }

  const list: Reminder[] = [
    rem('booking', 'Book your campsite early — popular spots fill fast, especially in school holidays', 'warning'),
    rem('weather', 'Check the extended forecast 3–5 days before departure', 'info'),
    rem('vehicle', 'Service vehicle before a long trip — check tyres, oil, and cooling', 'warning'),
    rem('safety', 'Tell someone your full trip plan and expected return date', 'critical'),
  ]

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
