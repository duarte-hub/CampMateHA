import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '@/lib/db'
import { isDriveConnected } from '@/lib/drive'

export async function GET() {
  const s  = readSettings()
  const dc = s.driveConfig
  return NextResponse.json({
    googleMapsApiKey:    s.googleMapsApiKey    ?? null,
    anthropicApiKey:     s.anthropicApiKey     ?? null,
    homeLocation:        s.homeLocation        ?? null,
    vehicleConfig:       s.vehicleConfig       ?? null,
    dietaryRestrictions: s.dietaryRestrictions ?? [],
    drive: {
      connected:  isDriveConnected(dc),
      lastBackup: dc?.lastBackup ?? null,
      hasClientId: !!(process.env.GOOGLE_CLIENT_ID || dc?.clientId),
    },
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
  if ('driveCredentials' in body) {
    const { clientId, clientSecret } = body.driveCredentials
    s.driveConfig = { ...(s.driveConfig ?? {}), clientId: clientId?.trim(), clientSecret: clientSecret?.trim() }
  }
  if ('disconnectDrive' in body) {
    s.driveConfig = {}
  }
  writeSettings(s)
  return NextResponse.json({ ok: true })
}
