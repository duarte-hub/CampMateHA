import { NextRequest, NextResponse } from 'next/server'
import { readDb } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = readDb()
  return NextResponse.json((db.shoppingItems ?? []).filter(s => s.tripId === id))
}
