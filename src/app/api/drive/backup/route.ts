import { NextResponse } from 'next/server'
import { readDb, readSettings, writeSettings } from '@/lib/db'
import { getValidToken, getOrCreateFolder } from '@/lib/drive'

export async function POST() {
  const token = await getValidToken()
  if (!token) return NextResponse.json({ error: 'Not connected to Google Drive' }, { status: 401 })

  const db       = readDb()
  const json     = JSON.stringify(db, null, 2)
  const fileName = `CampMate_Backup_${new Date().toISOString().slice(0, 10)}.json`

  const s        = readSettings()
  const folderId = await getOrCreateFolder(token, s.driveConfig?.folderId)

  const boundary = 'campmate_upload_boundary'
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] })
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${json}\r\n--${boundary}--`

  const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })

  const file = await uploadRes.json()
  if (!file.id) return NextResponse.json({ error: 'Upload failed', detail: file }, { status: 500 })

  s.driveConfig = { ...s.driveConfig!, folderId, lastBackup: new Date().toISOString() }
  writeSettings(s)

  return NextResponse.json({ ok: true, fileId: file.id, fileName, timestamp: s.driveConfig.lastBackup })
}
