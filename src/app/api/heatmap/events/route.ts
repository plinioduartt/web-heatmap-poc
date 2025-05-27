

import { CompressedTraces } from '@/app/libs/HeatMap'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from "next/server"
import path from 'node:path'
import { Pool } from 'pg'
import protobuf from 'protobufjs'

const root = await protobuf.load(path.resolve(process.cwd(), 'public', 'trace.proto'))

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_API_KEY!
)

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
})

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const TraceBatch = root.lookupType('TraceBatch')

  const apiKey = request.headers.get('api-key')
  if (apiKey !== 'test') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const body: CompressedTraces[] = await request.json()

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await Promise.all(
      body.map(async (item) => {
        const payload = { events: item.originalEvents };

        const errMsg = TraceBatch.verify(payload);
        if (errMsg) throw new Error(`Protobuf validation failed: ${errMsg}`);

        const message = TraceBatch.create(payload)
        const buffer = TraceBatch.encode(message).finish()

        const recordsInJSON = body.flatMap(item => item.originalEvents)

        await Promise.all([
          client.query(
            `
              INSERT INTO events (site, path, is_mobile, compressed_data)
              VALUES ($1, $2, $3, $4)
            `,
            [item.site, item.page, item.isMobile, buffer]
          ),
          client.query(
            `
              INSERT INTO events_json (site, path, is_mobile, data)
              VALUES ($1, $2, $3, $4)
            `,
            [item.site, item.page, item.isMobile, JSON.stringify(recordsInJSON)]
          )
        ])
      })
    )

    await client.query('COMMIT')
    return NextResponse.json({ message: 'OK' }, { status: 201 })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[POST /heatmap/events]', err)
    return NextResponse.json({ message: 'Insert failed' }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function GET(request: NextRequest) {
  const site = request.nextUrl.searchParams.get("site")
  const page = request.nextUrl.searchParams.get("page")
  const isMobile = request.nextUrl.searchParams.get("isMobile")
  const from = request.nextUrl.searchParams.get("from")
  const to = request.nextUrl.searchParams.get("to")

  if (!site || !page || !isMobile || !from || !to) {
    return NextResponse.json({ status: 400, message: "Missing query parameters" })
  }

  const { data, error } = await supabase
    .from("events")
    .select("compressed_data")
    .eq("site", site)
    .eq("path", page)
    .eq("is_mobile", isMobile === "true")
    .gte("created_at", from)
    .lte("created_at", to)

  if (error) {
    console.error(error)
    return NextResponse.json({ status: 500, message: "Error while listing traces" })
  }

  const responseData = data!.map(item => {
    const TraceBatch = root.lookupType("TraceBatch");
    const message = TraceBatch.decode(Buffer.from(item.compressed_data.replace(/^\\x/, ''), 'hex'));
    const object = TraceBatch.toObject(message, {
      longs: String,
      enums: String,
      bytes: String,
      defaults: true,
    });

    return {
      compressed_data: object.events,
    }
  })

  return NextResponse.json({
    data: responseData,
  })
}