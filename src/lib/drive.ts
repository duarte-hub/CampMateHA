import { readSettings, writeSettings } from './db'
import type { DriveConfig } from './types'

export function driveCredentials() {
  const s = readSettings()
  // env vars take priority; fall back to credentials stored in settings.json
  const clientId     = process.env.GOOGLE_CLIENT_ID     || s.driveConfig?.clientId
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || s.driveConfig?.clientSecret
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export async function getValidToken(): Promise<string | null> {
  const s  = readSettings()
  const dc = s.driveConfig
  if (!dc?.accessToken) return null

  if (dc.tokenExpiry && Date.now() < dc.tokenExpiry - 60_000) {
    return dc.accessToken
  }

  if (!dc.refreshToken) return null
  const creds = driveCredentials()
  if (!creds) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: dc.refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  const data = await res.json()
  if (!data.access_token) return null

  s.driveConfig = { ...dc, accessToken: data.access_token, tokenExpiry: Date.now() + data.expires_in * 1000 }
  writeSettings(s)
  return data.access_token
}

export async function getOrCreateFolder(token: string, cachedId?: string): Promise<string> {
  if (cachedId) {
    const check = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedId}?fields=id`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (check.ok) return cachedId
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'CampMate Backups', mimeType: 'application/vnd.google-apps.folder' }),
  })
  const folder = await res.json()
  return folder.id as string
}

export function isDriveConnected(dc: DriveConfig | undefined): boolean {
  return !!(dc?.accessToken && dc?.refreshToken)
}
