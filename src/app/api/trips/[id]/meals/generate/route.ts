import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { readDb, writeDb, readSettings } from '@/lib/db'
import type { Meal, ShoppingItem, ShopCategory, MealType } from '@/lib/types'

interface RawMeal { date: string; mealType: string; title: string; notes: string; ingredients?: string[] }
interface RawItem { name: string; quantity: string; category: string; mealRef: string }

// ─── Local template fallback ────────────────────────────────────────────────

const BREAKFASTS = [
  { title: 'Bacon & eggs', notes: 'Pan fry', ingredients: ['bacon rashers', 'eggs', 'bread'] },
  { title: 'Oat porridge', notes: 'Add dried fruit & honey', ingredients: ['rolled oats', 'dried fruit', 'honey', 'milk powder'] },
  { title: 'Pancakes', notes: 'Add fruit or maple syrup', ingredients: ['pancake mix', 'eggs', 'milk', 'maple syrup'] },
  { title: 'Weetbix & milk', notes: 'Quick and easy', ingredients: ['weetbix', 'milk powder', 'sugar'] },
  { title: 'Toast & vegemite', notes: '', ingredients: ['bread', 'vegemite', 'butter'] },
  { title: 'Muesli with yoghurt', notes: '', ingredients: ['muesli', 'long-life yoghurt', 'honey'] },
  { title: 'Scrambled eggs on toast', notes: '', ingredients: ['eggs', 'bread', 'butter', 'cheese'] },
]
const LUNCHES = [
  { title: 'Wraps with salad & chicken', notes: 'Prep in morning', ingredients: ['wraps', 'tinned chicken', 'salad leaves', 'cheese', 'mayo'] },
  { title: 'Cheese & salami rolls', notes: '', ingredients: ['bread rolls', 'salami', 'cheese', 'tomato'] },
  { title: 'Instant noodles', notes: 'Add egg or vegies', ingredients: ['instant noodles', 'eggs', 'soy sauce'] },
  { title: 'Tuna & crackers', notes: '', ingredients: ['tinned tuna', 'crackers', 'mayo', 'lemon'] },
  { title: 'Leftover dinner', notes: 'Reheat last night\'s meal', ingredients: [] },
  { title: 'Pita bread with hummus', notes: '', ingredients: ['pita bread', 'hummus', 'cucumber', 'carrot'] },
  { title: 'Toasted sandwiches', notes: 'Use jaffle iron on campfire', ingredients: ['bread', 'cheese', 'ham', 'tomato'] },
]
const DINNERS_CAMPFIRE = [
  { title: 'Camp oven beef stew', notes: 'Slow cook in camp oven 2-3 hrs', ingredients: ['beef chuck (1kg)', 'onions', 'carrots', 'potato', 'beef stock', 'tomato paste', 'garlic'] },
  { title: 'BBQ sausages & veg', notes: 'Grill on camp fire grate', ingredients: ['sausages (2 packs)', 'capsicum', 'zucchini', 'onion', 'bread rolls'] },
  { title: 'Campfire pasta bolognese', notes: '', ingredients: ['mince (500g)', 'pasta', 'pasta sauce (jar)', 'onion', 'garlic', 'parmesan'] },
  { title: 'Camp oven damper with soup', notes: '', ingredients: ['self-raising flour', 'tinned soup (2 cans)', 'butter', 'milk powder'] },
  { title: 'Foil-wrapped jacket potatoes', notes: 'Bury in coals 45 min', ingredients: ['potatoes', 'butter', 'sour cream (long-life)', 'cheese', 'bacon'] },
  { title: 'Campfire chilli con carne', notes: '', ingredients: ['mince (500g)', 'tinned tomatoes', 'kidney beans', 'chilli powder', 'cumin', 'rice'] },
]
const DINNERS_STANDARD = [
  { title: 'Spaghetti bolognese', notes: '', ingredients: ['mince (500g)', 'pasta', 'pasta sauce (jar)', 'onion', 'garlic', 'parmesan'] },
  { title: 'Chicken stir fry & rice', notes: '', ingredients: ['chicken breast (500g)', 'stir fry veg (frozen)', 'soy sauce', 'oyster sauce', 'rice', 'garlic'] },
  { title: 'Beef tacos', notes: '', ingredients: ['mince (500g)', 'taco shells', 'taco seasoning', 'salsa', 'cheese', 'sour cream'] },
  { title: 'Tinned curry & rice', notes: 'Quick travel day meal', ingredients: ['curry (tinned x2)', 'rice', 'naan bread'] },
  { title: 'Grilled sausages & potato salad', notes: '', ingredients: ['sausages', 'potatoes', 'mayo', 'spring onions', 'mustard'] },
  { title: 'Fried rice with egg', notes: 'Great for leftover rice', ingredients: ['rice', 'eggs (3)', 'frozen peas', 'soy sauce', 'sesame oil'] },
  { title: 'Pasta with tinned tomato & feta', notes: '', ingredients: ['pasta', 'tinned tomatoes', 'feta', 'olives', 'basil', 'garlic'] },
]
const FISH_DINNERS = [
  { title: 'Fresh fish & chips', notes: 'Fry today\'s catch', ingredients: ['fresh catch', 'flour', 'beer batter mix', 'potatoes', 'oil', 'lemon'] },
  { title: 'Foil-baked fish', notes: 'Wrap in foil with butter & herbs, cook on coals', ingredients: ['fresh catch', 'butter', 'lemon', 'garlic', 'herbs', 'foil'] },
  { title: 'Fish tacos', notes: '', ingredients: ['fresh catch', 'tortillas', 'cabbage slaw', 'lime', 'chipotle mayo'] },
]
const SNACKS = [
  'Trail mix (nuts, dried fruit, choc chips)',
  'Fruit & crackers',
  'Nut bars & muesli bars',
  'Tim Tams / biscuits',
  'Carrot & celery sticks with hummus',
  'Popcorn',
  'Corn chips & salsa',
]

function pickRound<T>(arr: T[], day: number): T { return arr[day % arr.length] }

function localTemplate(
  nights: number,
  startDate: string,
  hasCampfire: boolean,
  hasFishing: boolean,
  adults: number,
  kids: number,
  dietary: string[]
): { meals: RawMeal[]; shoppingItems: RawItem[] } {
  const isVeg = dietary.some(d => d === 'Vegetarian' || d === 'Vegan')
  const isGF  = dietary.some(d => d === 'Gluten-free')
  const meals: RawMeal[] = []
  const ingredientMap: Map<string, { qty: number; category: ShopCategory; mealRef: string }> = new Map()

  function addIngredients(ingredients: string[], mealTitle: string, category: ShopCategory) {
    for (const ing of ingredients) {
      const key = ing.toLowerCase().replace(/\(.*\)/, '').trim()
      const existing = ingredientMap.get(key)
      if (!existing) ingredientMap.set(key, { qty: 1, category, mealRef: mealTitle })
      else existing.qty++
    }
  }

  function catFor(ing: string): ShopCategory {
    const i = ing.toLowerCase()
    if (/\b(carrot|potato|onion|garlic|capsicum|zucchini|tomato|cabbage|cucumber|salad|veg|fruit)\b/.test(i)) return 'produce'
    if (/\b(beef|chicken|mince|sausage|bacon|salami|ham|fish|tuna|seafood)\b/.test(i)) return 'meat'
    if (/\b(milk|cheese|egg|yoghurt|butter|cream|feta|parmesan)\b/.test(i)) return 'dairy'
    if (/\b(bread|roll|wrap|pita|naan|tortilla|pancake|flour|damper)\b/.test(i)) return 'bakery'
    if (/\b(frozen)\b/.test(i)) return 'frozen'
    if (/\b(water|juice|drink|coffee|tea|beer)\b/.test(i)) return 'drinks'
    return 'pantry'
  }

  const dinners = hasCampfire
    ? (isVeg ? DINNERS_STANDARD : [...DINNERS_CAMPFIRE, ...DINNERS_STANDARD])
    : DINNERS_STANDARD

  for (let d = 0; d < nights; d++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + d)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const isTravelDay = d === 0 || d === nights - 1

    // Breakfast
    const bk = pickRound(BREAKFASTS, d)
    meals.push({ date: dateStr, mealType: 'breakfast', title: bk.title, notes: bk.notes, ingredients: bk.ingredients })
    bk.ingredients.forEach(i => addIngredients([i], bk.title, catFor(i)))

    // Lunch
    const lk = isTravelDay
      ? { title: 'Packed lunch (wraps/rolls)', notes: 'Easy on travel days', ingredients: ['wraps', 'tinned chicken', 'cheese', 'salad'] }
      : pickRound(LUNCHES, d)
    meals.push({ date: dateStr, mealType: 'lunch', title: lk.title, notes: lk.notes, ingredients: lk.ingredients })
    lk.ingredients.forEach(i => addIngredients([i], lk.title, catFor(i)))

    // Dinner
    let dinner
    if (!isTravelDay && hasFishing && d % 4 === 0 && !isVeg) {
      dinner = pickRound(FISH_DINNERS, d)
    } else if (isTravelDay) {
      dinner = { title: 'Tinned curry & rice', notes: 'Easy after a long drive', ingredients: ['curry (tinned x2)', 'rice', 'naan bread'] }
    } else {
      dinner = pickRound(dinners, d)
    }
    if (isVeg && (dinner.title.toLowerCase().includes('beef') || dinner.title.toLowerCase().includes('chicken') || dinner.title.toLowerCase().includes('mince'))) {
      dinner = { title: 'Veggie pasta', notes: 'Sub with lentils for protein', ingredients: ['pasta', 'tinned tomatoes', 'lentils', 'spinach', 'garlic', 'parmesan'] }
    }
    meals.push({ date: dateStr, mealType: 'dinner', title: dinner.title, notes: dinner.notes, ingredients: dinner.ingredients ?? [] })
    ;(dinner.ingredients ?? []).forEach(i => addIngredients([i], dinner.title, catFor(i)))

    // Snacks (one per day)
    const snack = SNACKS[d % SNACKS.length]
    meals.push({ date: dateStr, mealType: 'snack', title: snack, notes: '', ingredients: [] })
  }

  // Build shopping list
  const shoppingItems: RawItem[] = Array.from(ingredientMap.entries()).map(([name, v]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity: v.qty > 1 ? `×${v.qty}` : '',
    category: v.category,
    mealRef: v.mealRef,
  }))

  // Add common camping staples
  const staples: RawItem[] = [
    { name: 'Cooking oil', quantity: '1L', category: 'pantry', mealRef: 'General' },
    { name: 'Salt & pepper', quantity: '', category: 'pantry', mealRef: 'General' },
    { name: 'Tomato sauce & mustard', quantity: '', category: 'pantry', mealRef: 'General' },
    { name: 'Coffee / tea', quantity: '', category: 'drinks', mealRef: 'General' },
    { name: 'Drinking water / jugs', quantity: `${(adults + kids) * nights * 2}L`, category: 'drinks', mealRef: 'General' },
    { name: 'Washing-up liquid', quantity: '', category: 'other', mealRef: 'General' },
  ]

  return { meals, shoppingItems: [...shoppingItems, ...staples] }
}

// ─── Claude AI generation ────────────────────────────────────────────────────

async function generateWithClaude(
  apiKey: string,
  destination: string,
  startDate: string,
  nights: number,
  adults: number,
  kids: number,
  campingStyle: string,
  activities: string[],
  dietary: string[]
): Promise<{ meals: RawMeal[]; shoppingItems: RawItem[] }> {
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + nights)

  const prompt = `You are a practical camping meal planner for Australia. Generate a day-by-day meal plan.

Trip:
- Destination: ${destination}
- Dates: ${startDate} to ${endDate.toISOString().split('T')[0]} (${nights} nights)
- Campers: ${adults} adult${adults!==1?'s':''}, ${kids} kid${kids!==1?'s':''}
- Setup: ${campingStyle}
- Activities: ${activities.join(', ')}
- Dietary: ${dietary.length ? dietary.join(', ') : 'no restrictions'}

Rules:
- Practical, achievable camping meals
- First and last days: easy meals (travel days)
${activities.includes('campfire') ? '- Include camp oven / campfire meals' : ''}
${activities.includes('fishing') ? '- Include 2-3 fresh fish dinners (assume successful catch)' : ''}
${kids > 0 ? '- Include kid-friendly options' : ''}
- For trips > 7 days, rotate meals (repeat is fine)
- Consolidate shopping list quantities

Return ONLY valid JSON (no markdown, no explanation):
{
  "meals": [
    { "date": "YYYY-MM-DD", "mealType": "breakfast|lunch|dinner|snack", "title": "...", "notes": "...", "ingredients": ["..."] }
  ],
  "shoppingItems": [
    { "name": "...", "quantity": "...", "category": "produce|meat|dairy|bakery|pantry|frozen|drinks|other", "mealRef": "..." }
  ]
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60000),
  })

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`)
  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  // Strip any accidental markdown code fences
  const json = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  return JSON.parse(json)
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db   = readDb()
  const trip = db.trips.find(t => t.id === id)
  if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })

  const settings  = readSettings()
  const dietary   = settings.dietaryRestrictions ?? []
  const apiKey    = settings.anthropicApiKey

  const startDate = trip.startDate
  const nights    = Math.max(1, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000))
  const hasCampfire = trip.activities.includes('campfire')
  const hasFishing  = trip.activities.includes('fishing')

  let result: { meals: RawMeal[]; shoppingItems: RawItem[] }
  let source = 'template'

  if (apiKey) {
    try {
      result = await generateWithClaude(apiKey, trip.destination, startDate, nights, trip.adults, trip.kids, trip.campingStyle, trip.activities, dietary)
      source = 'claude'
    } catch (e) {
      console.error('Claude generation failed, falling back to template:', e)
      result = localTemplate(nights, startDate, hasCampfire, hasFishing, trip.adults, trip.kids, dietary)
    }
  } else {
    result = localTemplate(nights, startDate, hasCampfire, hasFishing, trip.adults, trip.kids, dietary)
  }

  // Clear existing meals + shopping items for this trip
  db.meals = db.meals.filter(m => m.tripId !== id)
  db.shoppingItems = (db.shoppingItems ?? []).filter(s => s.tripId !== id)

  // Save meals
  const newMeals: Meal[] = result.meals.map(m => ({
    id:          randomUUID(),
    tripId:      id,
    date:        m.date,
    mealType:    m.mealType as MealType,
    title:       m.title,
    notes:       m.notes ?? '',
    ingredients: m.ingredients ?? [],
  }))

  // Save shopping items
  const validCategories: ShopCategory[] = ['produce','meat','dairy','bakery','pantry','frozen','drinks','other']
  const newItems: ShoppingItem[] = result.shoppingItems.map(s => ({
    id:       randomUUID(),
    tripId:   id,
    name:     s.name,
    quantity: s.quantity ?? '',
    category: validCategories.includes(s.category as ShopCategory) ? s.category as ShopCategory : 'other',
    mealRef:  s.mealRef ?? '',
    checked:  false,
  }))

  db.meals.push(...newMeals)
  db.shoppingItems.push(...newItems)
  writeDb(db)

  return NextResponse.json({ ok: true, meals: newMeals.length, shoppingItems: newItems.length, source })
}
