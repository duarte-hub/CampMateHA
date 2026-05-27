import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '@/lib/db'

export async function GET() {
  const s = readSettings()
  return NextResponse.json({
    googleMapsApiKey: s.googleMapsApiKey ?? null,
    anthropicApiKey:  s.anthropicApiKey  ?? null,
    homeLocation:     s.homeLocation     ?? null,
    vehicleConfig:    s.vehicleConfig    ?? null,
    dietaryRestrictions: s.dietaryRestrictions ?? [],
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const s = readSettings()
  if ('googleMapsApiKey'    in body) s.googleMapsApiKey    = body.googleMapsApiKey?.trim()    || undefined
  if ('anthropicApiKey'     in body) s.anthropicApiKey     = body.anthropicApiKey?.trim()     || undefined
  if ('homeLocation'        in body) s.homeLocation        = body.homeLocation        ?? undefined
  if ('vehicleConfig'       in body) s.vehicleConfig       = body.vehicleConfig       ?? undefined
  if ('dietaryRestrictions' in body) s.dietaryRestrictions = body.dietaryRestrictions ?? undefined
  writeSettings(s)
  return NextResponse.json({ ok: true })
}
