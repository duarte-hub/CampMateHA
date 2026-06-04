import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb } from '@/lib/db'
import { randomUUID } from 'crypto'
import type { FuelEntry } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json((db.fuelLog ?? []).filter(e => e.tripId === id).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ))
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const body = await req.json()
  const db = readDb()

  const entry: FuelEntry = {
    id:        randomUUID(),
    tripId:    id,
    timestamp: body.timestamp ?? new Date().toISOString(),
    litres:    Number(body.litres),
    pricePerL: Number(body.pricePerL),
    totalCost: Number(body.totalCost ?? (body.litres * body.pricePerL)),
    location:  body.location ?? undefined,
    odometer:  body.odometer ? Number(body.odometer) : undefined,
    notes:     body.notes?.trim() || undefined,
  }

  db.fuelLog = [...(db.fuelLog ?? []), entry]
  writeDb(db)
  return NextResponse.json(entry, { status: 201 })
}
