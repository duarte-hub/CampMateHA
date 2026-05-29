import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { PackingTemplate } from '@/lib/types'

export async function GET() {
  const db = readDb()
  return NextResponse.json(db.packingTemplates ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = readDb()
  const template: PackingTemplate = {
    id: randomUUID(),
    name: body.name,
    category: body.category ?? 'Misc',
    quantity: body.quantity ?? 1,
  }
  db.packingTemplates = [...(db.packingTemplates ?? []), template]
  writeDb(db)
  return NextResponse.json(template, { status: 201 })
}

export async function PUT(req: NextRequest) {
  // Bulk replace — used by "save trip list to library"
  const body = await req.json()
  const db = readDb()
  db.packingTemplates = (body as Omit<PackingTemplate, 'id'>[]).map(item => ({
    id: randomUUID(),
    name: item.name,
    category: item.category ?? 'Misc',
    quantity: item.quantity ?? 1,
  }))
  writeDb(db)
  return NextResponse.json(db.packingTemplates)
}
