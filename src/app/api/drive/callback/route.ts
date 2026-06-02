import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '@/lib/db'
import { driveCredentials } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?drive=error&msg=${encodeURIComponent(error ?? 'cancelled')}`)
  }

  const creds = driveCredentials()
  if (!creds) {
    return NextResponse.redirect(`${origin}/settings?drive=nocreds`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri:  `${origin}/api/drive/callback`,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/settings?drive=error&msg=token_exchange_failed`)
  }

  const s = readSettings()
  s.driveConfig = {
    ...(s.driveConfig ?? {}),
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token ?? s.driveConfig?.refreshToken,
    tokenExpiry:  Date.now() + tokens.expires_in * 1000,
  }
  writeSettings(s)

  return NextResponse.redirect(`${origin}/settings?drive=connected`)
}
