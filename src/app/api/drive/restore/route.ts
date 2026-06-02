import { NextRequest, NextResponse } from 'next/server'
import { writeDb } from '@/lib/db'
import { getValidToken } from '@/lib/drive'
import type { AppDatabase } from '@/lib/types'

export async function GET() {
  const token = await getValidToken()
  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const q   = encodeURIComponent("name contains 'CampMate_Backup' and mimeType='application/json' and trashed=false")
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime+desc&pageSize=10&fields=files(id,name,createdTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  return NextResponse.json({ files: data.files ?? [] })
}

export async function POST(req: NextRequest) {
  const { fileId } = await req.json()
  if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 })

  const token = await getValidToken()
  if (!token) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return NextResponse.json({ error: 'Download failed' }, { status: 500 })

  const db = await res.json() as AppDatabase
  writeDb(db)

  return NextResponse.json({ ok: true })
}
