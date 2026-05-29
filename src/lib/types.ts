export type CampingStyle = 'tent' | 'camper_trailer' | 'caravan' | 'cabin'
export type VehicleType = '2wd' | '4wd' | 'suv' | 'van'
export type ExperienceLevel = 'beginner' | 'regular' | 'experienced'
export type ActivityType = 'beach' | 'fishing' | 'hiking' | '4wd' | 'campfire' | 'swimming' | 'kayaking'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ReminderSeverity = 'info' | 'warning' | 'critical'

export interface Trip {
  id: string
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
  createdAt: string
  updatedAt: string
}

export interface ItineraryDay {
  id: string
  tripId: string
  date: string
  dayNumber: number
  summary: string
  activities: string[]
  notes: string
}

export interface PackingItem {
  id: string
  tripId: string
  category: string
  name: string
  quantity: number
  assignedTo: string
  checked: boolean
  isCustom: boolean
}

export interface Meal {
  id: string
  tripId: string
  date: string
  mealType: MealType
  title: string
  notes: string
  ingredients?: string[]
  templateId?: string
  ingredientDetails?: MealIngredient[]
}

export type ShopCategory = 'produce' | 'meat' | 'dairy' | 'bakery' | 'pantry' | 'frozen' | 'drinks' | 'other'

export interface MealIngredient {
  name: string
  quantity: string
  category: ShopCategory
}

export interface MealTemplate {
  id: string
  name: string
  mealType: MealType
  ingredients: MealIngredient[]
  notes?: string
  isCustom?: boolean
}

export interface ShoppingItem {
  id: string
  tripId: string
  name: string
  quantity: string
  category: ShopCategory
  mealRef: string
  checked: boolean
}

export interface BudgetItem {
  id: string
  tripId: string
  category: string
  name: string
  estimatedCost: number
  actualCost?: number
}

export interface Reminder {
  id: string
  tripId: string
  type: string
  message: string
  severity: ReminderSeverity
}

export type WaypointType = 'campsite' | 'fuel' | 'food' | 'fishing' | 'attraction' | 'start' | 'end' | 'custom'

export interface Waypoint {
  id: string
  tripId: string
  name: string
  lat: number
  lng: number
  type: WaypointType
  notes: string
  order: number
  googleMapsUrl: string
  nights: number
}

export interface TripWithDetails extends Trip {
  itinerary: ItineraryDay[]
  packingItems: PackingItem[]
  meals: Meal[]
  budgetItems: BudgetItem[]
  reminders: Reminder[]
}

export interface VehicleConfig {
  fuelType: 'petrol' | 'diesel' | 'lpg'
  tankSizeL: number
  consumptionL100km: number
  towingConsumptionL100km: number
  isTowing: boolean
  fuelPricePerL: number
}

export interface AppSettings {
  googleMapsApiKey?: string
  anthropicApiKey?: string
  homeLocation?: { name: string; lat: number; lng: number }
  vehicleConfig?: VehicleConfig
  dietaryRestrictions?: string[]
}

export interface PackingTemplate {
  id: string
  name: string
  category: string
  quantity: number
}

export interface AppDatabase {
  trips: Trip[]
  itineraryDays: ItineraryDay[]
  packingItems: PackingItem[]
  meals: Meal[]
  budgetItems: BudgetItem[]
  reminders: Reminder[]
  waypoints: Waypoint[]
  shoppingItems: ShoppingItem[]
  mealTemplates: MealTemplate[]
  packingTemplates: PackingTemplate[]
}
