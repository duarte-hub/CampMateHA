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

export interface TripWithDetails extends Trip {
  itinerary: ItineraryDay[]
  packingItems: PackingItem[]
  meals: Meal[]
  budgetItems: BudgetItem[]
  reminders: Reminder[]
}

export interface AppDatabase {
  trips: Trip[]
  itineraryDays: ItineraryDay[]
  packingItems: PackingItem[]
  meals: Meal[]
  budgetItems: BudgetItem[]
  reminders: Reminder[]
}
