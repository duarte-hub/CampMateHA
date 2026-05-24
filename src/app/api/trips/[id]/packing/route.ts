import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import type { PackingItem } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()

  const item: PackingItem = {
    id: crypto.randomUUID(),
    tripId: id,
    category: body.category || 'Custom',
    name: body.name,
    quantity: Number(body.quantity) || 1,
    assignedTo: body.assignedTo || '',
    checked: false,
    isCustom: true,
  }

  db.packingItems.push(item)
  writeDb(db)
  return NextResponse.json(item, { status: 201 })
}
