import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()
  const idx = (db.packingTemplates ?? []).findIndex(t => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  db.packingTemplates[idx] = { ...db.packingTemplates[idx], ...body }
  writeDb(db)
  return NextResponse.json(db.packingTemplates[idx])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  db.packingTemplates = (db.packingTemplates ?? []).filter(t => t.id !== id)
  writeDb(db)
  return NextResponse.json({ ok: true })
}
