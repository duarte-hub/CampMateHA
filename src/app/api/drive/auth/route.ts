import { NextRequest, NextResponse } from 'next/server'
import { readSettings } from '@/lib/db'

export async function GET(req: NextRequest) {
  const s = readSettings()
  if (!s.driveConfig?.clientId) {
    return NextResponse.redirect(`${req.nextUrl.origin}/settings?drive=nocreds`)
  }

  const params = new URLSearchParams({
    client_id:     s.driveConfig.clientId,
    redirect_uri:  `${req.nextUrl.origin}/api/drive/callback`,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/drive.file',
    access_type:   'offline',
    prompt:        'consent',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
