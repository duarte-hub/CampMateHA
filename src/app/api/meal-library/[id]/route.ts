import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  db.mealTemplates = (db.mealTemplates ?? []).filter(t => t.id !== id)
  writeDb(db)
  return NextResponse.json({ ok: true })
}
