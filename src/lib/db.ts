import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { AppDatabase, AppSettings } from './types'

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')
const DB_FILE = join(DATA_DIR, 'campmate.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')

const empty: AppDatabase = {
  trips: [],
  itineraryDays: [],
  packingItems: [],
  meals: [],
  budgetItems: [],
  reminders: [],
  waypoints: [],
  shoppingItems: [],
  mealTemplates: [],
  packingTemplates: [],
  fuelLog: [],
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

export function readDb(): AppDatabase {
  ensureDir()
  if (!existsSync(DB_FILE)) return structuredClone(empty)
  try {
    return { ...structuredClone(empty), ...JSON.parse(readFileSync(DB_FILE, 'utf-8')) }
  } catch {
    return structuredClone(empty)
  }
}

export function writeDb(db: AppDatabase): void {
  ensureDir()
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
}

export function readSettings(): AppSettings {
  ensureDir()
  if (!existsSync(SETTINGS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeSettings(settings: AppSettings): void {
  ensureDir()
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}
