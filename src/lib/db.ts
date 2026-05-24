import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { AppDatabase } from './types'

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data')
const DB_FILE = join(DATA_DIR, 'campmate.json')

const empty: AppDatabase = {
  trips: [],
  itineraryDays: [],
  packingItems: [],
  meals: [],
  budgetItems: [],
  reminders: [],
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
