import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

const allowed = new Set(['heldout_a', 'heldout_b', 'heldout_c', 'random_clean'])

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') ?? ''
  if (!allowed.has(name)) return NextResponse.json({ error: 'Unknown slice' }, { status: 400 })
  try {
    const file = path.join(process.cwd(), 'data', 'slices', name, 'bench_results.json')
    return NextResponse.json(JSON.parse(await readFile(file, 'utf8')))
  } catch {
    return NextResponse.json({ error: 'Slice not available' }, { status: 404 })
  }
}
