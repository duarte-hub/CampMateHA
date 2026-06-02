import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${origin}/settings?drive=error&msg=${encodeURIComponent(error ?? 'cancelled')}`)
  }

  const s  = readSettings()
  const dc = s.driveConfig
  if (!dc?.clientId || !dc?.clientSecret) {
    return NextResponse.redirect(`${origin}/settings?drive=nocreds`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     dc.clientId,
      client_secret: dc.clientSecret,
      redirect_uri:  `${origin}/api/drive/callback`,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.access_token) {
    return NextResponse.redirect(`${origin}/settings?drive=error&msg=token_exchange_failed`)
  }

  s.driveConfig = {
    ...dc,
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token ?? dc.refreshToken,
    tokenExpiry:  Date.now() + tokens.expires_in * 1000,
  }
  writeSettings(s)

  return NextResponse.redirect(`${origin}/settings?drive=connected`)
}
