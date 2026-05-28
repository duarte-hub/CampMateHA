import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  db.mealTemplates = (db.mealTemplates ?? []).filter(t => t.id !== id)
  writeDb(db)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()
  const tmpl = (db.mealTemplates ?? []).find(t => t.id === id)
  if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  Object.assign(tmpl, body)
  writeDb(db)
  return NextResponse.json(tmpl)
}
