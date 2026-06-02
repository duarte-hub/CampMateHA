import { NextRequest, NextResponse } from 'next/server'
import { driveCredentials } from '@/lib/drive'

export async function GET(req: NextRequest) {
  const creds = driveCredentials()
  if (!creds) {
    return NextResponse.redirect(`${req.nextUrl.origin}/settings?drive=nocreds`)
  }

  const params = new URLSearchParams({
    client_id:     creds.clientId,
    redirect_uri:  `${req.nextUrl.origin}/api/drive/callback`,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/drive.file',
    access_type:   'offline',
    prompt:        'consent',
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
